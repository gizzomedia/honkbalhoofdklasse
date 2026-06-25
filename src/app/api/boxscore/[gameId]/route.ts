import { NextResponse } from 'next/server'
import { fetchGameBoxscore } from '@/lib/knbsb-scraper'

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
  name: string; pos: string; isSubstitute: boolean
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
  const slotSeen = new Set<number>() // first player per batting slot = starter
  const result: BatterStat[] = []
  for (const p of players) {
    if (!p.firstname) continue
    const name = `${p.firstname} ${p.lastname}`
    if (seen.has(name)) continue
    seen.add(name)
    const pos = String(p.pos ?? '')
    if (pos === 'P') continue  // pitchers belong in the pitching table only
    const slot = p._slot as number
    const inLineup = slot > 0
    const hasBatted = n(p.ab) > 0 || n(p.bb) > 0 || n(p.hbp) > 0 ||
                      n(p.sf) > 0 || n(p.sh) > 0 || n(p.r) > 0 || n(p.rbi) > 0
    if (!inLineup && !hasBatted) continue
    // A player is a substitute when another player already occupied this batting slot
    const isSubstitute = inLineup && slotSeen.has(slot)
    if (inLineup) slotSeen.add(slot)
    result.push({
      name,
      pos,
      isSubstitute,
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

// Returns players sorted by batting-order slot (the numeric section key in the API).
// Each slot may contain multiple players (starter + substitutes in that spot).
function getTeamPlayers(boxScore: Record<string, unknown>, teamId: string | number): RawPlayer[] {
  const team = boxScore[String(teamId)] as Record<string, unknown> | undefined
  if (!team) return []

  // Group entries by their numeric key (= batting-order slot 1-9) vs non-numeric
  const slots: [number, RawPlayer[]][] = []
  const extra: RawPlayer[] = []

  for (const [key, section] of Object.entries(team)) {
    const slot = parseInt(key, 10)
    const collect = (v: unknown, target: RawPlayer[]) => {
      if (!v || typeof v !== 'object') return
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item && typeof item === 'object' && (item as RawPlayer).firstname)
            target.push({ ...(item as RawPlayer), _slot: isNaN(slot) ? 0 : slot })
          else collect(item, target)
        }
      } else {
        for (const val of Object.values(v as Record<string, unknown>)) collect(val, target)
      }
    }
    if (!isNaN(slot)) {
      const bucket: RawPlayer[] = []
      collect(section, bucket)
      if (bucket.length) slots.push([slot, bucket])
    } else {
      collect(section, extra)
    }
  }

  slots.sort((a, b) => a[0] - b[0])
  return [...slots.flatMap(([, ps]) => ps), ...extra]
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params
  try {
    const data = await fetchGameBoxscore(gameId)
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

    // Live game situation — parse "B4"/"T5" from gamestatustext
    const gamestatus = Number(gd.gamestatus ?? 0)
    const isLive     = gamestatus === 1
    const statusText = String(gd.gamestatustext ?? '')
    const stMatch    = statusText.match(/^([TB])(\d+)$/)
    const currentInning = stMatch ? parseInt(stMatch[2]) : 0
    const isBottom      = stMatch ? stMatch[1] === 'B' : false

    // For live games: only show innings that have been played
    // Away (bats top): 1..currentInning (top done for current inning if bottom, or in progress)
    // Home (bats bottom): 1..(currentInning-1) if top, 1..currentInning if bottom
    const showAwayUpTo = isLive && currentInning > 0 ? currentInning      : 99
    const showHomeUpTo = isLive && currentInning > 0 ? (isBottom ? currentInning : currentInning - 1) : 99

    const awayInnings = displayInnings.map(i => {
      if (i > showAwayUpTo) return null
      const v = gd[`runsaway${i}`]
      return v !== null && v !== undefined ? Number(v) : null
    })
    const homeInnings = displayInnings.map(i => {
      if (i > showHomeUpTo) return null
      if (!isLive && homeWon && i > homeBattedInnings && i <= 9) return 'X'
      const v = gd[`runshome${i}`]
      return v !== null && v !== undefined ? Number(v) : null
    })

    // Format batter/pitcher name: "VICARIO Jayvon" → "Jayvon Vicario"
    function fmtPerson(raw: string): string | null {
      if (!raw) return null
      const parts = raw.trim().split(/\s+/)
      if (parts.length < 2) return raw
      const last  = parts[0].charAt(0) + parts[0].slice(1).toLowerCase()
      const first = parts.slice(1).join(' ')
      return `${first} ${last}`
    }

    const situation = isLive ? {
      inning:   currentInning,
      isBottom,
      outs:     Number(gd.outs    ?? 0),
      balls:    Number(gd.balls   ?? 0),
      strikes:  Number(gd.strikes ?? 0),
      runner1:  Number(gd.runner1 ?? 0) > 0,
      runner2:  Number(gd.runner2 ?? 0) > 0,
      runner3:  Number(gd.runner3 ?? 0) > 0,
      currentBatter:  fmtPerson(String(gd.gamestatusbatter  ?? '')),
      currentPitcher: fmtPerson(String(gd.gamestatuspitcher ?? '')),
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
