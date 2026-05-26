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

function parseName(html: string): string {
  const parts = html.replace(/<[^>]+>/g, '|').split('|').map(s => s.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const raw = parts[0]
    const last = raw.split(' ').map((w, i, arr) => {
      const lower = w.toLowerCase()
      const tussenvoegsel = new Set(['van', 'de', 'den', 'der', 'het', 'op', 'ten', 'ter', 't'])
      if (i < arr.length - 1 && tussenvoegsel.has(lower)) return lower
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    }).join(' ')
    return `${parts[1]} ${last}`.trim()
  }
  return parts[0] ?? ''
}

function n(v: unknown): number {
  const x = Number(v)
  return isNaN(x) ? 0 : x
}

function rate(v: unknown): number {
  const x = n(v)
  return Number((x > 1 ? x / 1000 : x).toFixed(3))
}

export type CmpPlayer = {
  name:   string
  teamId: string
  ab:     number
  r:      number
  h:      number
  double: number
  triple: number
  hr:     number
  rbi:    number
  bb:     number
  so:     number
  sb:     number
  cs:     number
  avg:    number
  obp:    number
  slg:    number
  ops:    number
}

export async function GET() {
  try {
    const res = await fetch(
      `${BASE}?section=players&stats-section=batting&round=&team=&split=&language=en`,
      { headers: HEADERS, next: { revalidate: 3600 } }
    )
    let data = (await res.json()).data ?? []
    if (data.length && Array.isArray(data[0]?.data)) {
      data = data.flatMap((cat: { data: unknown[] }) => cat.data)
    }

    const players: CmpPlayer[] = data
      .filter((p: Record<string, unknown>) => n(p.ab) >= 10)
      .map((p: Record<string, unknown>) => {
        const obp = rate(p.obp)
        const slg = rate(p.slg)
        return {
          name:   parseName(String(p.name ?? '')),
          teamId: KNBSB_NUMERIC_ID_MAP[n(p.teamid)] ?? '',
          ab:     n(p.ab),
          r:      n(p.r),
          h:      n(p.h),
          double: n(p.double),
          triple: n(p.triple),
          hr:     n(p.hr),
          rbi:    n(p.rbi),
          bb:     n(p.bb),
          so:     n(p.so),
          sb:     n(p.sb),
          cs:     n(p.cs),
          avg:    rate(p.avg),
          obp,
          slg,
          ops:    Number((obp + slg).toFixed(3)),
        }
      })
      .filter((p: CmpPlayer) => p.teamId && p.name)

    return NextResponse.json(players, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    })
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
