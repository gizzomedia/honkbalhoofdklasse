import { NextRequest, NextResponse } from 'next/server'
import { KNBSB_NUMERIC_ID_MAP } from '@/lib/teams'

export const runtime = 'nodejs'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const FRIENDLY_TO_KNBSB: Record<string, number> = Object.fromEntries(
  Object.entries(KNBSB_NUMERIC_ID_MAP).map(([k, v]) => [v, Number(k)])
)

const IOC_SHORT: Record<string, string> = {
  'NEP': 'NEP', 'HCA': 'HCA', 'KIN': 'KIN', 'PIO': 'PIO',
  'PIR': 'PIR', 'TWI': 'TWI', 'UVV': 'UVV', 'AMS': 'PIR',
}

function fmtAvg(h: number, ab: number) {
  if (ab === 0) return '.---'
  return (h / ab).toFixed(3).replace('0.', '.')
}


export async function GET(req: NextRequest) {
  const playerName = req.nextUrl.searchParams.get('player') ?? ''
  const teamId     = req.nextUrl.searchParams.get('team') ?? ''

  const knbsbId = FRIENDLY_TO_KNBSB[teamId]
  if (!knbsbId || !playerName) return NextResponse.json({ games: [], splits: [] })

  try {
    const schedRes = await fetch('https://boxscore.stenwessel.nl/api/fetchschedule.php?competition=hb2026', { cache: 'no-store', headers: { 'User-Agent': UA } })
    const schedJson = await schedRes.json()
    const allGames: Array<{ id: number; start: string; gamestatus: number; homeid: number; awayid: number; homeioc: string; awayioc: string }> = schedJson.games ?? []

    const teamGames = allGames
      .filter(g => (g.homeid === knbsbId || g.awayid === knbsbId) && (g.gamestatus === 2 || g.gamestatus === 3))
      .sort((a, b) => b.start.localeCompare(a.start))
      .slice(0, 15)

    const playerLast = playerName.split(' ').pop()?.toLowerCase() ?? ''
    const playerNorm = playerName.toLowerCase()

    // Convert "5.1" IP notation to total outs
    const ipToOuts = (v: unknown) => {
      const s = String(v ?? '0')
      if (!s || s === '0' || s === '0.0') return 0
      if (s.includes('.')) {
        const [f, o] = s.split('.').map(n => parseInt(n, 10) || 0)
        return f * 3 + Math.min(o, 2)
      }
      return (parseInt(s, 10) || 0) * 3
    }
    const outsToIp = (o: number) => `${Math.floor(o / 3)}.${o % 3}`

    type BatGame = { date: string; opponent: string; ab: number; r: number; h: number; hr: number; rbi: number; bb: number; so: number; sb: number }
    type PitGame = { date: string; opponent: string; outs: number; k: number; bb: number; er: number; h: number; w: number; l: number }

    const batGames: BatGame[] = []
    const pitGames: PitGame[] = []
    let isPitcher = false

    await Promise.all(teamGames.map(async g => {
      try {
        const r = await fetch(`https://boxscore.stenwessel.nl/api/fetchgamedata.php?competition=hb2026&game=${g.id}`, { cache: 'no-store', headers: { 'User-Agent': UA } })
        if (!r.ok) return
        const gd = await r.json()
        const bs: Record<string, Record<string, unknown[]>> = gd.boxScore ?? {}
        const spots = bs[String(knbsbId)] ?? {}

        const isHome = g.homeid === knbsbId
        const oppIoc = isHome ? g.awayioc : g.homeioc
        const opp = IOC_SHORT[oppIoc] ?? oppIoc
        const date = g.start.slice(0, 10)

        // Try batting spots 1-9 first
        const sortedSpots = Object.entries(spots).sort(([a], [b]) => (parseInt(a) || 999) - (parseInt(b) || 999))
        let found = false

        for (const [spot, playerList] of sortedSpots) {
          if (spot === 'totals') continue
          if (!Array.isArray(playerList)) continue
          for (const raw of playerList) {
            if (!raw || typeof raw !== 'object') continue
            const p = raw as Record<string, unknown>
            const last = String(p.lastname ?? '').toLowerCase()
            if (!last || last === 'totals') continue
            if (!last.includes(playerLast) && !playerNorm.includes(last)) continue

            if (spot === '90') {
              // Pitcher — collect pitching stats
              isPitcher = true
              pitGames.push({
                date, opponent: opp,
                outs: ipToOuts(p.pitch_ip),
                k:    Number(p.pitch_so ?? 0),
                bb:   Number(p.pitch_bb ?? 0),
                er:   Number(p.pitch_er ?? 0),
                h:    Number(p.pitch_h  ?? 0),
                w:    Number(p.pitch_win  ?? 0),
                l:    Number(p.pitch_loss ?? 0),
              })
            } else {
              // Batter — collect batting stats
              batGames.push({
                date, opponent: opp,
                ab:  Number(p.ab  ?? 0), r:   Number(p.r   ?? 0), h:   Number(p.h   ?? 0),
                hr:  Number(p.hr  ?? 0), rbi: Number(p.rbi ?? 0), bb:  Number(p.bb  ?? 0),
                so:  Number(p.so  ?? 0), sb:  Number(p.sb  ?? 0),
              })
            }
            found = true
            break
          }
          if (found) break
        }
      } catch { /* skip */ }
    }))

    // Two-way players: if they batted in ANY game, show batting splits
    if (isPitcher && batGames.length === 0) {
      pitGames.sort((a, b) => b.date.localeCompare(a.date))
      const fmtEra = (er: number, outs: number) => outs === 0 ? '-.--' : (er / outs * 27).toFixed(2)

      const splits = ([3, 7, 15] as const).map(n => {
        const g = pitGames.slice(0, n)
        if (!g.length) return null
        const outs = g.reduce((s, x) => s + x.outs, 0)
        const k    = g.reduce((s, x) => s + x.k, 0)
        const bb   = g.reduce((s, x) => s + x.bb, 0)
        const er   = g.reduce((s, x) => s + x.er, 0)
        const h    = g.reduce((s, x) => s + x.h, 0)
        const w    = g.reduce((s, x) => s + x.w, 0)
        const l    = g.reduce((s, x) => s + x.l, 0)
        return { label: `Last ${n} Games`, found: g.length, ip: outsToIp(outs), k, bb, er, h, w, l, era: fmtEra(er, outs) }
      }).filter(Boolean)

      const games = pitGames.slice(0, 5).map(g => ({
        ...g, ip: outsToIp(g.outs), era: fmtEra(g.er, g.outs)
      }))

      return NextResponse.json({ type: 'pitching', games, splits }, {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      })
    }

    // Batting
    batGames.sort((a, b) => b.date.localeCompare(a.date))
    type BatKey = 'ab'|'r'|'h'|'hr'|'rbi'|'bb'|'so'|'sb'
    const batKeys: BatKey[] = ['ab','r','h','hr','rbi','bb','so','sb']
    const splits = ([3, 7, 15] as const).map(n => {
      const g = batGames.slice(0, n)
      if (!g.length) return null
      const t = batKeys.reduce((acc, k) => { acc[k] = g.reduce((s, x) => s + x[k], 0); return acc }, {} as Record<BatKey, number>)
      return { label: `Last ${n} Games`, found: g.length, ...t, avg: fmtAvg(t.h, t.ab) }
    }).filter(Boolean)

    return NextResponse.json({ type: 'batting', games: batGames.slice(0, 5), splits }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch {
    return NextResponse.json({ games: [], splits: [] })
  }
}
