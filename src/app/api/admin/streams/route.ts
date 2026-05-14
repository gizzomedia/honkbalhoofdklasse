import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'hoofdklasse2026'

function auth(req: NextRequest) {
  return req.headers.get('x-admin-password') === ADMIN_PASSWORD
}

// Returns { streams, games } — games = upcoming + today so admin can link streams
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  const [streamsRes, gamesRes] = await Promise.all([
    supabaseAdmin.from('streams').select('*').order('scheduled_at', { ascending: true }),
    supabaseAdmin
      .from('games')
      .select('id, game_date, game_time, home_team_id, away_team_id, status')
      .gte('game_date', today)
      .in('status', ['scheduled', 'live'])
      .order('game_date', { ascending: true })
      .order('game_time', { ascending: true })
      .limit(30),
  ])

  return NextResponse.json({
    streams: streamsRes.data ?? [],
    games:   gamesRes.data  ?? [],
  })
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { data, error } = await supabaseAdmin
    .from('streams')
    .insert({
      title:        body.title,
      stream_url:   body.stream_url,
      platform:     body.platform ?? 'youtube',
      is_live:      false,
      scheduled_at: body.scheduled_at ?? null,
      game_id:      body.game_id ?? null,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { id, ...patch } = body
  const { error } = await supabaseAdmin.from('streams').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('streams').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
