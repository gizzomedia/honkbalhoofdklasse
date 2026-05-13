import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function checkAuth(req: NextRequest) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('player_photos')
    .select('player_name, banner_url, headshot_url')

  return NextResponse.json(data ?? [])
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { playerName, photoType } = await req.json()
  if (!playerName || !photoType) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const col = photoType === 'banner' ? 'banner_url' : 'headshot_url'
  await supabaseAdmin.from('player_photos').update({ [col]: null }).ilike('player_name', playerName)

  return NextResponse.json({ ok: true })
}
