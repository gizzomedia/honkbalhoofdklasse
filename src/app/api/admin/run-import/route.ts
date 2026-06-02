import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 300

const KNBSB_ID_TO_TEAM: Record<number, string> = {
  39583: 'pirates', 39587: 'neptunus', 39584: 'hcaw',
  39586: 'kinheim', 39588: 'twins', 39589: 'uvv', 39585: 'pioniers',
}
const TUSSENVOEGSELS = new Set(['van','de','den','der','het','op','ten','ter','t','vd','la','le'])

function formatName(first: string, last: string) {
  const fn = first.trim().split(' ')[0]
  const ln = last.trim().split(' ').map((w, i, a) => {
    const l = w.toLowerCase()
    return (i < a.length - 1 && TUSSENVOEGSELS.has(l)) ? l : l.charAt(0).toUpperCase() + l.slice(1)
  }).join(' ')
  return `${fn} ${ln}`.trim()
}

function ipToOuts(ip: unknown) {
  const s = String(ip ?? '0')
  if (s.includes('.')) {
    const [f, r] = s.split('.').map(n => parseInt(n, 10) || 0)
    return f * 3 + Math.min(r, 2)
  }
  return parseInt(s, 10) || 0
}

function outsToIp(o: number) { return `${Math.floor(o / 3)}.${o % 3}` }
function r3(n: number) { return Math.round(n * 1000) / 1000 }

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('Authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Fetch full schedule
  const schedRes = await fetch('https://boxscore.stenwessel.nl/api/fetchschedule.php?competition=hb2026', { cache: 'no-store' })
  const allGames: Array<{ id: number; start: string; gamestatus: number }> = (await schedRes.json()).games ?? []

  // 2. Group finished games into series (new series when gap > 5 days)
  const finished = allGames
    .filter(g => g.gamestatus === 2 || g.gamestatus === 3)
    .map(g => ({ id: g.id, date: g.start.slice(0, 10) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const seriesMap = new Map<string, number[]>()
  let curKey = ''
  let prevMs = 0
  for (const g of finished) {
    const ms = new Date(g.date).getTime()
    if (!curKey || ms - prevMs > 5 * 86400000) curKey = g.date
    if (!seriesMap.has(curKey)) seriesMap.set(curKey, [])
    seriesMap.get(curKey)!.push(g.id)
    prevMs = ms
  }

  // 3. Delete ALL existing per-series stats and re-import clean from boxscores
  await Promise.all([
    supabaseAdmin.from('batting_stats').delete().eq('season', 2026).neq('series_week', 'season'),
    supabaseAdmin.from('pitching_stats').delete().eq('season', 2026).neq('series_week', 'season'),
  ])

  const results: Record<string, unknown>[] = []

  for (const [seriesDate, gameIds] of seriesMap.entries()) {
    const year = parseInt(seriesDate.slice(0, 4), 10)

    type Acc = {
      full_name: string; team_id: string
      ab: number; h: number; hr: number; rbi: number; sb: number
      doubles: number; triples: number; bb: number; hbp: number; sf: number
      pitch_outs: number; k: number; wins: number; saves: number
      ha: number; walks: number; er: number
    }
    const map = new Map<string, Acc>()

    for (const gid of gameIds) {
      const r = await fetch(
        `https://boxscore.stenwessel.nl/api/fetchgamedata.php?competition=hb2026&game=${gid}`,
        { cache: 'no-store' }
      )
      if (!r.ok) continue
      const bs: Record<string, Record<string, unknown[]>> = (await r.json()).boxScore ?? {}

      for (const [tk, spots] of Object.entries(bs)) {
        if (tk === 'totals' || tk === 'pitchers') continue
        const team = KNBSB_ID_TO_TEAM[parseInt(tk, 10)]
        if (!team) continue

        for (const [spot, players] of Object.entries(spots)) {
          if (!Array.isArray(players) || !players[0]) continue
          const p = players[0] as Record<string, unknown>
          const full = formatName(String(p.firstname ?? ''), String(p.lastname ?? ''))
          const key = `${full}|${team}`
          const e = map.get(key) ?? {
            full_name: full, team_id: team,
            ab: 0, h: 0, hr: 0, rbi: 0, sb: 0,
            doubles: 0, triples: 0, bb: 0, hbp: 0, sf: 0,
            pitch_outs: 0, k: 0, wins: 0, saves: 0, ha: 0, walks: 0, er: 0,
          }

          // Batting stats only from regular batting spots (not spot 90 = pitching summary)
          if (spot !== '90') {
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
          }

          // Pitching stats only from spot 90 (dedicated pitching summary row)
          if (spot === '90') {
            e.pitch_outs += ipToOuts(p.pitch_ip)
            e.k += Number(p.pitch_so ?? 0)
            e.wins += Number(p.pitch_win ?? 0)
            e.saves += Number(p.pitch_save ?? 0)
            e.ha += Number(p.pitch_h ?? 0)
            e.walks += Number(p.pitch_bb ?? 0)
            e.er += Number(p.pitch_er ?? 0)
          }

          map.set(key, e)
        }
      }
    }

    const batRows: Record<string, unknown>[] = []
    const pitRows: Record<string, unknown>[] = []

    for (const p of map.values()) {
      const tb = (p.h - p.doubles - p.triples - p.hr) + 2 * p.doubles + 3 * p.triples + 4 * p.hr
      const od = p.ab + p.bb + p.hbp + p.sf
      if (p.ab > 0) {
        batRows.push({
          season: year, series_week: seriesDate,
          full_name: p.full_name, team_id: p.team_id,
          at_bats: p.ab, hits: p.h, home_runs: p.hr, rbi: p.rbi, stolen_bases: p.sb,
          avg: r3(p.h / p.ab),
          obp: od > 0 ? r3((p.h + p.bb + p.hbp) / od) : 0,
          slg: r3(tb / p.ab),
          ops: od > 0 ? r3(r3((p.h + p.bb + p.hbp) / od) + r3(tb / p.ab)) : 0,
        })
      }
      if (p.pitch_outs > 0) {
        pitRows.push({
          season: year, series_week: seriesDate,
          full_name: p.full_name, team_id: p.team_id,
          innings_pitched: outsToIp(p.pitch_outs),
          strikeouts: p.k, wins: p.wins, saves: p.saves,
          hits_allowed: p.ha, walks: p.walks, earned_runs: p.er,
        })
      }
    }

    if (batRows.length > 0) await supabaseAdmin.from('batting_stats').insert(batRows)
    if (pitRows.length > 0) await supabaseAdmin.from('pitching_stats').insert(pitRows)

    results.push({ seriesDate, games: gameIds.length, batters: batRows.length, pitchers: pitRows.length })
  }

  return NextResponse.json({ ok: true, series: results })
}
