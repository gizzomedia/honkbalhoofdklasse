import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import StatsCharts from './StatsCharts'

export const metadata: Metadata = {
  title: 'Team Analytics | Honkbal Hoofdklasse 2026',
  description: 'Visual team analytics for the KNBSB Honkbal Hoofdklasse 2026. Run differential scatter, win percentage rankings, scoring comparison and season leaders.',
  alternates: { canonical: 'https://honkbalhoofdklasse.com/stats' },
  openGraph: {
    title: 'Team Analytics | Honkbal Hoofdklasse 2026',
    description: 'Visual analytics — run differential, win percentage, scoring, and league leaders.',
    url: 'https://honkbalhoofdklasse.com/stats',
  },
}

export const revalidate = 300

export type Standing = {
  team_id: string
  games_played: number
  wins: number
  losses: number
  win_pct: number
  runs_scored: number
  runs_allowed: number
}

export type KnbsbRow = Record<string, unknown>
export type KnbsbCategory = { type: string; label: string; data: KnbsbRow[] }

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
  Origin: 'https://stats.knbsbstats.nl',
}

async function getStandings(): Promise<Standing[]> {
  const { data } = await supabase
    .from('standings')
    .select('team_id, games_played, wins, losses, win_pct, runs_scored, runs_allowed')
    .eq('season', new Date().getFullYear())
    .order('wins', { ascending: false })
    .order('win_pct', { ascending: false })
  return data ?? []
}

async function getLeaders(): Promise<{ batting: KnbsbCategory[]; pitching: KnbsbCategory[] }> {
  try {
    const [batRes, pitRes] = await Promise.all([
      fetch(
        'https://stats.knbsbstats.nl/api/v1/stats/events/2026-lucky-day-hoofdklasse/index?section=leaders&stats-section=batting&round=&team=&split=&language=en',
        { headers: { ...BROWSER_HEADERS, Referer: 'https://stats.knbsbstats.nl/' }, next: { revalidate: 300 } }
      ),
      fetch(
        'https://stats.knbsbstats.nl/api/v1/stats/events/2026-lucky-day-hoofdklasse/index?section=leaders&stats-section=pitching&round=&team=&split=&language=en',
        { headers: { ...BROWSER_HEADERS, Referer: 'https://stats.knbsbstats.nl/' }, next: { revalidate: 300 } }
      ),
    ])
    const [batData, pitData] = await Promise.all([batRes.json(), pitRes.json()])
    return {
      batting: batData.data ?? [],
      pitching: pitData.data ?? [],
    }
  } catch {
    return { batting: [], pitching: [] }
  }
}

export default async function StatsPage() {
  const [standings, leaders] = await Promise.all([getStandings(), getLeaders()])

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
      <div className="mb-10">
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">Season 2026</p>
        <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
          <strong>Analytics</strong>
        </h1>
        <p className="text-[var(--muted)] text-sm mt-3 max-w-xl leading-relaxed">
          Visual team statistics for the Honkbal Hoofdklasse 2026 season. Run differential, scoring output, win percentage and league leaders — updated after every game.
        </p>
      </div>

      <StatsCharts standings={standings} batting={leaders.batting} pitching={leaders.pitching} />
    </div>
  )
}
