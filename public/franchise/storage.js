// IndexedDB keeps full raw Swift JSON, including integers beyond 2^53.
export async function openStorage(namespace) {
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('hoofdklasse-franchise-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const key=(k)=>namespace+':'+k;
  function transact(mode,run){return new Promise((resolve,reject)=>{const tx=db.transaction('records',mode),s=tx.objectStore('records');let value;run(s,v=>value=v);tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Local save aborted'));});}
  return {
    get:k=>transact('readonly',(s,set)=>{const r=s.get(key(k));r.onsuccess=()=>set(r.result);}),
    update:(k,fn)=>transact('readwrite',(s,set)=>{const r=s.get(key(k));r.onsuccess=()=>{const next=fn(r.result);s.put(next,key(k));set(next);};}),
    put:(k,v)=>transact('readwrite',s=>s.put(v,key(k))),
    async files(){const files={};for(let slot=1;slot<=3;slot++){const r=await this.get('slot:'+slot);if(r?.payload)files[`franchise-${slot}.json`]=r.payload;if(r?.backup)files[`franchise-${slot}.json.bak`]=r.backup;}const prefs=await this.get('preferences');if(prefs)files['interface-preferences.json']=prefs;return files;},
  };
}
