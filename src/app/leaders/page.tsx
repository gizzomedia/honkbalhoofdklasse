import type { Metadata } from 'next'
import { IOC_TO_TEAM } from '@/lib/teams'
import LeadersTabs, { type TabData, type SeasonLeaders } from './LeadersTabs'

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

export const revalidate = 300

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
  'Origin': 'https://stats.knbsbstats.nl',
}

// ── Season leaders from KNBSB API ─────────────────────────────────────────────

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

// ── Current series stats from stenwessel boxscores ────────────────────────────

type RawPlayer = Record<string, unknown>

function n(v: unknown): number {
  const x = Number(v)
  return isNaN(x) ? 0 : x
}

// Converts pitch_ip to total outs — handles both "6.2" display format and raw outs integer.
function ipToOuts(v: unknown): number {
  const raw = String(v ?? '').trim()
  if (!raw || raw === '0' || raw === '0.0') return 0
  if (raw.includes('.')) {
    const [full, partial] = raw.split('.').map(s => Number(s) || 0)
    return (full ?? 0) * 3 + (partial ?? 0)
  }
  const num = Number(raw)
  return isNaN(num) ? 0 : num
}

function mapTeam(ioc: string, label: string): string | null {
  const fromIoc = IOC_TO_TEAM[ioc]
  if (fromIoc) return fromIoc
  const l = label.toLowerCase()
  if (l.includes('neptunus')) return 'neptunus'
  if (l.includes('pirate') || l.includes('amsterdam')) return 'pirates'
  if (l.includes('kinheim')) return 'kinheim'
  if (l.includes('hcaw')) return 'hcaw'
  if (l.includes('twin') || l.includes('oosterhout')) return 'twins'
  if (l.includes('pionier')) return 'pioniers'
  if (l.includes('uvv')) return 'uvv'
  return null
}

function collectPlayers(v: unknown, slot: number, out: RawPlayer[]): void {
  if (!v || typeof v !== 'object') return
  if (Array.isArray(v)) {
    for (const item of v) {
      if (item && typeof item === 'object' && (item as RawPlayer).firstname)
        out.push({ ...(item as RawPlayer), _slot: slot })
      else collectPlayers(item, slot, out)
    }
  } else {
    for (const val of Object.values(v as Record<string, unknown>))
      collectPlayers(val, slot, out)
  }
}

function getTeamPlayers(boxScore: Record<string, unknown>, teamId: unknown): RawPlayer[] {
  const team = boxScore[String(teamId)] as Record<string, unknown> | undefined
  if (!team) return []
  const slots: [number, RawPlayer[]][] = []
  const extra: RawPlayer[] = []
  for (const [key, section] of Object.entries(team)) {
    const slot = parseInt(key, 10)
    if (!isNaN(slot)) {
      const bucket: RawPlayer[] = []
      collectPlayers(section, slot, bucket)
      if (bucket.length) slots.push([slot, bucket])
    } else {
      collectPlayers(section, 0, extra)
    }
  }
  slots.sort((a, b) => a[0] - b[0])
  return [...slots.flatMap(([, ps]) => ps), ...extra]
}

async function fetchCurrentSeriesStats(): Promise<TabData | null> {
  try {
    const schedRes = await fetch(
      'https://boxscore.stenwessel.nl/api/fetchschedule.php?competition=hb2026',
      { next: { revalidate: 300 } }
    )
    if (!schedRes.ok) return null
    const schedData = await schedRes.json()

    type SteGame = { id: number; gamestatus: number; start: string; homeioc: string; awayioc: string; homelabel?: string; awaylabel?: string }
    const allGames: SteGame[] = schedData?.games ?? []

    // Series starts on Thursday — find the most recent Thursday at midnight.
    const now = new Date()
    const dow = now.getDay() // 0=Sun … 4=Thu … 6=Sat
    const daysBack = (dow + 3) % 7  // Thu→0 Fri→1 Sat→2 Sun→3 Mon→4 Tue→5 Wed→6
    const seriesStart = new Date(now)
    seriesStart.setDate(now.getDate() - daysBack)
    seriesStart.setHours(0, 0, 0, 0)

    // Final games (gamestatus 2 or 3) played since this series started.
    const seriesGames = allGames.filter(g => {
      const gameDate = new Date(g.start)
      return gameDate >= seriesStart && (g.gamestatus === 2 || g.gamestatus === 3)
    })

    if (!seriesGames.length) return null

    // Fetch all boxscores in parallel.
    const results = await Promise.allSettled(
      seriesGames.map(g =>
        fetch(
          `https://boxscore.stenwessel.nl/api/fetchgamedata.php?competition=hb2026&game=${g.id}`,
          { next: { revalidate: 300 } }
        ).then(r => r.json())
      )
    )

    type BatterAgg  = { full_name: string; team_id: string; at_bats: number; hits: number; home_runs: number; rbi: number; stolen_bases: number }
    type PitcherAgg = { full_name: string; team_id: string; ip_outs: number; strikeouts: number; wins: number; saves: number; hits_allowed: number; walks: number; earned_runs: number }

    const batterMap  = new Map<string, BatterAgg>()
    const pitcherMap = new Map<string, PitcherAgg>()

    for (const result of results) {
      if (result.status !== 'fulfilled' || !result.value) continue
      const { gameData: gd, boxScore } = result.value as { gameData: Record<string, unknown>; boxScore: Record<string, unknown> }
      if (!gd || !boxScore) continue

      for (const side of [
        { teamId: gd.awayid, ioc: String(gd.awayioc ?? ''), label: String(gd.awaylabel ?? '') },
        { teamId: gd.homeid, ioc: String(gd.homeioc ?? ''), label: String(gd.homelabel ?? '') },
      ]) {
        const teamId = mapTeam(side.ioc, side.label)
        if (!teamId) continue

        const players = getTeamPlayers(boxScore, side.teamId)
        const seen = new Set<string>()

        for (const p of players) {
          if (!p.firstname) continue
          const fullName = `${p.firstname} ${p.lastname}`
          if (seen.has(fullName)) continue
          seen.add(fullName)

          const key = `${teamId}:${fullName}`
          const pos = String(p.pos ?? '').toUpperCase()

          // Batting (exclude pitchers)
          const hasPA = n(p.ab) > 0 || n(p.bb) > 0 || n(p.hbp) > 0 || n(p.r) > 0 || n(p.rbi) > 0
          if (hasPA && pos !== 'P') {
            const cur = batterMap.get(key) ?? { full_name: fullName, team_id: teamId, at_bats: 0, hits: 0, home_runs: 0, rbi: 0, stolen_bases: 0 }
            cur.at_bats  += n(p.ab)
            cur.hits     += n(p.h)
            cur.home_runs += n(p.hr)
            cur.rbi      += n(p.rbi)
            batterMap.set(key, cur)
          }

          // Pitching
          const hasPitched = n(p.pitch_appear) > 0 || n(p.pitch_ip) > 0
          if (hasPitched) {
            const cur = pitcherMap.get(key) ?? { full_name: fullName, team_id: teamId, ip_outs: 0, strikeouts: 0, wins: 0, saves: 0, hits_allowed: 0, walks: 0, earned_runs: 0 }
            cur.ip_outs    += ipToOuts(p.pitch_ip)
            cur.strikeouts += n(p.pitch_so)
            cur.wins       += n(p.pitch_win)
            cur.saves      += n(p.pitch_save)
            cur.hits_allowed += n(p.pitch_h)
            cur.walks      += n(p.pitch_bb)
            cur.earned_runs += n(p.pitch_er)
            pitcherMap.set(key, cur)
          }
        }
      }
    }

    const batters = [...batterMap.values()]
      .filter(b => b.at_bats >= 1)
      .map(b => ({
        full_name:     b.full_name,
        team_id:       b.team_id,
        at_bats:       b.at_bats,
        hits:          b.hits,
        home_runs:     b.home_runs,
        rbi:           b.rbi,
        stolen_bases:  b.stolen_bases,
        avg:           b.at_bats > 0 ? Number((b.hits / b.at_bats).toFixed(3)) : null,
        obp:           null,
        slg:           null,
        ops:           null,
      }))
      .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))

    const pitchers = [...pitcherMap.values()]
      .filter(p => p.ip_outs > 0)
      .map(p => ({
        full_name:       p.full_name,
        team_id:         p.team_id,
        innings_pitched: `${Math.floor(p.ip_outs / 3)}.${p.ip_outs % 3}`,
        strikeouts:      p.strikeouts,
        wins:            p.wins,
        saves:           p.saves,
        hits_allowed:    p.hits_allowed,
        walks:           p.walks,
        earned_runs:     p.earned_runs,
      }))
      .sort((a, b) => b.strikeouts - a.strikeouts)

    return { batters, pitchers }
  } catch (e) {
    console.error('[fetchCurrentSeriesStats]', e)
    return null
  }
}

export default async function LeadersPage() {
  const [season, week] = await Promise.all([
    getSeasonLeaders(),
    fetchCurrentSeriesStats(),
  ])
  const seriesLabel = week ? 'This Series' : null

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
      <LeadersTabs week={week} season={season} seriesLabel={seriesLabel} />
    </div>
  )
}
