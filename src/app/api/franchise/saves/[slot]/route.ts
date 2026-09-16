import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
import {sameOrigin,validateSaveEnvelope} from '@/lib/franchise/validation'
import {decodeSaveRequest,MAX_TRANSPORT_BYTES} from '@/lib/franchise/transport'
export async function PUT(request:Request,{params}:{params:Promise<{slot:string}>}){
  if(!sameOrigin(request))return NextResponse.json({error:'Ongeldige herkomst'},{status:403})
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)return NextResponse.json({error:'Cloudopslag nog niet geconfigureerd'},{status:503})
  const db=await createClient(),{data:{user}}=await db.auth.getUser()
  if(!user)return NextResponse.json({error:'Log opnieuw in. Je lokale save blijft behouden.'},{status:401})
  if(request.headers.get('x-franchise-owner')!==user.id)return NextResponse.json({error:'Het ingelogde account is gewijzigd. Herlaad de game.'},{status:409})
  if(Number(request.headers.get('content-length'))>MAX_TRANSPORT_BYTES)return NextResponse.json({error:'Save te groot'},{status:413})
  const slot=Number((await params).slot)
  let body;try{const raw=await request.text();if(new TextEncoder().encode(raw).length>MAX_TRANSPORT_BYTES)return NextResponse.json({error:'Save te groot'},{status:413});body=decodeSaveRequest(raw)}catch{return NextResponse.json({error:'Ongeldige save'},{status:400})}
  if(!validateSaveEnvelope(body,slot))return NextResponse.json({error:'Ongeldig saveformaat of versie'},{status:400})
  const {data:revision,error}=await db.rpc('save_franchise_career',{p_slot:slot,p_payload:body.payload,p_expected_revision:body.revision,p_engine_version:body.engineVersion,p_format_version:body.formatVersion})
  if(error)return NextResponse.json({error:'Cloudopslag is tijdelijk niet beschikbaar. Lokale save behouden.'},{status:503})
  if(revision===null)return NextResponse.json({error:'Dit slot is op een ander apparaat gewijzigd'},{status:409})
  return NextResponse.json({revision},{headers:{'Cache-Control':'private, no-store'}})
}
