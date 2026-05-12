import RosterTabs, { type Rosters, type RosterPlayer } from './RosterTabs'

export const revalidate = 86400 // 24 uur cache

const SCHEDULE_URL = 'https://boxscore.stenwessel.nl/api/fetchschedule.php?competition=hb2026'
const GAME_URL     = 'https://boxscore.stenwessel.nl/api/fetchgamedata.php?competition=hb2026&game='

function mapTeamFromIoc(ioc: string): string | null {
  const map: Record<string, string> = {
    TWI: 'twins', NEP: 'neptunus', HCA: 'hcaw',
    KIN: 'kinheim', PIO: 'pioniers', PIR: 'pirates', UVV: 'uvv', AMS: 'pirates',
  }
  return map[ioc] ?? null
}
function mapTeamFromLabel(label: string): string | null {
  const l = (label ?? '').toLowerCase()
  if (l.includes('neptunus'))                           return 'neptunus'
  if (l.includes('pirate') || l.includes('amsterdam')) return 'pirates'
  if (l.includes('kinheim'))                            return 'kinheim'
  if (l.includes('hcaw'))                               return 'hcaw'
  if (l.includes('twin') || l.includes('oosterhout'))  return 'twins'
  if (l.includes('pionier'))                            return 'pioniers'
  if (l.includes('uvv'))                                return 'uvv'
  return null
}

function normalizePos(pos: string, isPitcher: boolean, hasStarted: boolean): string {
  if (!pos) return isPitcher ? (hasStarted ? 'SP' : 'RP') : 'UT'
  // Pinch hitters/runners without a field position
  if (pos === 'PH' || pos === 'PR' || pos === 'EH') return pos
  // Combined positions like PH/LF or SS/3B — take the field position part
  const parts = pos.split('/')
  const fieldPos = parts.find(p => !['PH', 'PR', 'EH'].includes(p)) ?? parts[0]
  if (fieldPos === 'P') return hasStarted ? 'SP' : 'RP'
  return fieldPos
}

async function buildRosters(): Promise<Rosters> {
  try {
    const schedRes  = await fetch(SCHEDULE_URL, { next: { revalidate: 86400 } })
    const schedData = await schedRes.json()
    const allGames: Record<string, unknown>[] = schedData.games ?? []

    // Take last 21 finished games (covers all 7 teams at least 3x)
    const finishedIds = allGames
      .filter(g => String(g.gamestatus) === '2' || String(g.gamestatus) === '3')
      .sort((a, b) => String(b.start ?? '').localeCompare(String(a.start ?? '')))
      .slice(0, 21)
      .map(g => String(g.id))

    // Fetch all boxscores in parallel
    const boxscores = await Promise.all(
      finishedIds.map(id =>
        fetch(GAME_URL + id, { next: { revalidate: 86400 } })
          .then(r => r.json())
          .catch(() => null)
      )
    )

    // Aggregate players per team
    type PlayerAccum = {
      name: string
      uniform: string
      positions: string[]
      isPitcher: boolean
      hasStarted: boolean
    }
    const accumulator: Record<string, Record<string, PlayerAccum>> = {}

    for (const bs of boxscores) {
      if (!bs?.gameData || !bs?.boxScore) continue
      const gd = bs.gameData as Record<string, unknown>

      for (const [bsTeamId, sections] of Object.entries(bs.boxScore as Record<string, unknown>)) {
        if (bsTeamId === 'totals' || bsTeamId === 'pitchers') continue

        const isHome   = String(gd.homeid) === bsTeamId
        const ioc      = String(isHome ? gd.homeioc : gd.awayioc)
        const label    = String(isHome ? gd.homelabel : gd.awaylabel)
        const teamId   = mapTeamFromIoc(ioc) ?? mapTeamFromLabel(label)
        if (!teamId) continue

        if (!accumulator[teamId]) accumulator[teamId] = {}

        for (const players of Object.values(sections as Record<string, unknown>)) {
          if (!Array.isArray(players)) continue
          for (const p of players as Record<string, unknown>[]) {
            const key  = `${p.firstname}_${p.lastname}`
            const name = `${p.lastname} ${p.firstname}`.trim()
            const pos  = String(p.pos ?? '')
            const pitchIp = Number(p.pitch_ip) || 0
            const pitchGs = Number(p.pitch_gs) || 0

            if (!accumulator[teamId][key]) {
              accumulator[teamId][key] = {
                name,
                uniform: String(p.uniform ?? ''),
                positions: [],
                isPitcher: false,
                hasStarted: false,
              }
            }
            const acc = accumulator[teamId][key]
            if (pos) acc.positions.push(pos)
            if (pitchIp > 0) acc.isPitcher = true
            if (pitchGs > 0) acc.hasStarted = true
            // Prefer later uniform (more recent game is more accurate)
            if (p.uniform) acc.uniform = String(p.uniform)
          }
        }
      }
    }

    // Build final rosters with primary position
    const rosters: Rosters = {}
    for (const [teamId, players] of Object.entries(accumulator)) {
      rosters[teamId] = Object.values(players).map(p => {
        // Determine most common position
        const posCount: Record<string, number> = {}
        for (const pos of p.positions) {
          const normalized = normalizePos(pos, p.isPitcher, p.hasStarted)
          posCount[normalized] = (posCount[normalized] ?? 0) + 1
        }
        let primaryPos = p.isPitcher
          ? (p.hasStarted ? 'SP' : 'RP')
          : (Object.entries(posCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'UT')

        // Prefer field positions over PH/PR
        if (['PH', 'PR', 'EH'].includes(primaryPos) && posCount) {
          const fieldPos = Object.entries(posCount)
            .filter(([k]) => !['PH', 'PR', 'EH'].includes(k))
            .sort((a, b) => b[1] - a[1])[0]?.[0]
          if (fieldPos) primaryPos = fieldPos
        }

        return { name: p.name, uniform: p.uniform, primaryPos } as RosterPlayer
      })
    }

    return rosters
  } catch {
    return {}
  }
}

export default async function RostersPage() {
  const rosters = await buildRosters()

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <div>
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">Seizoen 2026</p>
        <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
          <strong>Rosters</strong>
        </h1>
        <p className="font-display font-700 text-[var(--muted)] text-sm mt-2 uppercase tracking-wider">
          Spelers gesorteerd op positie · gebaseerd op recente wedstrijden
        </p>
      </div>
      <RosterTabs rosters={rosters} />
    </div>
  )
}
