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
}

export type HSSeries = {
  label: string
  teamA: string      // host of game 1 (stable ordering)
  teamB: string
  winsA: number
  winsB: number
  bestOf: number
  clinchedBy: string | null
  games: HSGame[]
  nextGame: HSGame | null
}

export type HollandSeriesData = {
  phase: 'final' | 'pre-final' | 'none'
  final: HSSeries | null
  semifinals: HSSeries[]
  finalists: string[] | null   // set once both semifinals are clinched, before the final is scheduled
  updatedAt: string
}

// ── Feed parsing ──────────────────────────────────────────────────────────────
const FEED = 'https://boxscore.stenwessel.nl/api/fetchschedule.php?competition=hb2026'

type RawGame = Record<string, unknown>

function teamOf(g: RawGame, side: 'home' | 'away'): string | null {
  const ioc = String(g[`${side}ioc`] ?? '').toUpperCase()
  if (IOC_TO_TEAM[ioc]) return IOC_TO_TEAM[ioc]
  const numId = Number(g[`${side}id`])
  return KNBSB_NUMERIC_ID_MAP[numId] ?? null
}

// Returns 'skip' for cancelled / not-needed games (negative status codes).
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
    homeId,
    awayId,
    homeScore: scoreOf(g.homeruns, status),
    awayScore: scoreOf(g.awayruns, status),
    status,
    gameNumber: Number.isFinite(gnRaw) ? gnRaw : null,
    location: (g.location ? String(g.location) : g.stadium ? String(g.stadium) : null) || null,
  }
}

function sortGames(a: HSGame, b: HSGame): number {
  if (a.startISO && b.startISO) return a.startISO.localeCompare(b.startISO)
  return (a.gameNumber ?? 0) - (b.gameNumber ?? 0)
}

function buildSeries(label: string, raw: RawGame[]): HSSeries | null {
  const games = raw.map(toHSGame).filter((g): g is HSGame => g !== null).sort(sortGames)
  if (games.length === 0) return null

  // Stable ordering: the host of game 1 is teamA. Falls back to alphabetical if
  // game 1 can't be identified, so the scoreboard sides never swap mid-series.
  const first = games[0]
  const teams = [...new Set(games.flatMap(g => [g.homeId, g.awayId]))]
  if (teams.length < 2) return null
  const teamA = first.homeId
  const teamB = teams.find(t => t !== teamA) ?? first.awayId

  let winsA = 0
  let winsB = 0
  for (const g of games) {
    if (g.status !== 'final' || g.homeScore == null || g.awayScore == null) continue
    const winner = g.homeScore > g.awayScore ? g.homeId : g.awayScore > g.homeScore ? g.awayId : null
    if (winner === teamA) winsA++
    else if (winner === teamB) winsB++
  }

  const bestOfRaw = Math.max(0, ...raw.map(g => Number(g.best_of) || 0))
  const bestOf = bestOfRaw >= 3 ? bestOfRaw : 5 // playoffs & Holland Series are best-of-5
  const needed = Math.floor(bestOf / 2) + 1
  const clinchedBy = winsA >= needed ? teamA : winsB >= needed ? teamB : null

  const nextGame = games.find(g => g.status === 'live')
    ?? games.find(g => g.status === 'scheduled')
    ?? null

  return { label, teamA, teamB, winsA, winsB, bestOf, clinchedBy, games, nextGame }
}

const matches = (g: RawGame, re: RegExp) => re.test(String(g.gametypelabel ?? ''))

export async function getHollandSeries(): Promise<HollandSeriesData> {
  const updatedAt = new Date().toISOString()
  let games: RawGame[] = []
  try {
    const res = await fetch(FEED, { next: { revalidate: 15 } })
    games = (await res.json())?.games ?? []
  } catch {
    return { phase: 'none', final: null, semifinals: [], finalists: null, updatedAt }
  }

  const finalGames = games.filter(g => matches(g, /holland|finale/i))
  if (finalGames.length > 0) {
    const final = buildSeries('Holland Series', finalGames)
    if (final) return { phase: 'final', final, semifinals: [], finalists: null, updatedAt }
  }

  const semifinals = [
    buildSeries('Play-offs A', games.filter(g => matches(g, /play-?offs?\s*a/i))),
    buildSeries('Play-offs B', games.filter(g => matches(g, /play-?offs?\s*b/i))),
  ].filter((s): s is HSSeries => s !== null)

  // Both brackets decided but the final isn't in the feed yet → announce the matchup.
  const clinchers = semifinals.map(s => s.clinchedBy).filter((t): t is string => !!t)
  const finalists = clinchers.length === 2 ? clinchers : null

  return {
    phase: semifinals.length > 0 ? 'pre-final' : 'none',
    final: null,
    semifinals,
    finalists,
    updatedAt,
  }
}
