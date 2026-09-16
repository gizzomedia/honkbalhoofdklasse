import {gunzipSync} from 'node:zlib'
import {MAX_SAVE_BYTES} from './validation'
export const MAX_TRANSPORT_BYTES=3_900_000
export function decodeSaveRequest(raw:string){
  if(Buffer.byteLength(raw)>MAX_TRANSPORT_BYTES)throw Error('Save te groot')
  const body=JSON.parse(raw)
  if(body?.payloadEncoding==='gzip-base64'){
    if(typeof body.payload!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(body.payload))throw Error('Ongeldige compressie')
    body.payload=gunzipSync(Buffer.from(body.payload,'base64'),{maxOutputLength:MAX_SAVE_BYTES}).toString('utf8')
  }else if(body?.payloadEncoding!==undefined)throw Error('Onbekend opslagformaat')
  return body
}
