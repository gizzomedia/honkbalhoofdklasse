import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

function ipToOuts(v: unknown): number {
  const s = String(v ?? '0').trim()
  if (!s || s === '0') return 0
  if (s.includes('.')) {
    const [full, frac] = s.split('.').map(n => parseInt(n, 10) || 0)
    return full * 3 + Math.min(frac, 2)
  }
  return parseInt(s, 10) || 0
}

function outsToIp(outs: number): string {
  return `${Math.floor(outs / 3)}.${outs % 3}`
}

async function getGamesInMonth(prefix: string): Promise<number> {
  try {
    const res = await fetch('https://boxscore.stenwessel.nl/api/fetchschedule.php?competition=hb2026', { cache: 'no-store' })
    const json = await res.json()
    const games: Array<{ start?: string; gamestatus?: number }> = json?.games ?? []
    const finished = games.filter(g => g.start?.startsWith(prefix) && (g.gamestatus === 2 || g.gamestatus === 3))
    return Math.round(finished.length * 2 / 7)
  } catch {
    return 6
  }
}

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month') // "YYYY-MM"
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Invalid month' }, { status: 400 })
  }

  const [prefixYear, prefixMonth] = month.split('-').map(Number)
  const nextMonth = prefixMonth === 12 ? 1 : prefixMonth + 1
  const nextYear = prefixMonth === 12 ? prefixYear + 1 : prefixYear
  const nextPrefix = `${nextYear}-${String(nextMonth).padStart(2, '0')}`
  const gamesInMonth = await getGamesInMonth(month)
  const minAb = Math.max(5, Math.ceil(2.7 * gamesInMonth))
  const minOuts = Math.max(3, gamesInMonth * 3)

  try {
    const [{ data: batRows }, { data: pitRows }] = await Promise.all([
      supabaseAdmin
        .from('batting_stats')
        .select('full_name, team_id, at_bats, hits, home_runs, rbi, stolen_bases')
        .eq('season', prefixYear)
        .neq('series_week', 'season')
        .gte('series_week', `${month}-01`)
        .lt('series_week', `${nextPrefix}-01`),
      supabaseAdmin
        .from('pitching_stats')
        .select('full_name, team_id, innings_pitched, strikeouts, wins, saves, hits_allowed, walks, earned_runs')
        .eq('season', prefixYear)
        .neq('series_week', 'season')
        .gte('series_week', `${month}-01`)
        .lt('series_week', `${nextPrefix}-01`),
    ])

    const batMap = new Map<string, { full_name: string; team_id: string; at_bats: number; hits: number; home_runs: number; rbi: number; stolen_bases: number }>()
    for (const r of (batRows ?? [])) {
      const key = `${r.full_name}|${r.team_id}`
      const e = batMap.get(key) ?? { full_name: r.full_name, team_id: r.team_id, at_bats: 0, hits: 0, home_runs: 0, rbi: 0, stolen_bases: 0 }
      e.at_bats += r.at_bats ?? 0
      e.hits += r.hits ?? 0
      e.home_runs += r.home_runs ?? 0
      e.rbi += r.rbi ?? 0
      e.stolen_bases += r.stolen_bases ?? 0
      batMap.set(key, e)
    }
    const batters = [...batMap.values()]
      .filter(p => p.at_bats >= minAb)
      .map(p => ({ ...p, avg: p.at_bats > 0 ? p.hits / p.at_bats : null, obp: null, slg: null, ops: null }))
      .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))

    const pitMap = new Map<string, { full_name: string; team_id: string; outs: number; strikeouts: number; wins: number; saves: number; hits_allowed: number; walks: number; earned_runs: number }>()
    for (const r of (pitRows ?? [])) {
      const key = `${r.full_name}|${r.team_id}`
      const e = pitMap.get(key) ?? { full_name: r.full_name, team_id: r.team_id, outs: 0, strikeouts: 0, wins: 0, saves: 0, hits_allowed: 0, walks: 0, earned_runs: 0 }
      e.outs += ipToOuts(r.innings_pitched)
      e.strikeouts += r.strikeouts ?? 0
      e.wins += r.wins ?? 0
      e.saves += r.saves ?? 0
      e.hits_allowed += r.hits_allowed ?? 0
      e.walks += r.walks ?? 0
      e.earned_runs += r.earned_runs ?? 0
      pitMap.set(key, e)
    }
    const pitchers = [...pitMap.values()]
      .filter(p => p.outs >= minOuts)
      .map(({ outs, ...rest }) => ({ ...rest, innings_pitched: outsToIp(outs) }))
      .sort((a, b) => b.strikeouts - a.strikeouts)

    return NextResponse.json({ batters, pitchers }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch {
    return NextResponse.json({ batters: [], pitchers: [] })
  }
}
