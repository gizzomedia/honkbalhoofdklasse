import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import LeadersTabs, { type TabData, type SeasonLeaders } from './LeadersTabs'

export const metadata: Metadata = {
  title: 'League Leaders 2026',
  description: 'Statistieken leaders van de Honkbal Hoofdklasse 2026. Top batters en pitchers per categorie.',
  alternates: { canonical: 'https://honkbalhoofdklasse.com/leaders' },
}

export const revalidate = 300

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
  'Origin': 'https://stats.knbsbstats.nl',
}

async function getSeasonLeaders(): Promise<SeasonLeaders> {
  try {
    const [batRes, pitRes] = await Promise.all([
      fetch(
        'https://stats.knbsbstats.nl/api/v1/stats/events/2026-lucky-day-hoofdklasse/index?section=leaders&stats-section=batting&round=&team=&split=&language=en',
        { headers: { ...BROWSER_HEADERS, Referer: 'https://stats.knbsbstats.nl/events/2026-lucky-day-hoofdklasse/stats/leaders/batting' }, next: { revalidate: 300 } }
      ),
      fetch(
        'https://stats.knbsbstats.nl/api/v1/stats/events/2026-lucky-day-hoofdklasse/index?section=leaders&stats-section=pitching&round=&team=&split=&language=en',
        { headers: { ...BROWSER_HEADERS, Referer: 'https://stats.knbsbstats.nl/events/2026-lucky-day-hoofdklasse/stats/leaders/pitching' }, next: { revalidate: 300 } }
      ),
    ])
    return {
      batting: (await batRes.json()).data ?? [],
      pitching: (await pitRes.json()).data ?? [],
    }
  } catch {
    return { batting: [], pitching: [] }
  }
}

async function getLatestSeriesWeek(): Promise<string | null> {
  const { data } = await supabase
    .from('batting_stats')
    .select('series_week')
    .eq('season', new Date().getFullYear())
    .neq('series_week', 'season')
    .order('series_week', { ascending: false })
    .limit(1)
  return data?.[0]?.series_week ?? null
}

async function getSerieData(seriesWeek: string): Promise<TabData> {
  const [{ data: batters }, { data: pitchers }] = await Promise.all([
    supabase
      .from('batting_stats')
      .select('full_name, team_id, at_bats, hits, home_runs, rbi, stolen_bases, avg, obp, slg, ops')
      .eq('season', new Date().getFullYear())
      .eq('series_week', seriesWeek)
      .gte('at_bats', 1)
      .order('avg', { ascending: false })
      .limit(30),
    supabase
      .from('pitching_stats')
      .select('full_name, team_id, innings_pitched, strikeouts, wins, saves, hits_allowed, walks, earned_runs')
      .eq('season', new Date().getFullYear())
      .eq('series_week', seriesWeek)
      .gte('innings_pitched', 0.1)
      .order('strikeouts', { ascending: false })
      .limit(30),
  ])
  return {
    batters: (batters ?? []) as Record<string, unknown>[],
    pitchers: (pitchers ?? []) as Record<string, unknown>[],
  }
}

function formatSeriesLabel(seriesWeek: string): string {
  const d = new Date(seriesWeek + 'T12:00:00')
  return `Series ${d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`
}

export default async function LeadersPage() {
  const seriesWeek = await getLatestSeriesWeek()
  const [season, week] = await Promise.all([
    getSeasonLeaders(),
    seriesWeek ? getSerieData(seriesWeek) : Promise.resolve(null),
  ])
  const seriesLabel = seriesWeek ? formatSeriesLabel(seriesWeek) : null

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <div>
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">Season 2026</p>
        <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
          <strong>League</strong>
          <span className="text-[var(--accent)]"> Leaders</span>
        </h1>
      </div>
      <LeadersTabs week={week} season={season} seriesLabel={seriesLabel} />
    </div>
  )
}
