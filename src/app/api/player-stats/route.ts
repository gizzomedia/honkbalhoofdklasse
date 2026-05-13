import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'nl-NL,nl;q=0.9',
  'Origin': 'https://stats.knbsbstats.nl',
}

const EVENT = '2026-lucky-day-hoofdklasse'

// Fetch all players from a KNBSB stats section (batting or pitching)
async function fetchAllKnbsbStats(section: 'batting' | 'pitching'): Promise<Record<string, unknown>[]> {
  const urls = [
    // All-player stats endpoint
    `https://stats.knbsbstats.nl/api/v1/stats/events/${EVENT}/index?section=${section}&round=&team=&split=&language=en`,
    // Leaders fallback (has top players per category)
    `https://stats.knbsbstats.nl/api/v1/stats/events/${EVENT}/index?section=leaders&stats-section=${section}&round=&team=&split=&language=en`,
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { ...BROWSER_HEADERS, Referer: `https://stats.knbsbstats.nl/events/${EVENT}/stats/${section}` },
        next: { revalidate: 300 },
      })
      if (!res.ok) continue
      const json = await res.json()

      // All-players endpoint returns data array directly
      if (Array.isArray(json.data) && json.data.length > 0 && !json.data[0]?.type) {
        return json.data as Record<string, unknown>[]
      }
      // Leaders endpoint returns categories with nested data
      if (Array.isArray(json.data) && json.data[0]?.type) {
        const all: Record<string, unknown>[] = []
        for (const cat of json.data as { data: Record<string, unknown>[] }[]) {
          for (const p of cat.data ?? []) {
            const key = `${p.firstname}_${p.lastname}`
            if (!all.find(x => `${x.firstname}_${x.lastname}` === key)) {
              all.push(p)
            }
          }
        }
        return all
      }
    } catch { /* try next */ }
  }
  return []
}

function matchPlayer(players: Record<string, unknown>[], name: string): Record<string, unknown> | null {
  const parts = name.trim().split(/\s+/)
  const firstName = parts[0].toLowerCase()
  const lastName  = parts.slice(1).join(' ').toLowerCase()

  // Exact last name match first
  let found = players.find(p => String(p.lastname ?? '').toLowerCase() === lastName)
  if (found) return found

  // Last word match (for compound surnames)
  const lastWord = parts.at(-1)!.toLowerCase()
  found = players.find(p => String(p.lastname ?? '').toLowerCase() === lastWord)
  if (found) return found

  // First + last combined
  found = players.find(p =>
    String(p.firstname ?? '').toLowerCase().startsWith(firstName.slice(0, 3)) &&
    String(p.lastname ?? '').toLowerCase() === lastWord
  )
  return found ?? null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name') ?? ''
  const type = searchParams.get('type') === 'pitching' ? 'pitching' : 'batting'

  if (!name.trim()) return NextResponse.json({ seasonStats: null, seriesLog: [], photos: null })

  // Fetch all players from KNBSB
  const allPlayers = await fetchAllKnbsbStats(type)
  const matched = matchPlayer(allPlayers, name)

  // Merge stats across all categories if using leaders endpoint
  let seasonStats: Record<string, unknown> | null = matched ?? null

  // Series log from Supabase
  const lastWord = name.trim().split(/\s+/).at(-1) ?? ''
  const table  = type === 'pitching' ? 'pitching_stats' : 'batting_stats'
  const select = type === 'pitching'
    ? 'series_week, innings_pitched, earned_runs, strikeouts, walks, wins, losses, saves, hits_allowed'
    : 'series_week, at_bats, hits, home_runs, rbi, stolen_bases, avg, obp, slg, ops'

  const { data: seriesLog } = await supabase
    .from(table)
    .select(select)
    .eq('season', 2026)
    .ilike('full_name', `%${lastWord}%`)
    .neq('series_week', 'season')
    .order('series_week', { ascending: true })

  const { data: photos } = await supabase
    .from('player_photos')
    .select('banner_url, headshot_url')
    .ilike('player_name', name.trim())
    .maybeSingle()

  return NextResponse.json({ seasonStats, seriesLog: seriesLog ?? [], photos: photos ?? null })
}
