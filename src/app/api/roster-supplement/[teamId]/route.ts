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

async function fetchNames(section: string, teamNum: number): Promise<{ name: string; isPitcher: boolean }[]> {
  try {
    const url = `https://stats.knbsbstats.nl/api/v1/stats/events/2026-lucky-day-hoofdklasse/index?section=players&stats-section=${section}&round=&team=&split=&language=en`
    const res = await fetch(url, { headers: HEADERS, cache: 'no-store' })
    if (!res.ok) return []
    const d = await res.json()
    let data = d.data ?? []
    if (data.length && Array.isArray(data[0]?.data)) data = data.flatMap((c: { data: unknown[] }) => c.data)
    return (data as Record<string, unknown>[])
      .filter(p => Number(p.teamid) === teamNum)
      .map(p => ({ name: parseName(String(p.name ?? '')), isPitcher: section === 'pitching' }))
      .filter(p => p.name)
  } catch { return [] }
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

  const [batters, pitchers] = await Promise.all([
    fetchNames('batting', teamNum),
    fetchNames('pitching', teamNum),
  ])

  const pitcherNames = new Set(pitchers.map(p => p.name.toLowerCase()))
  const seen = new Set<string>()
  const result: { name: string; pos: string }[] = []

  for (const { name } of [...batters, ...pitchers]) {
    const lower = name.toLowerCase()
    if (!name || knownNames.has(lower) || seen.has(lower)) continue
    seen.add(lower)
    result.push({ name, pos: pitcherNames.has(lower) ? 'P' : '?' })
  }

  return NextResponse.json(result)
}
