import { NextResponse } from 'next/server'
import { KNBSB_NUMERIC_ID_MAP } from '@/lib/teams'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'nl-NL,nl;q=0.9',
  'Origin': 'https://stats.knbsbstats.nl',
  'Referer': 'https://stats.knbsbstats.nl/events/2026-lucky-day-hoofdklasse/stats/players/batting',
}

const BASE = 'https://stats.knbsbstats.nl/api/v1/stats/events/2026-lucky-day-hoofdklasse/index'

function parseName(html: string): { first: string; last: string } {
  const clean = html.replace(/<[^>]+>/g, '|').split('|').map(s => s.trim()).filter(Boolean)
  if (clean.length >= 2) {
    const last  = clean[0].charAt(0) + clean[0].slice(1).toLowerCase()
    const first = clean[1]
    return { first, last }
  }
  return { first: '', last: clean[0] ?? '' }
}

function n(v: unknown): number {
  const x = Number(v)
  return isNaN(x) ? 0 : x
}

export type HLPlayer = {
  name: string
  teamId: string
  avg: number   // e.g. 0.312
  hr:  number
  rbi: number
  ops: number
  sb:  number
}

export async function GET() {
  try {
    const res = await fetch(
      `${BASE}?section=players&stats-section=batting&round=&team=&split=&language=en`,
      { headers: HEADERS, next: { revalidate: 3600 } }
    )
    let data = (await res.json()).data ?? []
    // Flatten category structure if needed
    if (data.length && Array.isArray(data[0]?.data)) {
      data = data.flatMap((cat: { data: unknown[] }) => cat.data)
    }

    const players: HLPlayer[] = data
      .filter((p: Record<string, unknown>) => n(p.ab) >= 15)
      .map((p: Record<string, unknown>) => {
        const { first, last } = parseName(String(p.name ?? ''))
        const teamId = KNBSB_NUMERIC_ID_MAP[n(p.teamid)] ?? ''
        const avg = n(p.avg) > 1 ? n(p.avg) / 1000 : n(p.avg)
        const obp = n(p.obp) > 1 ? n(p.obp) / 1000 : n(p.obp)
        const slg = n(p.slg) > 1 ? n(p.slg) / 1000 : n(p.slg)
        return {
          name:   `${first} ${last}`.trim(),
          teamId,
          avg:    Number(avg.toFixed(3)),
          hr:     n(p.hr),
          rbi:    n(p.rbi),
          ops:    Number((obp + slg).toFixed(3)),
          sb:     n(p.sb),
        }
      })
      .filter((p: HLPlayer) => p.teamId && p.name)

    return NextResponse.json(players, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    })
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
