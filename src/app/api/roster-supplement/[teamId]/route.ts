import { NextResponse } from 'next/server'
import { ROSTERS } from '@/lib/rosters-data'

export const revalidate = 0

const KNBSB_TEAM_IDS: Record<string, number> = {
  pirates: 39583, neptunus: 39587, hcaw: 39584,
  kinheim: 39586, twins: 39588, uvv: 39589, pioniers: 39585,
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'nl-NL,nl;q=0.9',
  'Origin': 'https://stats.knbsbstats.nl',
  'Referer': 'https://stats.knbsbstats.nl/events/2026-lucky-day-hoofdklasse/stats/players/batting',
}

function parseName(raw: string): string {
  const parts = raw.replace(/<[^>]+>/g, '|').split('|').map(s => s.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const tussenvoegsel = new Set(['van', 'de', 'den', 'der', 'het', 'op', 'ten', 'ter', 't'])
    const last = parts[0].split(' ').map((w, i, arr) => {
      const lower = w.toLowerCase()
      return (i < arr.length - 1 && tussenvoegsel.has(lower)) ? lower : lower.charAt(0).toUpperCase() + lower.slice(1)
    }).join(' ')
    return `${parts[1]} ${last}`.trim()
  }
  return parts[0] ?? ''
}

async function fetchSection(section: string, teamNum: number): Promise<Record<string, unknown>[]> {
  try {
    const url = `https://stats.knbsbstats.nl/api/v1/stats/events/2026-lucky-day-hoofdklasse/index?section=players&stats-section=${section}&round=&team=&split=&language=en`
    const res = await fetch(url, { headers: HEADERS, cache: 'no-store' })
    if (!res.ok) return []
    const d = await res.json()
    let data = d.data ?? []
    if (data.length && Array.isArray(data[0]?.data)) data = data.flatMap((c: { data: unknown[] }) => c.data)
    return (data as Record<string, unknown>[]).filter(p => Number(p.teamid) === teamNum)
  } catch { return [] }
}

function inferPos(p: Record<string, unknown>): string {
  const po  = Number(p.field_po ?? 0)
  const a   = Number(p.field_a  ?? 0)
  const pb  = Number(p.field_pb ?? 0)
  const sba = Number(p.field_sba ?? 0)
  if (pb > 0 || sba > 0) return 'C'
  if (po > 30 && a < po * 0.3) return 'C'
  if (a > po) return 'IF'
  if (po > 0 && a === 0) return 'OF'
  if (a > 0) return 'IF'
  return 'UTL'
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params
  const teamNum = KNBSB_TEAM_IDS[teamId]
  if (!teamNum) return NextResponse.json([])

  const roster = ROSTERS[teamId]
  const knownNames = new Set(roster?.players.map(p => p.name.toLowerCase()) ?? [])

  const [batters, pitchers, fielding] = await Promise.all([
    fetchSection('batting', teamNum),
    fetchSection('pitching', teamNum),
    fetchSection('fielding', teamNum),
  ])

  const pitcherNames = new Set(pitchers.map(p => parseName(String(p.name ?? '')).toLowerCase()))
  const fieldingByName = new Map(
    fielding.map(p => [parseName(String(p.name ?? '')).toLowerCase(), p])
  )

  const seen = new Set<string>()
  const result: { name: string; pos: string }[] = []

  for (const row of [...batters, ...pitchers]) {
    const name = parseName(String(row.name ?? ''))
    const lower = name.toLowerCase()
    if (!name || knownNames.has(lower) || seen.has(lower)) continue
    seen.add(lower)

    let pos: string
    if (pitcherNames.has(lower)) {
      pos = 'P'
    } else {
      const fd = fieldingByName.get(lower)
      pos = fd ? inferPos(fd) : 'UTL'
    }
    result.push({ name, pos })
  }

  return NextResponse.json(result)
}
