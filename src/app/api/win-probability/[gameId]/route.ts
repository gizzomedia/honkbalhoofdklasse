import { NextResponse } from 'next/server'

// Normal CDF approximation (Abramowitz & Stegun)
function normalCDF(z: number): number {
  const sign = z < 0 ? -1 : 1
  const x = Math.abs(z) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * x)
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))))
  const erf = 1 - poly * Math.exp(-x * x)
  return 0.5 * (1 + sign * erf)
}

// Win probability given run differential and innings remaining
// σ = 1.5 runs/inning (slightly higher for semi-pro like Hoofdklasse)
function winProb(runDiff: number, inningsRemaining: number): number {
  if (inningsRemaining <= 0) {
    return runDiff > 0 ? 1 : runDiff < 0 ? 0 : 0.5
  }
  const sigma = 1.5
  const z = runDiff / (sigma * Math.sqrt(inningsRemaining))
  return normalCDF(z)
}

export type WinProbPoint = { label: string; homeProb: number }

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params

  try {
    const res = await fetch(
      `https://boxscore.stenwessel.nl/api/fetchgamedata.php?competition=hb2026&game=${gameId}`,
      { next: { revalidate: 30 } }
    )
    if (!res.ok) return NextResponse.json({ points: [] })
    const data = await res.json()
    const gd = data.gameData as Record<string, unknown>

    // Determine game length (same logic as boxscore API):
    // default 9 innings, extend only if there are actual runs in extra innings
    let lastInning = 9
    for (let i = 20; i > 9; i--) {
      if (Number(gd[`runsaway${i}`]) > 0 || Number(gd[`runshome${i}`]) > 0) {
        lastInning = i
        break
      }
    }
    // Verify at least inning 1 has data (game was actually played)
    if (gd['runsaway1'] === null || gd['runsaway1'] === undefined || gd['runsaway1'] === '') return NextResponse.json({ points: [] })

    const totalInnings = lastInning
    const homeWon = Number(gd.homeruns ?? 0) > Number(gd.awayruns ?? 0)

    const points: WinProbPoint[] = [{ label: 'Start', homeProb: 0.5 }]

    let homeRuns = 0
    let awayRuns = 0

    for (let i = 1; i <= lastInning; i++) {
      const awayVal = gd[`runsaway${i}`]
      const homeVal = gd[`runshome${i}`]

      // Top of inning: away team bats
      if (awayVal !== null && awayVal !== undefined && awayVal !== '') {
        awayRuns += Number(awayVal) || 0
        // After top: home still has bottom of this inning + all remaining
        const innsLeft = (totalInnings - i) + 0.5
        points.push({ label: `T${i}`, homeProb: winProb(homeRuns - awayRuns, innsLeft) })
      }

      // Bottom of inning: home team bats (unless they didn't need to)
      const homeDidntBat = homeWon && i === totalInnings && (homeVal === null || homeVal === undefined || homeVal === '')
      if (!homeDidntBat && homeVal !== null && homeVal !== undefined && homeVal !== '') {
        homeRuns += Number(homeVal) || 0
        const innsLeft = totalInnings - i
        points.push({ label: `B${i}`, homeProb: winProb(homeRuns - awayRuns, innsLeft) })
      }
    }

    // Snap final point to 0 or 1 based on actual result
    if (points.length > 1) {
      const last = points[points.length - 1]
      last.homeProb = homeRuns > awayRuns ? 1 : homeRuns < awayRuns ? 0 : 0.5
    }

    return NextResponse.json({ points }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=10' },
    })
  } catch {
    return NextResponse.json({ points: [] })
  }
}
