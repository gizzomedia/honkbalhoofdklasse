import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 60

export async function GET() {
  // Get all final games
  const { data: games } = await supabaseAdmin
    .from('games')
    .select('id, home_team_id, away_team_id, home_score, away_score, status')
    .eq('season', 2026)
    .eq('status', 'final')

  const finalGames = games ?? []

  // Build winner map
  const winners = new Map<number, string>()
  for (const g of finalGames) {
    if (g.home_score == null || g.away_score == null) continue
    if (g.home_score > g.away_score) winners.set(g.id, g.home_team_id)
    else if (g.away_score > g.home_score) winners.set(g.id, g.away_team_id)
  }

  // Get all picks for final games
  const finalIds = finalGames.map(g => g.id)
  if (!finalIds.length) return NextResponse.json([])

  const { data: picks } = await supabaseAdmin
    .from('pickem_picks')
    .select('user_token, nickname, game_id, picked_team_id')
    .in('game_id', finalIds)

  if (!picks?.length) return NextResponse.json([])

  // Group by user
  const userMap = new Map<string, { nickname: string; correct: number; total: number }>()
  for (const pick of picks) {
    if (!userMap.has(pick.user_token)) {
      userMap.set(pick.user_token, { nickname: pick.nickname, correct: 0, total: 0 })
    }
    const entry = userMap.get(pick.user_token)!
    entry.total++
    const winner = winners.get(pick.game_id)
    if (winner && winner === pick.picked_team_id) entry.correct++
  }

  const leaderboard = Array.from(userMap.entries())
    .map(([token, u]) => ({
      token,
      nickname: u.nickname,
      correct: u.correct,
      total: u.total,
      pct: u.total > 0 ? Math.round((u.correct / u.total) * 100) : 0,
    }))
    .sort((a, b) => b.correct - a.correct || b.pct - a.pct)

  return NextResponse.json(leaderboard)
}
