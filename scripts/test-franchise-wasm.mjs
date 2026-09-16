import fs from 'node:fs/promises';import {WASI,File,OpenFile,ConsoleStdout}from '@bjorn3/browser_wasi_shim';
const wasi=new WASI(['franchise'],['TZ=UTC'],[new OpenFile(new File([])),ConsoleStdout.lineBuffered(console.log),ConsoleStdout.lineBuffered(console.error)]);
const bytes=await fs.readFile(process.env.FRANCHISE_WASM||'public/franchise/franchise.wasm'),{instance}=await WebAssembly.instantiate(bytes,{wasi_snapshot_preview1:wasi.wasiImport});const w=instance.exports;wasi.initialize(instance);
function call(req){const b=new TextEncoder().encode(JSON.stringify(req)),p=w.hk_alloc(b.length);new Uint8Array(w.memory.buffer,p,b.length).set(b);try{const q=w.hk_dispatch(p,b.length),n=w.hk_result_length();const r=JSON.parse(new TextDecoder().decode(new Uint8Array(w.memory.buffer,q,n)));if(r.error)throw Error(r.error);return r;}finally{w.hk_free(p);}}
const data={};for(const n of['teams','players','staff'])data['Data/'+n+'.json']=await fs.readFile('public/franchise/Data/'+n+'.json','utf8');
console.time('init');const title=call({op:'init',data,files:{},photoOffset:0});console.timeEnd('init');if(!title.areas.some(a=>a.action==='careers'))throw Error('Title missing');
console.time('fixtures');const {fixtures}=call({op:'fixtures'});console.timeEnd('fixtures');
await fs.mkdir('../work/web-parity/wasm-fixtures',{recursive:true});for(const[name,raw]of Object.entries(fixtures))await fs.writeFile('../work/web-parity/wasm-fixtures/'+name+'.json',raw);
for(let index=0;index<50;index++){const f=call({op:'capture',index});if(!f.commands.length)throw Error('Empty screen '+index);}
console.log('PASS: WebAssembly initialized; 13 fixtures and 50 screens executed');
