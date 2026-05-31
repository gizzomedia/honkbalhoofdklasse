import { NextResponse } from 'next/server'
import { ROSTERS } from '@/lib/rosters-data'
import { TEAM_NAMES } from '@/lib/teams'

export const revalidate = 0

const KNBSB_TEAM_IDS: Record<string, number> = {
  pirates: 39583, neptunus: 39587, hcaw: 39584,
  kinheim: 39586, twins: 39588, uvv: 39589, pioniers: 39585,
}
const KNBSB_ID_TO_TEAM = Object.fromEntries(Object.entries(KNBSB_TEAM_IDS).map(([k, v]) => [v, k]))

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

async function fetchSection(section: string): Promise<{ name: string; teamId: string; isPitcher: boolean }[]> {
  try {
    const url = `https://stats.knbsbstats.nl/api/v1/stats/events/2026-lucky-day-hoofdklasse/index?section=players&stats-section=${section}&round=&team=&split=&language=en`
    const res = await fetch(url, { headers: HEADERS, cache: 'no-store' })
    if (!res.ok) return []
    const d = await res.json()
    let data = d.data ?? []
    if (data.length && Array.isArray(data[0]?.data)) data = data.flatMap((c: { data: unknown[] }) => c.data)
    return (data as Record<string, unknown>[]).map(p => ({
      name: parseName(String(p.name ?? '')),
      teamId: KNBSB_ID_TO_TEAM[Number(p.teamid)] ?? '',
      isPitcher: section === 'pitching',
    })).filter(p => p.name && p.teamId)
  } catch { return [] }
}

export async function GET() {
  // Start with all static roster players
  const staticPlayers = Object.entries(ROSTERS).flatMap(([teamId, roster]) =>
    roster.players.map(p => ({
      name: p.name,
      teamId,
      teamName: TEAM_NAMES[teamId] ?? teamId,
      pos: p.pos,
      uniform: p.uniform,
      isNew: false,
    }))
  )

  const knownByTeam: Record<string, Set<string>> = {}
  for (const [teamId, roster] of Object.entries(ROSTERS)) {
    knownByTeam[teamId] = new Set(roster.players.map(p => p.name.toLowerCase()))
  }

  // Fetch KNBSB stats players
  const [batters, pitchers] = await Promise.all([
    fetchSection('batting'),
    fetchSection('pitching'),
  ])

  const pitcherSet = new Set(pitchers.map(p => `${p.teamId}:${p.name.toLowerCase()}`))
  const seen = new Set<string>()
  const newPlayers: typeof staticPlayers = []

  for (const p of [...batters, ...pitchers]) {
    const key = `${p.teamId}:${p.name.toLowerCase()}`
    if (!p.name || !p.teamId || seen.has(key)) continue
    if (knownByTeam[p.teamId]?.has(p.name.toLowerCase())) continue
    seen.add(key)
    newPlayers.push({
      name: p.name,
      teamId: p.teamId,
      teamName: TEAM_NAMES[p.teamId] ?? p.teamId,
      pos: pitcherSet.has(key) ? 'P' : '?',
      uniform: '?',
      isNew: true,
    })
  }

  return NextResponse.json([...staticPlayers, ...newPlayers])
}
