import { IOC_TO_TEAM, KNBSB_NUMERIC_ID_MAP } from '@/lib/teams'

// ── Types ─────────────────────────────────────────────────────────────────────
export type HSGameStatus = 'scheduled' | 'live' | 'final'

export type HSGame = {
  id: string
  startISO: string | null
  homeId: string
  awayId: string
  homeScore: number | null
  awayScore: number | null
  status: HSGameStatus
  gameNumber: number | null
  location: string | null
  ifNecessary?: boolean
}

export type HSSeries = {
  label: string
  teamA: string      // host of game 1 (higher seed / stable ordering)
  teamB: string
  winsA: number
  winsB: number
  bestOf: number
  clinchedBy: string | null
  games: HSGame[]
  nextGame: HSGame | null
}

export type PostseasonData = {
  semifinals: HSSeries[]        // [Play-offs A (1v4), Play-offs B (2v3)]
  final: HSSeries | null        // from the feed, or synthesised from the schedule below
  finalScheduled: boolean       // true when `final` is the published-schedule fallback (not yet in the feed)
  seeds: Record<string, number> // teamId -> playoff seed (1-4)
  updatedAt: string
}
// Back-compat alias for the previous name.
export type HollandSeriesData = PostseasonData

// Holland Series final schedule (not yet in the KNBSB feed). Odd games are hosted
// by the top seed, even games by the runner-up. Used as a fallback until the feed
// publishes the games with live scores.
const FINAL_SCHEDULE = [
  { game: 1, date: '2026-09-05', time: '14:00', venue: 'Rotterdam', topHost: true },
  { game: 2, date: '2026-09-06', time: '14:00', venue: 'Amsterdam', topHost: false },
  { game: 3, date: '2026-09-10', time: '19:30', venue: 'Rotterdam', topHost: true },
  { game: 4, date: '2026-09-12', time: '14:00', venue: 'Amsterdam', topHost: false },
  { game: 5, date: '2026-09-13', time: '13:00', venue: 'Rotterdam', topHost: true, ifNec: true },
  { game: 6, date: '2026-09-19', time: '14:00', venue: 'Amsterdam', topHost: false, ifNec: true },
  { game: 7, date: '2026-09-20', time: '13:00', venue: 'Rotterdam', topHost: true, ifNec: true },
]

// ── Feed parsing ──────────────────────────────────────────────────────────────
const FEED = 'https://boxscore.stenwessel.nl/api/fetchschedule.php?competition=hb2026'

type RawGame = Record<string, unknown>

function teamOf(g: RawGame, side: 'home' | 'away'): string | null {
  const ioc = String(g[`${side}ioc`] ?? '').toUpperCase()
  if (IOC_TO_TEAM[ioc]) return IOC_TO_TEAM[ioc]
  const numId = Number(g[`${side}id`])
  return KNBSB_NUMERIC_ID_MAP[numId] ?? null
}

function statusOf(gs: unknown): HSGameStatus | 'skip' {
  const s = String(gs ?? '')
  if (s === '1') return 'live'
  if (s === '2' || s === '3') return 'final'
  if (Number(gs) < 0) return 'skip'
  return 'scheduled'
}

function scoreOf(v: unknown, status: HSGameStatus): number | null {
  if (status === 'scheduled') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function toHSGame(g: RawGame): HSGame | null {
  const status = statusOf(g.gamestatus)
  if (status === 'skip') return null
  const homeId = teamOf(g, 'home')
  const awayId = teamOf(g, 'away')
  if (!homeId || !awayId) return null
  const gnRaw = Number(g.gamenumber)
  return {
    id: String(g.id),
    startISO: g.start ? String(g.start) : null,
    homeId, awayId,
    homeScore: scoreOf(g.homeruns, status),
    awayScore: scoreOf(g.awayruns, status),
    status,
    gameNumber: Number.isFinite(gnRaw) ? gnRaw : null,
    location: (g.location ? String(g.location) : g.stadium ? String(g.stadium) : null) || null,
  }
}

const sortGames = (a: HSGame, b: HSGame) =>
  (a.startISO && b.startISO) ? a.startISO.localeCompare(b.startISO) : (a.gameNumber ?? 0) - (b.gameNumber ?? 0)

function seriesFrom(label: string, games: HSGame[], forcedBestOf?: number): HSSeries | null {
  if (games.length === 0) return null
  games = [...games].sort(sortGames)
  const teams = [...new Set(games.flatMap(g => [g.homeId, g.awayId]))]
  if (teams.length < 2) return null
  const teamA = games[0].homeId
  const teamB = teams.find(t => t !== teamA) ?? games[0].awayId

  let winsA = 0, winsB = 0
  for (const g of games) {
    if (g.status !== 'final' || g.homeScore == null || g.awayScore == null) continue
    const w = g.homeScore > g.awayScore ? g.homeId : g.awayScore > g.homeScore ? g.awayId : null
    if (w === teamA) winsA++; else if (w === teamB) winsB++
  }
  const bestOf = forcedBestOf ?? (Math.max(0, ...games.map(() => 0)) >= 3 ? 5 : 5)
  const needed = Math.floor(bestOf / 2) + 1
  const clinchedBy = winsA >= needed ? teamA : winsB >= needed ? teamB : null
  const nextGame = games.find(g => g.status === 'live') ?? games.find(g => g.status === 'scheduled') ?? null
  return { label, teamA, teamB, winsA, winsB, bestOf, clinchedBy, games, nextGame }
}

function buildFromRaw(label: string, raw: RawGame[], forcedBestOf?: number): HSSeries | null {
  const games = raw.map(toHSGame).filter((g): g is HSGame => g !== null)
  const bo = forcedBestOf ?? (Math.max(0, ...raw.map(g => Number(g.best_of) || 0)) >= 3 ? Math.max(...raw.map(g => Number(g.best_of) || 0)) : 5)
  return seriesFrom(label, games, bo)
}

const matches = (g: RawGame, re: RegExp) => re.test(String(g.gametypelabel ?? ''))

// Synthesise the final from the known schedule when it isn't in the feed yet.
function scheduledFinal(topSeed: string, runnerUp: string): HSSeries {
  const games: HSGame[] = FINAL_SCHEDULE.map(t => ({
    id: `final-g${t.game}`,
    startISO: `${t.date} ${t.time}:00`,
    homeId: t.topHost ? topSeed : runnerUp,
    awayId: t.topHost ? runnerUp : topSeed,
    homeScore: null, awayScore: null,
    status: 'scheduled' as const,
    gameNumber: t.game,
    location: t.venue,
    ifNecessary: !!t.ifNec,
  }))
  return { label: 'Holland Series', teamA: topSeed, teamB: runnerUp, winsA: 0, winsB: 0, bestOf: 7, clinchedBy: null, games, nextGame: games[0] }
}

export async function getHollandSeries(): Promise<PostseasonData> {
  const updatedAt = new Date().toISOString()
  let games: RawGame[] = []
  try {
    const res = await fetch(FEED, { next: { revalidate: 15 } })
    games = (await res.json())?.games ?? []
  } catch {
    return { semifinals: [], final: null, finalScheduled: false, seeds: {}, updatedAt }
  }

  const semiA = buildFromRaw('Play-offs A', games.filter(g => matches(g, /play-?offs?\s*a/i)), 5)
  const semiB = buildFromRaw('Play-offs B', games.filter(g => matches(g, /play-?offs?\s*b/i)), 5)
  const semifinals = [semiA, semiB].filter((s): s is HSSeries => s !== null)

  // Seeds: Play-offs A is 1v4 (host = seed 1), Play-offs B is 2v3 (host = seed 2).
  const seeds: Record<string, number> = {}
  if (semiA) { seeds[semiA.teamA] = 1; seeds[semiA.teamB] = 4 }
  if (semiB) { seeds[semiB.teamA] = 2; seeds[semiB.teamB] = 3 }

  // Final: prefer the real feed games; otherwise synthesise from the schedule once
  // both semifinals are decided.
  let final = buildFromRaw('Holland Series', games.filter(g => matches(g, /holland|finale/i)), 7)
  let finalScheduled = false
  if (!final) {
    const clinchers = semifinals.map(s => s.clinchedBy).filter((t): t is string => !!t)
    if (clinchers.length === 2) {
      const [top, runner] = [...clinchers].sort((a, b) => (seeds[a] ?? 9) - (seeds[b] ?? 9))
      final = scheduledFinal(top, runner)
      finalScheduled = true
    }
  }

  return { semifinals, final, finalScheduled, seeds, updatedAt }
}
