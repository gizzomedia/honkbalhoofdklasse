import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/subscribe  { email }
export async function POST(req: NextRequest) {
  const { email } = await req.json()
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  if (!email || !EMAIL_RE.test(String(email).trim())) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('subscribers')
    .insert({ email: email.toLowerCase().trim() })

  if (error) {
    // Duplicate = already subscribed
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, already: true })
    }
    return NextResponse.json({ error: 'Aanmelden mislukt' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// GET /api/subscribe?email=xxx&token=xxx  → unsubscribe page
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  const token = req.nextUrl.searchParams.get('token')

  if (!email || !token) {
    return new Response('<p>Ongeldige link.</p>', { headers: { 'content-type': 'text/html' } })
  }

  const { data } = await supabaseAdmin
    .from('subscribers')
    .select('id')
    .eq('email', email.toLowerCase())
    .eq('token', token)
    .maybeSingle()

  if (!data) {
    return new Response('<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>Already unsubscribed or invalid link.</h2></body></html>',
      { headers: { 'content-type': 'text/html' } })
  }

  await supabaseAdmin.from('subscribers').delete().eq('id', data.id)

  return new Response(
    `<html><body style="font-family:sans-serif;text-align:center;padding:60px;background:#060e1b;color:#fff">
      <h2 style="color:#fe3d00">Unsubscribed</h2>
      <p>You will no longer receive notifications.</p>
      <a href="https://honkbalhoofdklasse.com" style="color:#fe3d00">Back to the website</a>
    </body></html>`,
    { headers: { 'content-type': 'text/html' } }
  )
}
