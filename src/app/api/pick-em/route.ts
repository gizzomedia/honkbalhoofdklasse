import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 0

type GameRow = {
  id: number
  game_date: string
  game_time: string | null
  home_team_id: string
  away_team_id: string
  status: string
  home_score: number | null
  away_score: number | null
}

export async function GET(req: NextRequest) {
  const userToken = req.nextUrl.searchParams.get('token')

  // Fetch all games this season sorted by date
  const { data: games, error } = await supabaseAdmin
    .from('games')
    .select('id, game_date, game_time, home_team_id, away_team_id, status, home_score, away_score')
    .eq('season', 2026)
    .order('game_date', { ascending: true })
    .order('game_time', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let picks: { game_id: number; picked_team_id: string }[] = []
  if (userToken) {
    const { data } = await supabaseAdmin
      .from('pickem_picks')
      .select('game_id, picked_team_id')
      .eq('user_token', userToken)
    picks = data ?? []
  }

  return NextResponse.json({ games: games ?? [], picks })
}

export async function POST(req: NextRequest) {
  const { userToken, nickname, gameId, pickedTeamId } = await req.json()

  if (!userToken || !nickname || !gameId || !pickedTeamId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Check game hasn't started yet
  const { data: game } = await supabaseAdmin
    .from('games')
    .select('game_date, game_time, status')
    .eq('id', gameId)
    .single()

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

  if (game.status !== 'scheduled') {
    return NextResponse.json({ error: 'Game already started' }, { status: 400 })
  }

  const lockTime = new Date(`${game.game_date}T${game.game_time ?? '23:59:00'}`)
  if (new Date() >= lockTime) {
    return NextResponse.json({ error: 'Picks are locked' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('pickem_picks')
    .upsert(
      { user_token: userToken, nickname, game_id: gameId, picked_team_id: pickedTeamId },
      { onConflict: 'user_token,game_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
