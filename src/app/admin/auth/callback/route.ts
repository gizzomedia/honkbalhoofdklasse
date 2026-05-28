import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  // Supabase sent back an error directly
  if (error) {
    return NextResponse.redirect(`${origin}/admin/login?error=auth`)
  }

  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (!exchangeError) {
      return NextResponse.redirect(`${origin}/admin`)
    }
  }

  return NextResponse.redirect(`${origin}/admin/login?error=auth`)
}
