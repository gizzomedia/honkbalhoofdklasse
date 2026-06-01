import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import LeadersTabs, { type TabData, type SeasonLeaders } from './LeadersTabs'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function ipToOuts(v: unknown): number {
  const s = String(v ?? '0').trim()
  if (!s || s === '0') return 0
  if (s.includes('.')) {
    const [full, frac] = s.split('.').map(n => parseInt(n, 10) || 0)
    return full * 3 + Math.min(frac, 2)
  }
  return parseInt(s, 10) || 0
}

function outsToIp(outs: number): string {
  return `${Math.floor(outs / 3)}.${outs % 3}`
}

export const metadata: Metadata = {
  title: 'Honkbal Hoofdklasse Statistieken 2026 | League Leaders',
  description: 'Statistieken van de KNBSB Honkbal Hoofdklasse 2026. Batting average, home runs, RBI, ERA en meer per speler. Top batters en pitchers van Nederland.',
  alternates: { canonical: 'https://honkbalhoofdklasse.com/leaders' },
  openGraph: {
    title: 'Honkbal Hoofdklasse Statistieken 2026',
    description: 'Statistieken — batting, pitching, league leaders.',
    url: 'https://honkbalhoofdklasse.com/leaders',
  },
}

export const dynamic = 'force-dynamic'

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
        { headers: { ...BROWSER_HEADERS, Referer: 'https://stats.knbsbstats.nl/events/2026-lucky-day-hoofdklasse/stats/leaders/batting' }, cache: 'no-store' }
      ),
      fetch(
        'https://stats.knbsbstats.nl/api/v1/stats/events/2026-lucky-day-hoofdklasse/index?section=leaders&stats-section=pitching&round=&team=&split=&language=en',
        { headers: { ...BROWSER_HEADERS, Referer: 'https://stats.knbsbstats.nl/events/2026-lucky-day-hoofdklasse/stats/leaders/pitching' }, cache: 'no-store' }
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
  const { data } = await supabaseAdmin
    .from('batting_stats')
    .select('series_week')
    .eq('season', new Date().getFullYear())
    .neq('series_week', 'season')
    .order('series_week', { ascending: false })
    .limit(1)
  return data?.[0]?.series_week ?? null
}

async function getAvailableMonths(): Promise<string[]> {
  try {
    const { data } = await supabaseAdmin
      .from('batting_stats')
      .select('series_week')
      .eq('season', new Date().getFullYear())
      .neq('series_week', 'season')
      .order('series_week', { ascending: true })
    const months = new Set<string>()
    for (const r of (data ?? [])) {
      const sw = String(r.series_week ?? '')
      if (sw.length >= 7 && sw[4] === '-') months.add(sw.slice(0, 7))
    }
    // Always include current month
    const now = new Date()
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    months.add(cur)
    return [...months].sort()
  } catch {
    const now = new Date()
    return [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`]
  }
}

async function getGamesInMonth(prefix: string): Promise<number> {
  try {
    const res = await fetch('https://boxscore.stenwessel.nl/api/fetchschedule.php?competition=hb2026', { cache: 'no-store' })
    const json = await res.json()
    const games: Array<{ start?: string; gamestatus?: number }> = json?.games ?? []
    // Count finished games in this month, divide by 2 (each game involves 2 teams)
    const finished = games.filter(g => g.start?.startsWith(prefix) && (g.gamestatus === 2 || g.gamestatus === 3))
    return Math.round(finished.length * 2 / 7) // approx games per team
  } catch {
    return 6 // fallback: ~6 games per month
  }
}

async function getMonthData(monthPrefix?: string): Promise<TabData> {
  try {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const prefix = monthPrefix ?? `${year}-${String(month).padStart(2, '0')}`
  const [prefixYear, prefixMonth] = prefix.split('-').map(Number)
  const nextMonth = prefixMonth === 12 ? 1 : prefixMonth + 1
  const nextYear = prefixMonth === 12 ? prefixYear + 1 : prefixYear
  const nextPrefix = `${nextYear}-${String(nextMonth).padStart(2, '0')}`

  const [{ data: batRows }, { data: pitRows }, gamesInMonth] = await Promise.all([
    supabaseAdmin
      .from('batting_stats')
      .select('full_name, team_id, at_bats, hits, home_runs, rbi, stolen_bases')
      .eq('season', year)
      .neq('series_week', 'season')
      .gte('series_week', `${prefix}-01`)
      .lt('series_week', `${nextPrefix}-01`),
    supabaseAdmin
      .from('pitching_stats')
      .select('full_name, team_id, innings_pitched, strikeouts, wins, saves, hits_allowed, walks, earned_runs')
      .eq('season', year)
      .neq('series_week', 'season')
      .gte('series_week', `${prefix}-01`)
      .lt('series_week', `${nextPrefix}-01`),
    getGamesInMonth(prefix),
  ])
  // 2.7 PA/G minimum for rate stats (same rule as KNBSB season leaders)
  // PA ≈ AB for most players; using AB as proxy
  const minAb = Math.max(5, Math.ceil(2.7 * gamesInMonth))
  // Pitchers: 1 IP per game minimum
  const minOuts = Math.max(3, gamesInMonth * 3)

  // Aggregate batting by player
  const batMap = new Map<string, { full_name: string; team_id: string; at_bats: number; hits: number; home_runs: number; rbi: number; stolen_bases: number }>()
  for (const r of (batRows ?? [])) {
    const key = `${r.full_name}|${r.team_id}`
    const e = batMap.get(key) ?? { full_name: r.full_name, team_id: r.team_id, at_bats: 0, hits: 0, home_runs: 0, rbi: 0, stolen_bases: 0 }
    e.at_bats += r.at_bats ?? 0
    e.hits += r.hits ?? 0
    e.home_runs += r.home_runs ?? 0
    e.rbi += r.rbi ?? 0
    e.stolen_bases += r.stolen_bases ?? 0
    batMap.set(key, e)
  }
  const batters = [...batMap.values()]
    .filter(p => p.at_bats >= minAb)
    .map(p => ({ ...p, avg: p.at_bats > 0 ? p.hits / p.at_bats : null, obp: null, slg: null, ops: null }))
    .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0)) as Record<string, unknown>[]

  // Aggregate pitching by player
  const pitMap = new Map<string, { full_name: string; team_id: string; outs: number; strikeouts: number; wins: number; saves: number; hits_allowed: number; walks: number; earned_runs: number }>()
  for (const r of (pitRows ?? [])) {
    const key = `${r.full_name}|${r.team_id}`
    const e = pitMap.get(key) ?? { full_name: r.full_name, team_id: r.team_id, outs: 0, strikeouts: 0, wins: 0, saves: 0, hits_allowed: 0, walks: 0, earned_runs: 0 }
    e.outs += ipToOuts(r.innings_pitched)
    e.strikeouts += r.strikeouts ?? 0
    e.wins += r.wins ?? 0
    e.saves += r.saves ?? 0
    e.hits_allowed += r.hits_allowed ?? 0
    e.walks += r.walks ?? 0
    e.earned_runs += r.earned_runs ?? 0
    pitMap.set(key, e)
  }
  const pitchers = [...pitMap.values()]
    .filter(p => p.outs >= minOuts)
    .map(({ outs, ...rest }) => ({ ...rest, innings_pitched: outsToIp(outs) }))
    .sort((a, b) => b.strikeouts - a.strikeouts) as Record<string, unknown>[]

  return { batters, pitchers }
  } catch {
    return { batters: [], pitchers: [] }
  }
}

async function getSerieData(seriesWeek: string): Promise<TabData> {
  const [{ data: batters }, { data: pitchers }] = await Promise.all([
    supabaseAdmin
      .from('batting_stats')
      .select('full_name, team_id, at_bats, hits, home_runs, rbi, stolen_bases, avg, obp, slg, ops')
      .eq('season', new Date().getFullYear())
      .eq('series_week', seriesWeek)
      .gte('at_bats', 1)
      .order('avg', { ascending: false })
      .limit(30),
    supabaseAdmin
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

export default async function LeadersPage() {
  const seriesWeek = await getLatestSeriesWeek()
  const now = new Date()
  const monthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`

  const [season, week, month, availableMonths] = await Promise.all([
    getSeasonLeaders(),
    seriesWeek ? getSerieData(seriesWeek) : Promise.resolve(null),
    getMonthData(),
    getAvailableMonths(),
  ])
  const seriesLabel = seriesWeek ? 'This Series' : null

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <div>
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">Season 2026</p>
        <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
          <strong>League</strong>
          <span className="text-[var(--accent)]"> Leaders</span>
        </h1>
        <p className="text-[var(--muted)] text-sm mt-3 max-w-xl leading-relaxed">
          Statistical leaders for the Honkbal Hoofdklasse 2026 season. Rankings cover batting average, home runs, RBI, stolen bases, ERA, strikeouts and more — sourced from the KNBSB stats system (stats.knbsbstats.nl).
        </p>
      </div>
      <LeadersTabs week={week} season={season} seriesLabel={seriesLabel} month={month} monthLabel={monthLabel} availableMonths={availableMonths} />
    </div>
  )
}
