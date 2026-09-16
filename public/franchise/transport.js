// Compress only the transport. Preserve the exact Swift JSON, including UInt64.
export async function saveRequestBody(envelope){
  let body=envelope;
  if(typeof CompressionStream!=='undefined'){
    const stream=new Blob([envelope.payload]).stream().pipeThrough(new CompressionStream('gzip'));
    const bytes=new Uint8Array(await new Response(stream).arrayBuffer());
    let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    body={...envelope,payload:btoa(binary),payloadEncoding:'gzip-base64'};
  }
  const raw=JSON.stringify(body);
  if(new TextEncoder().encode(raw).length>3_900_000)throw Error('Cloudbestand te groot. Je lokale carrière blijft behouden en kan worden geëxporteerd.');
  return raw;
}
