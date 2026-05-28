import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'

async function getStreamUser(req: NextRequest) {
  // Legacy password auth (keep for backwards compat)
  const pw = process.env.ADMIN_PASSWORD
  if (pw && req.headers.get('x-admin-password') === pw) {
    return { can_livestream: true, is_super_admin: true, stream_team: null }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  const { data } = await supabaseAdmin
    .from('admin_users')
    .select('can_livestream, is_super_admin, stream_team')
    .eq('email', user.email)
    .single()

  if (!data || (!data.can_livestream && !data.is_super_admin)) return null
  return data as { can_livestream: boolean; is_super_admin: boolean; stream_team: string | null }
}

export async function GET(req: NextRequest) {
  const streamUser = await getStreamUser(req)
  if (!streamUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  let gamesQuery = supabaseAdmin
    .from('games')
    .select('id, game_date, game_time, home_team_id, away_team_id, status')
    .gte('game_date', today)
    .in('status', ['scheduled', 'live'])
    .order('game_date', { ascending: true })
    .order('game_time', { ascending: true })
    .limit(30)

  if (streamUser.stream_team) {
    gamesQuery = gamesQuery.eq('home_team_id', streamUser.stream_team)
  }

  const [streamsRes, gamesRes] = await Promise.all([
    supabaseAdmin.from('streams').select('*').order('scheduled_at', { ascending: true }),
    gamesQuery,
  ])

  return NextResponse.json({
    streams: streamsRes.data ?? [],
    games:   gamesRes.data  ?? [],
  })
}

export async function POST(req: NextRequest) {
  const streamUser = await getStreamUser(req)
  if (!streamUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
  const streamUser = await getStreamUser(req)
  if (!streamUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...patch } = body
  const { error } = await supabaseAdmin.from('streams').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const streamUser = await getStreamUser(req)
  if (!streamUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('streams').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
