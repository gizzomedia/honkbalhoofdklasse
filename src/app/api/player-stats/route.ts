import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'nl-NL,nl;q=0.9',
  'Origin': 'https://stats.knbsbstats.nl',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name') ?? ''
  const type = searchParams.get('type') === 'pitching' ? 'pitching' : 'batting'

  const nameParts = name.trim().split(/\s+/)
  const lastWord = nameParts.at(-1)?.toUpperCase() ?? ''
  const fullLastPart = nameParts.slice(1).join(' ').toUpperCase() // "VAN DER MEER" for "Stijn van der Meer"
  if (!lastWord) return NextResponse.json({ seasonStats: null, seriesLog: [] })

  let seasonStats: Record<string, unknown> | null = null
  try {
    const section = type === 'pitching' ? 'pitching' : 'batting'
    const res = await fetch(
      `https://stats.knbsbstats.nl/api/v1/stats/events/2026-lucky-day-hoofdklasse/index?section=leaders&stats-section=${section}&round=&team=&split=&language=en`,
      {
        headers: {
          ...BROWSER_HEADERS,
          Referer: `https://stats.knbsbstats.nl/events/2026-lucky-day-hoofdklasse/stats/leaders/${section}`,
        },
        next: { revalidate: 300 },
      }
    )
    const data = await res.json()
    const categories: Array<{ type: string; data: Record<string, unknown>[] }> = data.data ?? []
    for (const cat of categories) {
      const found = cat.data.find((p: Record<string, unknown>) => {
        const knbsbLast = String(p.lastname ?? '').toUpperCase()
        return (
          knbsbLast === lastWord ||
          knbsbLast === fullLastPart ||
          knbsbLast.endsWith(' ' + lastWord)
        )
      })
      if (found) { seasonStats = found; break }
    }
  } catch { /* ignore */ }

  const table = type === 'pitching' ? 'pitching_stats' : 'batting_stats'
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
