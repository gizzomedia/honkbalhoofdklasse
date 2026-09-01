import { NextResponse } from 'next/server'
import { KNBSB_NUMERIC_ID_MAP } from '@/lib/teams'
import positionsData from '@/lib/win-the-series-positions.json'

export const runtime = 'nodejs'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Origin': 'https://stats.knbsbstats.nl',
}
const BASE = 'https://stats.knbsbstats.nl/api/v1/stats/events/2026-lucky-day-hoofdklasse/index'
const FIELD_POS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const

const POS = positionsData as Record<string, { team: string; pos: Record<string, number> }>
const TUSSEN = new Set(['van', 'de', 'den', 'der', 'het', 'op', 'ten', 'ter', 't'])

const num = (v: unknown) => { const x = Number(v); return isNaN(x) ? 0 : x }
const rate = (v: unknown) => { const x = num(v); return Number((x > 1 ? x / 1000 : x).toFixed(3)) }
function ipDec(v: unknown): number {
  const s = String(v ?? '0')
  if (s.includes('.')) { const [f, o] = s.split('.'); return num(f) + (num(o)) / 3 }
  return num(s)
}
function spans(html: string) {
  const last = html.match(/class="lastname">([^<]*)</)?.[1] ?? ''
  const first = html.match(/class="firstname">([^<]*)</)?.[1] ?? ''
  return { last: last.trim(), first: first.trim() }
}
function titleLast(last: string): string {
  return last.split(/\s+/).map((w, i, arr) => {
    const l = w.toLowerCase()
    return (i < arr.length - 1 && TUSSEN.has(l)) ? l : l.charAt(0).toUpperCase() + l.slice(1)
  }).join(' ')
}
function keyOf(teamId: string, last: string, first: string) {
  return `${teamId}|${last.replace(/\s+/g, '').toLowerCase()}|${first.toLowerCase().split(/\s+/)[0]}`
}

async function fetchSection(section: string) {
  const res = await fetch(`${BASE}?section=players&stats-section=${section}&round=&team=&split=&language=en`, {
    headers: { ...HEADERS, Referer: `https://stats.knbsbstats.nl/events/2026-lucky-day-hoofdklasse/stats/players/${section}` },
    next: { revalidate: 3600 },
  })
  let data = (await res.json()).data ?? []
  if (data.length && Array.isArray(data[0]?.data)) data = data.flatMap((c: { data: unknown[] }) => c.data)
  return data as Record<string, unknown>[]
}

export type HSHitter = {
  name: string; teamId: string
  ab: number; r: number; h: number; hr: number; rbi: number; sb: number
  avg: number; obp: number; slg: number; ops: number
  positions: string[]
}
export type HSPitcher = {
  name: string; teamId: string; role: 'SP' | 'RP'
  era: number; whip: number; so: number; ip: number; w: number; sv: number
}

export async function GET() {
  try {
    const [bat, pit] = await Promise.all([fetchSection('batting'), fetchSection('pitching')])

    const hitters: HSHitter[] = bat
      .filter(p => num(p.ab) >= 10)
      .map(p => {
        const teamId = KNBSB_NUMERIC_ID_MAP[num(p.teamid)] ?? ''
        const { last, first } = spans(String(p.name ?? ''))
        const obp = rate(p.obp), slg = rate(p.slg)
        const posRec = POS[keyOf(teamId, last, first)]?.pos ?? {}
        const positions = FIELD_POS.filter(fp => (posRec[fp] ?? 0) >= 1)
        return {
          name: `${first.split(' ')[0]} ${titleLast(last)}`.trim(),
          teamId,
          ab: num(p.ab), r: num(p.r), h: num(p.h), hr: num(p.hr), rbi: num(p.rbi), sb: num(p.sb),
          avg: rate(p.avg), obp, slg, ops: Number((obp + slg).toFixed(3)),
          positions,
        }
      })
      .filter(h => h.teamId && h.name.length > 1)

    const pitchers: HSPitcher[] = pit
      .map(p => {
        const teamId = KNBSB_NUMERIC_ID_MAP[num(p.teamid)] ?? ''
        const { last, first } = spans(String(p.name ?? ''))
        const ip = ipDec(p.pitch_ip)
        const gs = num(p.pitch_gs)
        const role: 'SP' | 'RP' | null = gs >= 3 && ip >= 12 ? 'SP' : gs < 3 && ip >= 5 ? 'RP' : null
        return {
          name: `${first.split(' ')[0]} ${titleLast(last)}`.trim(),
          teamId, role,
          era: num(p.era), whip: ip > 0 ? Number(((num(p.pitch_bb) + num(p.pitch_h)) / ip).toFixed(2)) : 0,
          so: num(p.pitch_so), ip: Number(ip.toFixed(1)), w: num(p.pitch_win), sv: num(p.pitch_save),
        }
      })
      .filter((p): p is HSPitcher => !!p.role && !!p.teamId && p.era > 0 && p.name.length > 1)

    const qOps = hitters.filter(h => h.ab >= 30).map(h => h.ops)
    const leagueOps = qOps.length ? Number((qOps.reduce((a, b) => a + b, 0) / qOps.length).toFixed(3)) : 0.71
    // Run environment baseline: mean ERA of pitchers with a real workload
    // (>=20 IP), i.e. starters — not the whole pool, which small-sample
    // relievers would inflate.
    const qEras = pit.map(p => ({ era: num(p.era), ip: ipDec(p.pitch_ip) })).filter(x => x.ip >= 20 && x.era > 0).map(x => x.era)
    const leagueEra = qEras.length ? Number((qEras.reduce((a, b) => a + b, 0) / qEras.length).toFixed(2)) : 4.9

    return NextResponse.json({ hitters, pitchers, leagueOps, leagueEra }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    })
  } catch {
    return NextResponse.json({ hitters: [], pitchers: [], leagueOps: 0.71, leagueEra: 4.9 }, { status: 500 })
  }
}
