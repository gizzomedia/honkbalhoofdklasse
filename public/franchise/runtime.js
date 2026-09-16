import {Renderer} from './renderer.js';
import {openStorage} from './storage.js';
import {saveRequestBody} from './transport.js';
const $=id=>document.getElementById(id),worker=new Worker('/franchise/engine-worker.js',{type:'module'});
let sequence=0,busy=false,frame,storage,user=null,cloudAvailable=false,blocked=false,conflictSlot=null,disposed=false;
const waiting=new Map(),dirty=new Set(),inputQueue=[];let syncInFlight=false;
function call(request){return new Promise((resolve,reject)=>{const id=++sequence;waiting.set(id,{resolve,reject});worker.postMessage({id,request});});}
worker.onmessage=({data:{id,result}})=>{const p=waiting.get(id);if(!p)return;waiting.delete(id);result.error?p.reject(Error(result.error)):p.resolve(result);};
worker.onerror=e=>{for(const p of waiting.values())p.reject(Error(e.message));waiting.clear();fail('Game-engine gestopt. Je laatste opgeslagen carrière blijft behouden.');};
function status(s){$('sync').textContent=s;$('save-detail').textContent=s;}
function fail(s){blocked=true;status(s);call({op:'pause'}).catch(()=>{});}
const renderer=new Renderer($('game'),$('controls'),send);
async function persist(files){
  for(const [name,payload]of Object.entries(files||{})){
    if(name==='interface-preferences.json'){await storage.put('preferences',payload);continue;}
    const m=/^franchise-([123])\.json$/.exec(name);if(!m)continue;const slot=Number(m[1]);
    await storage.update('slot:'+slot,old=>({payload,backup:files[name+'.bak']||old?.payload||old?.backup,revision:old?.revision||0,dirty:!!user,updatedAt:Date.now()}));
    if(user)dirty.add(slot);
  }
}
async function send(req){if(disposed||blocked&&!['pause','draw','export','validate'].includes(req.op))return;if(busy){if(req.op!=='tick'&&!(req.op==='pointer'&&!req.click))inputQueue.push(req);return;}
  busy=true;try{const result=await call(req);await persist(result.files);if(result.commands){frame=result;renderer.paint(result);}if(Object.keys(result.files||{}).length)status(user?'Lokaal opgeslagen · cloud wordt bijgewerkt':'Lokaal opgeslagen · log in voor cloudopslag');}
  catch(e){fail('Opslaan of laden mislukt: '+e.message);}finally{busy=false;const next=inputQueue.shift();if(next)queueMicrotask(()=>send(next));}
}
async function session(){const r=await fetch('/api/franchise/session',{cache:'no-store'});if(!r.ok)throw Error('Accountstatus niet beschikbaar');return r.json();}
async function loadCloud(){
  if(!user)return;
  const r=await fetch('/api/franchise/saves',{cache:'no-store'});if(!r.ok){cloudAvailable=false;status('Cloud niet beschikbaar · lokale herstelopslag actief');return;}
  cloudAvailable=true;const {saves,userId}=await r.json();if(userId!==user.id)throw Error('Het ingelogde account is gewijzigd. Herlaad de game.');
  for(let slot=1;slot<=3;slot++){
    const remote=saves.find(x=>x.slot===slot),local=await storage.get('slot:'+slot);
    if(local?.dirty){dirty.add(slot);if((remote?.revision||0)!==(local.revision||0)){conflictSlot=slot;blocked=true;status('Opslagconflict · open Account & saves');}}
    else if(remote){await storage.put('slot:'+slot,{payload:remote.payload,revision:remote.revision,dirty:false,backup:local?.payload,updatedAt:Date.now()});}
  }
}
async function sync(){
  if(!user||!dirty.size||syncInFlight||blocked)return;
  syncInFlight=true;
  try{for(const slot of [...dirty]){const local=await storage.get('slot:'+slot);if(!local?.dirty){dirty.delete(slot);continue;}
    const r=await fetch('/api/franchise/saves/'+slot,{method:'PUT',headers:{'Content-Type':'application/json','X-Franchise-Owner':user.id},body:await saveRequestBody({payload:local.payload,revision:local.revision,engineVersion:'0.6.1',formatVersion:1})});
    if(r.status===409){await storage.put('conflict:'+slot+':'+Date.now(),local);conflictSlot=slot;fail('Andere versie gevonden · je lokale carrière is bewaard. Open Account & saves.');return;}
    if(!r.ok)throw Error((await r.json()).error||'Cloud niet bereikbaar');
    const {revision}=await r.json();
    // A new simulation day may have saved while this request was in flight.
    const latest=await storage.update('slot:'+slot,current=>({...current,revision,dirty:current.payload!==local.payload}));if(!latest.dirty)dirty.delete(slot);
  }cloudAvailable=true;status(dirty.size?'Lokaal opgeslagen · synchroniseren…':'Opgeslagen in je account');}
  catch(e){cloudAvailable=false;status('Lokaal opgeslagen · cloud niet bijgewerkt: '+e.message);}
  finally{syncInFlight=false;}
}
let releaseLock;
async function exclusiveSession(namespace){if(!navigator.locks)return;await new Promise((resolve,reject)=>{navigator.locks.request('hk-franchise:'+namespace,{ifAvailable:true},async lock=>{if(!lock){reject(Error('Deze carrière is al geopend in een ander tabblad. Sluit dat tabblad eerst.'));return;}resolve();await new Promise(r=>releaseLock=r);});});}
async function boot(){
  const account=await session();user=account.user;
  const namespace=user?.id||'guest';await exclusiveSession(namespace);storage=await openStorage(namespace);
  await loadCloud();const data={};await Promise.all(['teams','players','staff'].map(async n=>{const r=await fetch('/franchise/Data/'+n+'.json');if(!r.ok)throw Error('Speldata ontbreekt');data['Data/'+n+'.json']=await r.text();}));
  await renderer.fonts();frame=await call({op:'init',data,files:await storage.files()});renderer.resize();renderer.paint(frame);
  $('identity').textContent=user?'Ingelogd als '+user.email:'Gast · saves staan alleen in deze browser. Exporteer ze voordat je browsergegevens wist.';
  if(!blocked)status(user?(cloudAvailable?'Account gekoppeld · cloudopslag actief':'Cloud niet beschikbaar · lokaal spelen mogelijk'):'Gast · lokale opslag');
  setInterval(()=>{if(!document.hidden&&!$('account-dialog').open&&!blocked)send({op:'tick'});},100);
  setInterval(sync,1500);
}
$('controls').addEventListener('pointermove',e=>{if(busy)return;const r=$('stage').getBoundingClientRect();send({op:'pointer',x:(e.clientX-r.left)*1600/r.width,y:(e.clientY-r.top)*900/r.height});});
$('controls').addEventListener('pointerdown',e=>{if(e.target===$('controls')){const r=$('stage').getBoundingClientRect();send({op:'pointer',x:(e.clientX-r.left)*1600/r.width,y:(e.clientY-r.top)*900/r.height,click:true});}});
$('controls').addEventListener('pointerleave',()=>send({op:'pointer',x:-1,y:-1}));
document.addEventListener('keydown',e=>{if($('account-dialog').open)return;const codes={Escape:53,Enter:36,' ':49,ArrowLeft:123,ArrowRight:124,ArrowDown:125,ArrowUp:126};if(e.key==='Tab')return;if(e.key==='F11'){e.preventDefault();$('fullscreen').click();return;}if(codes[e.key]){e.preventDefault();send({op:'key',code:codes[e.key],characters:e.key,shift:e.shiftKey});}});
window.addEventListener('resize',()=>renderer.resize());
document.addEventListener('visibilitychange',()=>{if(document.hidden)call({op:'pause'}).catch(()=>{});});
window.addEventListener('online',sync);
window.addEventListener('beforeunload',e=>{if(busy||dirty.size){e.preventDefault();e.returnValue='';}});
window.addEventListener('pagehide',()=>{disposed=true;releaseLock?.();});
document.addEventListener('asseterror',e=>status('Afbeelding kon niet laden: '+e.detail));
$('fullscreen').onclick=async()=>{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();};
$('account').onclick=async()=>{await send({op:'pause'});$('resolve').hidden=!conflictSlot;$('account-dialog').showModal();};
$('close-account').onclick=()=>$('account-dialog').close();
$('retry').onclick=async()=>{await sync();$('account-message').textContent=$('sync').textContent;};
function download(raw,name){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export').onclick=async()=>{try{const slot=Number($('save-slot').value),local=await call({op:'export',slot});if(!local?.payload)throw Error('Dit slot is leeg');download(local.payload,`hoofdklasse-franchise-${slot}.json`);}catch(e){$('account-message').textContent=e.message;}};
$('import').onclick=()=>$('save-file').click();
$('save-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{
  if(file.size>16_000_000)throw Error('Deze save is te groot voor cloudopslag (max. 16 MB).');
  const raw=await file.text(),slot=Number($('save-slot').value);await call({op:'validate',payload:raw});
  const existing=await storage.get('slot:'+slot);if(existing?.payload&&!confirm('Slot '+slot+' vervangen? De huidige save wordt als herstelkopie bewaard.'))return;
  if(conflictSlot)throw Error('Los eerst het opslagconflict op voordat je importeert.');blocked=false;await send({op:'import',slot,payload:raw});$('account-message').textContent='Save geïmporteerd. Dezelfde carrière kan worden voortgezet.';
}catch(err){$('account-message').textContent=err.message;}finally{e.target.value='';}};
$('resolve').onclick=async()=>{try{const slot=conflictSlot;if(!slot)return;const local=await storage.get('slot:'+slot);if(local?.payload)download(local.payload,`hoofdklasse-conflict-${slot}.json`);const r=await fetch('/api/franchise/saves',{cache:'no-store'});if(!r.ok)throw Error('Cloud niet bereikbaar');const response=await r.json();if(response.userId!==user.id)throw Error('Het account is gewijzigd. Herlaad de game om dat account te openen.');const remote=response.saves.find(x=>x.slot===slot);if(!remote)throw Error('Geen cloudversie gevonden. Je lokale kopie is behouden.');await storage.put('slot:'+slot,{payload:remote.payload,revision:remote.revision,dirty:false,backup:local?.payload});location.reload();}catch(e){$('account-message').textContent=e.message;}};
boot().catch(e=>fail(e.message));
