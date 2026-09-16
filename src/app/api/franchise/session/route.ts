import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    return NextResponse.json({user:null,configured:false},{headers:{'Cache-Control':'private, no-store'}})
  const db=await createClient(),{data:{user}}=await db.auth.getUser()
  return NextResponse.json({user:user?{id:user.id,email:user.email}:null,configured:true},{headers:{'Cache-Control':'private, no-store'}})
}
