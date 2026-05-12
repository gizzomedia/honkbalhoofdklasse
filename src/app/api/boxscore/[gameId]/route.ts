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
  const lastName = parts[0]
  const firstName = parts.slice(1).join(' ')
  // Capitalize last name: "TIMMERMANS" -> "Timmermans"
  const lastCap = lastName.charAt(0) + lastName.slice(1).toLowerCase()
  return `${firstName} ${lastCap}`
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
    const gd       = data.gameData as Record<string, unknown>
    const pitchers = (data.boxScore as Record<string, unknown>)?.pitchers as Record<string, { fullName: string; era: number }> | undefined

    // Determine last inning with actual data (extras detection)
    let lastInning = 9
    for (let i = 20; i > 9; i--) {
      if (Number(gd[`runsaway${i}`]) > 0 || Number(gd[`runshome${i}`]) > 0) {
        lastInning = i
        break
      }
    }

    // Sliding window of 9 columns
    const startInning  = Math.max(1, lastInning - 8)
    const displayInnings = Array.from({ length: 9 }, (_, i) => startInning + i)

    const homeBattedInnings = Number(gd.innings ?? 9)
    const homeWon = Number(gd.homeruns) > Number(gd.awayruns)

    const awayId = mapTeamFromIoc(String(gd.awayioc ?? '')) ?? mapTeamFromLabel(String(gd.awaylabel ?? ''))
    const homeId = mapTeamFromIoc(String(gd.homeioc ?? '')) ?? mapTeamFromLabel(String(gd.homelabel ?? ''))

    const awayInnings = displayInnings.map(i => {
      const v = gd[`runsaway${i}`]
      return v !== null && v !== undefined ? Number(v) : null
    })
    const homeInnings = displayInnings.map(i => {
      // Show X if home team didn't bat (won without needing last inning)
      if (homeWon && i > homeBattedInnings && i <= 9) return 'X'
      const v = gd[`runshome${i}`]
      return v !== null && v !== undefined ? Number(v) : null
    })

    const fmtEra = (era: number) => (era / 100).toFixed(2)

    return NextResponse.json({
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
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch boxscore' }, { status: 500 })
  }
}
