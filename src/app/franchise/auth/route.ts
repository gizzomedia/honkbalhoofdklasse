import {NextResponse} from 'next/server'
import {createClient} from '@/lib/supabase/server'
export async function GET(request:Request){
 const url=new URL(request.url),code=url.searchParams.get('code')
 if(code){const db=await createClient();const {error}=await db.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL('/franchise/game.html',url.origin))}
 return NextResponse.redirect(new URL('/franchise?login=failed',url.origin))
}
