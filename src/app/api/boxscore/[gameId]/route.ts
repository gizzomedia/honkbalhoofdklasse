import { NextResponse } from 'next/server'

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
function mapTeamFromIoc(ioc: string): string | null {
  const map: Record<string, string> = {
    TWI: 'twins', NEP: 'neptunus', HCA: 'hcaw',
    KIN: 'kinheim', PIO: 'pioniers', PIR: 'pirates', UVV: 'uvv', AMS: 'pirates',
  }
  return map[ioc] ?? null
}
function formatPitcherName(fullName: string): string {
  const parts = (fullName ?? '').split(' ')
  if (parts.length < 2) return fullName
  const lastName  = parts[0]
  const firstName = parts.slice(1).join(' ')
  const lastCap   = lastName.charAt(0) + lastName.slice(1).toLowerCase()
  return `${firstName} ${lastCap}`
}

function n(v: unknown): number {
  const x = Number(v)
  return isNaN(x) ? 0 : x
}

function ipToString(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '0.0'
  const str = String(raw)
  if (str.includes('.')) return str
  const num = Number(str)
  if (isNaN(num) || num === 0) return '0.0'
  return `${Math.floor(num / 3)}.${num % 3}`
}

type RawPlayer = Record<string, unknown>

export type BatterStat = {
  name: string; pos: string
  ab: number; h: number; r: number; rbi: number
  bb: number; so: number; hr: number; double: number; triple: number
}

export type PitcherStat = {
  name: string
  ip: string; h: number; r: number; er: number; bb: number; so: number
  win: boolean; loss: boolean; save: boolean
}

function extractBatters(players: RawPlayer[]): BatterStat[] {
  const seen = new Set<string>()
  const result: BatterStat[] = []
  for (const p of players) {
    if (!p.firstname) continue
    const name = `${p.firstname} ${p.lastname}`
    if (seen.has(name)) continue
    seen.add(name)
    // skip pitchers that never batted
    if (n(p.ab) === 0 && n(p.h) === 0 && n(p.r) === 0 && n(p.rbi) === 0) continue
    result.push({
      name,
      pos:    String(p.pos ?? ''),
      ab:     n(p.ab),
      h:      n(p.h),
      r:      n(p.r),
      rbi:    n(p.rbi),
      bb:     n(p.bb),
      so:     n(p.so),
      hr:     n(p.hr),
      double: n(p.double),
      triple: n(p.triple),
    })
  }
  return result
}

function extractPitchers(players: RawPlayer[]): PitcherStat[] {
  const seen = new Set<string>()
  const result: PitcherStat[] = []
  for (const p of players) {
    if (!p.firstname) continue
    const name = `${p.firstname} ${p.lastname}`
    if (seen.has(name)) continue
    seen.add(name)
    if (n(p.pitch_appear) === 0 && n(p.pitch_ip) === 0) continue
    result.push({
      name,
      ip:   ipToString(p.pitch_ip),
      h:    n(p.pitch_h),
      r:    n(p.pitch_r),
      er:   n(p.pitch_er),
      bb:   n(p.pitch_bb),
      so:   n(p.pitch_so),
      win:  n(p.pitch_win) > 0,
      loss: n(p.pitch_loss) > 0,
      save: n(p.pitch_save) > 0,
    })
  }
  return result
}

function getTeamPlayers(boxScore: Record<string, unknown>, teamId: string | number): RawPlayer[] {
  const team = boxScore[String(teamId)] as Record<string, unknown> | undefined
  if (!team) return []
  const players: RawPlayer[] = []
  for (const section of Object.values(team)) {
    if (!Array.isArray(section)) continue
    for (const p of section) {
      if (p && typeof p === 'object' && (p as RawPlayer).firstname) {
        players.push(p as RawPlayer)
      }
    }
  }
  return players
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params
  try {
    const res  = await fetch(
      `https://boxscore.stenwessel.nl/api/fetchgamedata.php?competition=hb2026&game=${gameId}`,
      { next: { revalidate: 0 } }
    )
    const data = await res.json()
    const gd        = data.gameData as Record<string, unknown>
    const boxScore  = data.boxScore as Record<string, unknown>
    const pitchers  = (boxScore as Record<string, unknown>)?.pitchers as Record<string, { fullName: string; era: number }> | undefined

    // Determine game length
    let lastInning = 9
    for (let i = 20; i > 9; i--) {
      if (Number(gd[`runsaway${i}`]) > 0 || Number(gd[`runshome${i}`]) > 0) {
        lastInning = i; break
      }
    }

    const startInning    = Math.max(1, lastInning - 8)
    const displayInnings = Array.from({ length: 9 }, (_, i) => startInning + i)

    const homeBattedInnings = Number(gd.innings ?? 9)
    const homeWon = Number(gd.homeruns) > Number(gd.awayruns)

    const awayId = mapTeamFromIoc(String(gd.awayioc ?? '')) ?? mapTeamFromLabel(String(gd.awaylabel ?? ''))
    const homeId = mapTeamFromIoc(String(gd.homeioc ?? '')) ?? mapTeamFromLabel(String(gd.homelabel ?? ''))

    const fmtEra = (era: number) => (era / 100).toFixed(2)

    // Player stats
    const awayTeamId   = gd.awayid
    const homeTeamId   = gd.homeid
    const awayPlayers  = getTeamPlayers(boxScore, awayTeamId as string)
    const homePlayers  = getTeamPlayers(boxScore, homeTeamId as string)

    // Live game situation
    const gamestatus   = Number(gd.gamestatus ?? 0)
    const isLive       = gamestatus === 1
    const completedInnings = Number(gd.innings ?? 0)

    // For live games: hide innings not yet played
    // Away bats first: innings 1..completedInnings+1 might have data
    // Home: innings 1..completedInnings might have data
    const liveAway = isLive ? completedInnings + 1 : 99
    const liveHome = isLive ? completedInnings      : 99

    const awayInnings = displayInnings.map(i => {
      if (i > liveAway) return null
      const v = gd[`runsaway${i}`]
      return v !== null && v !== undefined ? Number(v) : null
    })
    const homeInnings = displayInnings.map(i => {
      if (i > liveHome) return null
      if (homeWon && i > homeBattedInnings && i <= 9) return 'X'
      const v = gd[`runshome${i}`]
      return v !== null && v !== undefined ? Number(v) : null
    })

    // Batter/pitcher on display from gamestatustext fields
    const rawBatter  = String(gd.gamestatusbatter  ?? '').trim()
    const rawPitcher = String(gd.gamestatuspitcher ?? '').trim()
    const currentBatter  = rawBatter  || null
    const currentPitcher = rawPitcher || null

    const situation = isLive ? {
      inning:  completedInnings + 1,
      outs:    Number(gd.outs    ?? 0),
      balls:   Number(gd.balls   ?? 0),
      strikes: Number(gd.strikes ?? 0),
      runner1: Number(gd.runner1 ?? 0) > 0,
      runner2: Number(gd.runner2 ?? 0) > 0,
      runner3: Number(gd.runner3 ?? 0) > 0,
      currentBatter,
      currentPitcher,
    } : null

    return NextResponse.json({
      isLive,
      displayInnings,
      startInning,
      awayId,
      homeId,
      awayInnings,
      homeInnings,
      awayTotals: { r: Number(gd.awayruns), h: Number(gd.awayhits), e: Number(gd.awayerrors) },
      homeTotals: { r: Number(gd.homeruns),  h: Number(gd.homehits),  e: Number(gd.homeerrors) },
      winPitcher:  pitchers?.win  ? { name: formatPitcherName(pitchers.win.fullName),  era: fmtEra(pitchers.win.era)  } : null,
      lossPitcher: pitchers?.loss ? { name: formatPitcherName(pitchers.loss.fullName), era: fmtEra(pitchers.loss.era) } : null,
      savePitcher: pitchers?.save ? { name: formatPitcherName((pitchers.save as unknown as { fullName: string }).fullName), era: fmtEra((pitchers.save as unknown as { era: number }).era) } : null,
      awayBatters:  extractBatters(awayPlayers),
      homeBatters:  extractBatters(homePlayers),
      awayPitchers: extractPitchers(awayPlayers),
      homePitchers: extractPitchers(homePlayers),
      situation,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch boxscore' }, { status: 500 })
  }
}
