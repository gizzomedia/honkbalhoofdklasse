import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const SCHEDULE_URL = 'https://boxscore.stenwessel.nl/api/fetchschedule.php?competition=hb2026'
const GAME_URL     = 'https://boxscore.stenwessel.nl/api/fetchgamedata.php?competition=hb2026&game='

function mapTeam(label: string): string | null {
  const l = (label ?? '').toLowerCase()
  if (l.includes('neptunus'))                              return 'neptunus'
  if (l.includes('pirate') || l.includes('amsterdam'))    return 'pirates'
  if (l.includes('kinheim'))                              return 'kinheim'
  if (l.includes('hcaw'))                                 return 'hcaw'
  if (l.includes('twin') || l.includes('oosterhout'))     return 'twins'
  if (l.includes('pionier'))                              return 'pioniers'
  if (l.includes('uvv'))                                  return 'uvv'
  return null
}
function mapTeamFromIoc(ioc: string): string | null {
  const map: Record<string, string> = {
    TWI: 'twins', NEP: 'neptunus', HCA: 'hcaw',
    KIN: 'kinheim', PIO: 'pioniers', PIR: 'pirates', UVV: 'uvv', AMS: 'pirates',
  }
  return map[ioc] ?? null
}
function getTeamId(game: Record<string, unknown>, side: 'home' | 'away'): string | null {
  const teamObj = game[`${side}_team`] as Record<string, string> | undefined
  const labelKey = side === 'home' ? 'homelabel' : 'awaylabel'
  const iocKey   = side === 'home' ? 'homeioc'   : 'awayioc'
  return (
    (teamObj ? mapTeam(teamObj.teamlabel ?? '') : null) ??
    mapTeamFromIoc((game[iocKey] as string) ?? '') ??
    mapTeam((game[labelKey] as string) ?? '')
  )
}
function calcScore(boxScore: Record<string, unknown>, teamId: string): number {
  const teamData = boxScore[teamId] as Record<string, unknown[]> | undefined
  if (!teamData) return 0
  const seen: Record<string, boolean> = {}
  let runs = 0
  for (const players of Object.values(teamData)) {
    if (!Array.isArray(players)) continue
    for (const p of players as Record<string, unknown>[]) {
      const key = `${p.firstname}_${p.lastname}`
      if (!seen[key]) { seen[key] = true; runs += (p.r as number) || 0 }
    }
  }
  return runs
}

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Fetch schedule for live game detection
    const schedRes  = await fetch(SCHEDULE_URL, { next: { revalidate: 0 } })
    const schedData = await schedRes.json()
    const allGames: Record<string, unknown>[] = schedData.games ?? []

    // Live games — real-time from boxscore API
    const liveGameIds = allGames
      .filter(g => String(g.gamestatus) === '1')
      .map(g => ({ id: String(g.id), game: g }))

    const liveBoxscores: Record<string, unknown> = {}
    await Promise.all(
      liveGameIds.map(async ({ id }) => {
        try {
          const r = await fetch(GAME_URL + id, { next: { revalidate: 0 } })
          liveBoxscores[id] = await r.json()
        } catch { /* skip */ }
      })
    )

    const live = liveGameIds.map(({ id, game: g }) => {
      const bs = liveBoxscores[id] as Record<string, unknown> | undefined
      let homeScore: number | null = null
      let awayScore: number | null = null
      if (bs?.boxScore && bs?.gameData) {
        const boxScore = bs.boxScore as Record<string, unknown>
        const gd       = bs.gameData as Record<string, unknown>
        homeScore = calcScore(boxScore, String(gd.homeid))
        awayScore = calcScore(boxScore, String(gd.awayid))
      }
      // Current game situation from schedule data
      const inning  = Number(g.innings ?? 0) + 1
      const outs    = Number(g.outs    ?? 0)
      const runner1 = Number(g.runner1 ?? 0) > 0
      const runner2 = Number(g.runner2 ?? 0) > 0
      const runner3 = Number(g.runner3 ?? 0) > 0
      return {
        id, gameDate: g.start ? String(g.start).split(' ')[0] : '',
        gameTime: g.start ? (String(g.start).split(' ')[1] ?? null) : null,
        homeId: getTeamId(g, 'home'), awayId: getTeamId(g, 'away'),
        status: 'live', homeScore, awayScore,
        inning, outs, runner1, runner2, runner3,
      }
    })

    // Finished games — from Supabase (scores already stored by n8n)
    const { data: finishedRows } = await supabase
      .from('games')
      .select('external_id, game_date, game_time, home_team_id, away_team_id, home_score, away_score')
      .eq('status', 'final')
      .order('game_date', { ascending: false })
      .order('game_time', { ascending: false })
      .limit(8)

    const finished = (finishedRows ?? []).map(g => ({
      id: g.external_id,
      gameDate: g.game_date,
      gameTime: g.game_time,
      homeId: g.home_team_id,
      awayId: g.away_team_id,
      status: 'final',
      homeScore: g.home_score,
      awayScore: g.away_score,
    }))

    // Upcoming games — from Supabase
    const { data: upcomingRows } = await supabase
      .from('games')
      .select('external_id, game_date, game_time, home_team_id, away_team_id')
      .eq('status', 'scheduled')
      .gte('game_date', today)
      .order('game_date', { ascending: true })
      .order('game_time', { ascending: true })
      .limit(10)

    const upcoming = (upcomingRows ?? []).map(g => ({
      id: g.external_id,
      gameDate: g.game_date,
      gameTime: g.game_time,
      homeId: g.home_team_id,
      awayId: g.away_team_id,
      status: 'scheduled',
      homeScore: null,
      awayScore: null,
    }))

    // Standings for record display
    const { data: standingsRows } = await supabase
      .from('standings')
      .select('team_id, wins, losses')
      .eq('season', new Date().getFullYear())

    const standings: Record<string, { wins: number; losses: number }> = {}
    for (const s of standingsRows ?? []) {
      standings[s.team_id] = { wins: s.wins, losses: s.losses }
    }

    return NextResponse.json({ live, finished, upcoming, standings, updatedAt: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
