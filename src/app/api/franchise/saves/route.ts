import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {gzipSync} from 'node:zlib'
export const dynamic = 'force-dynamic'
export async function GET(){
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)return NextResponse.json({error:'Cloudopslag nog niet geconfigureerd'},{status:503})
  const db=await createClient(),{data:{user}}=await db.auth.getUser()
  if(!user)return NextResponse.json({error:'Log in om je carrières op te halen'},{status:401})
  const {data,error}=await db.from('franchise_saves').select('slot,payload,revision,engine_version,format_version,updated_at').eq('user_id',user.id).order('slot')
  if(error)return NextResponse.json({error:'Cloudopslag is tijdelijk niet beschikbaar'},{status:503})
  const compressed=gzipSync(JSON.stringify({saves:data,userId:user.id}))
  return new Response(new Uint8Array(compressed),{headers:{'Content-Type':'application/json','Content-Encoding':'gzip','Cache-Control':'private, no-store'}})
}
