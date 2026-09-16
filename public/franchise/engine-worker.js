import { WASI, File, OpenFile, ConsoleStdout } from './vendor/wasi/index.js';
let wasm;
function call(request){const bytes=new TextEncoder().encode(JSON.stringify(request)),p=wasm.hk_alloc(bytes.length);new Uint8Array(wasm.memory.buffer,p,bytes.length).set(bytes);try {const out=wasm.hk_dispatch(p,bytes.length),length=wasm.hk_result_length();return JSON.parse(new TextDecoder().decode(new Uint8Array(wasm.memory.buffer,out,length)));}finally{wasm.hk_free(p);}}
let queue=Promise.resolve();
self.onmessage=({data})=>{queue=queue.then(()=>handle(data));};
async function handle({id,request}){
  try {
    if(!wasm){const wasi=new WASI(['franchise'],['TZ=UTC'],[new OpenFile(new File([])),ConsoleStdout.lineBuffered(console.log),ConsoleStdout.lineBuffered(console.error)]);
      const compressed=typeof DecompressionStream!=='undefined';
      const response=await fetch(compressed?'./franchise.wasm.gz':'./franchise.wasm');if(!response.ok)throw Error('Game-engine kon niet geladen worden.');
      const buffer=compressed?await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():await response.arrayBuffer();
      const {instance}=await WebAssembly.instantiate(buffer,{wasi_snapshot_preview1:wasi.wasiImport});wasm=instance.exports;wasi.initialize(instance);
    }
    self.postMessage({id,result:call(request)});
  }catch(error){self.postMessage({id,result:{error:String(error)}});}
};
