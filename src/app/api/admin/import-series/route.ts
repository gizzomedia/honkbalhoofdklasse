import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// GET: return list of completed series + which are already imported
export async function GET() {
  const [schedRes, { data: existing }] = await Promise.all([
    fetch('https://boxscore.stenwessel.nl/api/fetchschedule.php?competition=hb2026', { cache: 'no-store' }),
    supabaseAdmin.from('batting_stats').select('series_week').eq('season', 2026).neq('series_week', 'season'),
  ])
  const allGames: Array<{ id: number; start: string; gamestatus: number }> = (await schedRes.json()).games ?? []
  const importedWeeks = new Set((existing ?? []).map(r => r.series_week))

  const finished = allGames
    .filter(g => g.gamestatus === 2 || g.gamestatus === 3)
    .map(g => ({ id: g.id, date: g.start.slice(0, 10) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const seriesMap = new Map<string, string[]>()
  let curKey = '', prevMs = 0
  for (const g of finished) {
    const ms = new Date(g.date).getTime()
    if (!curKey || ms - prevMs > 3 * 86400000) curKey = g.date
    if (!seriesMap.has(curKey)) seriesMap.set(curKey, [])
    if (!seriesMap.get(curKey)!.includes(g.date)) seriesMap.get(curKey)!.push(g.date)
    prevMs = ms
  }

  const series = [...seriesMap.entries()].map(([seriesDate, gameDates]) => ({
    seriesDate,
    gameDates,
    gameCount: finished.filter(g => {
      const ms = new Date(g.date).getTime()
      const t0 = new Date(seriesDate).getTime()
      return ms >= t0 && ms <= t0 + 3 * 86400000
    }).length,
    imported: importedWeeks.has(seriesDate),
    importing: false,
    result: null,
  }))

  return NextResponse.json({ series })
}

const KNBSB_ID_TO_TEAM: Record<number, string> = {
  39583: 'pirates', 39587: 'neptunus', 39584: 'hcaw',
  39586: 'kinheim', 39588: 'twins', 39589: 'uvv', 39585: 'pioniers',
}

const TUSSENVOEGSELS = new Set(['van', 'de', 'den', 'der', 'het', 'op', 'ten', 'ter', 't', 'vd', 'la', 'le'])

function formatName(first: string, last: string): string {
  const firstName = first.trim().split(' ')[0]
  const lastName = last.trim().split(' ').map((w, i, arr) => {
    const lower = w.toLowerCase()
    if (i < arr.length - 1 && TUSSENVOEGSELS.has(lower)) return lower
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  }).join(' ')
  return `${firstName} ${lastName}`.trim()
}

function ipToOuts(ip: unknown): number {
  const s = String(ip ?? '0')
  if (s.includes('.')) {
    const [full, frac] = s.split('.').map(n => parseInt(n, 10) || 0)
    return full * 3 + Math.min(frac, 2)
  }
  return parseInt(s, 10) || 0
}

function outsToIp(outs: number): string {
  return `${Math.floor(outs / 3)}.${outs % 3}`
}

function r3(n: number): number { return Math.round(n * 1000) / 1000 }

export async function POST(req: NextRequest) {
  // Auth: must be super admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: admin } = await supabaseAdmin.from('admin_users').select('is_super_admin').eq('email', user.email).single()
  if (!admin?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { seriesDate } = await req.json()
  if (!seriesDate || !/^\d{4}-\d{2}-\d{2}$/.test(seriesDate)) {
    return NextResponse.json({ error: 'Invalid seriesDate' }, { status: 400 })
  }

  const year = parseInt(seriesDate.slice(0, 4), 10)

  // 1. Get schedule and find games in this series (within 5 days of seriesDate)
  const schedRes = await fetch('https://boxscore.stenwessel.nl/api/fetchschedule.php?competition=hb2026', { cache: 'no-store' })
  const schedJson = await schedRes.json()
  const allGames: Array<{ id: number; start: string; gamestatus: number }> = schedJson.games ?? []

  const t0 = new Date(seriesDate).getTime()
  const seriesGames = allGames.filter(g => {
    if (g.gamestatus !== 2 && g.gamestatus !== 3) return false
    const diff = (new Date(g.start.slice(0, 10)).getTime() - t0) / 86400000
    return diff >= 0 && diff <= 5
  })

  if (seriesGames.length === 0) {
    return NextResponse.json({ error: 'No finished games found for this series date' }, { status: 404 })
  }

  // 2. Aggregate per-player stats across all games in the series
  type Acc = {
    full_name: string; team_id: string
    ab: number; h: number; hr: number; rbi: number; sb: number
    doubles: number; triples: number; bb: number; hbp: number; sf: number
    pitch_outs: number; k: number; wins: number; saves: number; ha: number; walks: number; er: number
  }
  const map = new Map<string, Acc>()

  for (const game of seriesGames) {
    const res = await fetch(
      `https://boxscore.stenwessel.nl/api/fetchgamedata.php?competition=hb2026&game=${game.id}`,
      { cache: 'no-store' }
    )
    if (!res.ok) continue
    const gd = await res.json()
    const boxScore: Record<string, Record<string, unknown[]>> = gd.boxScore ?? {}

    for (const [teamKey, spots] of Object.entries(boxScore)) {
      if (teamKey === 'totals' || teamKey === 'pitchers') continue
      const friendlyTeam = KNBSB_ID_TO_TEAM[parseInt(teamKey, 10)]
      if (!friendlyTeam) continue

      for (const players of Object.values(spots)) {
        if (!Array.isArray(players) || !players[0]) continue
        const p = players[0] as Record<string, unknown>
        const full = formatName(String(p.firstname ?? ''), String(p.lastname ?? ''))
        const key = `${full}|${friendlyTeam}`
        const e = map.get(key) ?? { full_name: full, team_id: friendlyTeam, ab: 0, h: 0, hr: 0, rbi: 0, sb: 0, doubles: 0, triples: 0, bb: 0, hbp: 0, sf: 0, pitch_outs: 0, k: 0, wins: 0, saves: 0, ha: 0, walks: 0, er: 0 }
        e.ab += Number(p.ab ?? 0)
        e.h += Number(p.h ?? 0)
        e.hr += Number(p.hr ?? 0)
        e.rbi += Number(p.rbi ?? 0)
        e.sb += Number(p.sb ?? 0)
        e.doubles += Number(p.double ?? 0)
        e.triples += Number(p.triple ?? 0)
        e.bb += Number(p.bb ?? 0)
        e.hbp += Number(p.hbp ?? 0)
        e.sf += Number(p.sf ?? 0)
        e.pitch_outs += ipToOuts(p.pitch_ip)
        e.k += Number(p.pitch_so ?? 0)
        e.wins += Number(p.pitch_win ?? 0)
        e.saves += Number(p.pitch_save ?? 0)
        e.ha += Number(p.pitch_h ?? 0)
        e.walks += Number(p.pitch_bb ?? 0)
        e.er += Number(p.pitch_er ?? 0)
        map.set(key, e)
      }
    }
  }

  // 3. Build rows
  const batRows: Record<string, unknown>[] = []
  const pitRows: Record<string, unknown>[] = []

  for (const p of map.values()) {
    const tb = (p.h - p.doubles - p.triples - p.hr) + 2 * p.doubles + 3 * p.triples + 4 * p.hr
    const obpDenom = p.ab + p.bb + p.hbp + p.sf

    batRows.push({
      season: year,
      series_week: seriesDate,
      full_name: p.full_name,
      team_id: p.team_id,
      at_bats: p.ab,
      hits: p.h,
      home_runs: p.hr,
      rbi: p.rbi,
      stolen_bases: p.sb,
      avg: p.ab > 0 ? r3(p.h / p.ab) : 0,
      obp: obpDenom > 0 ? r3((p.h + p.bb + p.hbp) / obpDenom) : 0,
      slg: p.ab > 0 ? r3(tb / p.ab) : 0,
      ops: obpDenom > 0 && p.ab > 0 ? r3(r3((p.h + p.bb + p.hbp) / obpDenom) + r3(tb / p.ab)) : 0,
    })

    if (p.pitch_outs > 0) {
      pitRows.push({
        season: year,
        series_week: seriesDate,
        full_name: p.full_name,
        team_id: p.team_id,
        innings_pitched: outsToIp(p.pitch_outs),
        strikeouts: p.k,
        wins: p.wins,
        saves: p.saves,
        hits_allowed: p.ha,
        walks: p.walks,
        earned_runs: p.er,
      })
    }
  }

  // 4. Delete existing data for this series (check errors), then insert fresh
  const [delBat, delPit] = await Promise.all([
    supabaseAdmin.from('batting_stats').delete().eq('season', year).eq('series_week', seriesDate),
    supabaseAdmin.from('pitching_stats').delete().eq('season', year).eq('series_week', seriesDate),
  ])
  if (delBat.error) return NextResponse.json({ error: `Delete batting failed: ${delBat.error.message}` }, { status: 500 })
  if (delPit.error) return NextResponse.json({ error: `Delete pitching failed: ${delPit.error.message}` }, { status: 500 })

  if (batRows.length > 0) {
    const { error } = await supabaseAdmin.from('batting_stats').insert(batRows)
    if (error) return NextResponse.json({ error: `Insert batting failed: ${error.message}` }, { status: 500 })
  }
  if (pitRows.length > 0) {
    const { error } = await supabaseAdmin.from('pitching_stats').insert(pitRows)
    if (error) return NextResponse.json({ error: `Insert pitching failed: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    seriesDate,
    gamesProcessed: seriesGames.length,
    battersImported: batRows.length,
    pitchersImported: pitRows.length,
  })
}
