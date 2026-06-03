import { NextRequest, NextResponse } from 'next/server'
import { KNBSB_NUMERIC_ID_MAP } from '@/lib/teams'

export const runtime = 'nodejs'

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
    const schedRes = await fetch('https://boxscore.stenwessel.nl/api/fetchschedule.php?competition=hb2026', { cache: 'no-store' })
    const schedJson = await schedRes.json()
    const allGames: Array<{ id: number; start: string; gamestatus: number; homeid: number; awayid: number; homeioc: string; awayioc: string }> = schedJson.games ?? []

    const teamGames = allGames
      .filter(g => (g.homeid === knbsbId || g.awayid === knbsbId) && (g.gamestatus === 2 || g.gamestatus === 3))
      .sort((a, b) => b.start.localeCompare(a.start))
      .slice(0, 15)

    const playerLast = playerName.split(' ').pop()?.toLowerCase() ?? ''
    const playerNorm = playerName.toLowerCase()

    const gameSplits: Array<{ date: string; opponent: string; ab: number; r: number; h: number; hr: number; rbi: number; bb: number; so: number; sb: number }> = []

    await Promise.all(teamGames.map(async g => {
      try {
        const r = await fetch(`https://boxscore.stenwessel.nl/api/fetchgamedata.php?competition=hb2026&game=${g.id}`, { cache: 'no-store' })
        if (!r.ok) return
        const gd = await r.json()
        const bs: Record<string, Record<string, unknown[]>> = gd.boxScore ?? {}
        const spots = bs[String(knbsbId)] ?? {}

        // Search ALL players in ALL spots (catches starters AND substitutes)
        let found = false
        outer: for (const playerList of Object.values(spots)) {
          if (!Array.isArray(playerList)) continue
          for (const raw of playerList) {
            if (!raw || typeof raw !== 'object') continue
            const p = raw as Record<string, unknown>
            const last = String(p.lastname ?? '').toLowerCase()
            if (!last || last === 'totals') continue
            if (!last.includes(playerLast) && !playerNorm.includes(last)) continue

            const isHome = g.homeid === knbsbId
            const oppIoc = isHome ? g.awayioc : g.homeioc
            gameSplits.push({
              date:     g.start.slice(0, 10),
              opponent: IOC_SHORT[oppIoc] ?? oppIoc,
              ab:  Number(p.ab  ?? 0), r:   Number(p.r   ?? 0), h:   Number(p.h   ?? 0),
              hr:  Number(p.hr  ?? 0), rbi: Number(p.rbi ?? 0), bb:  Number(p.bb  ?? 0),
              so:  Number(p.so  ?? 0), sb:  Number(p.sb  ?? 0),
            })
            found = true
            break outer
          }
        }
        void found
      } catch { /* skip */ }
    }))

    gameSplits.sort((a, b) => b.date.localeCompare(a.date))

    type StatKey = 'ab'|'r'|'h'|'hr'|'rbi'|'bb'|'so'|'sb'
    const statKeys: StatKey[] = ['ab','r','h','hr','rbi','bb','so','sb']
    const makeSplit = (label: string, n: number) => {
      const g = gameSplits.slice(0, n)
      const t = statKeys.reduce((acc, k) => { acc[k] = g.reduce((s, x) => s + x[k], 0); return acc }, {} as Record<StatKey, number>)
      return { label, ...t, avg: fmtAvg(t.h, t.ab) }
    }

    const splits = [
      makeSplit('Last 3 Games',  3),
      makeSplit('Last 7 Games',  7),
      makeSplit('Last 15 Games', 15),
    ].filter(s => s.ab > 0)

    return NextResponse.json({ games: gameSplits.slice(0, 5), splits }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch {
    return NextResponse.json({ games: [], splits: [] })
  }
}
