import { NextResponse } from 'next/server'

const SCHEDULE_URL = 'https://boxscore.stenwessel.nl/api/fetchschedule.php?competition=hb2026'
const GAME_URL     = 'https://boxscore.stenwessel.nl/api/fetchgamedata.php?competition=hb2026&game='

function mapTeam(label: string): string | null {
  const l = (label ?? '').toLowerCase()
  if (l.includes('neptunus'))              return 'neptunus'
  if (l.includes('pirate') || l.includes('amsterdam')) return 'pirates'
  if (l.includes('kinheim'))               return 'kinheim'
  if (l.includes('hcaw'))                  return 'hcaw'
  if (l.includes('twin') || l.includes('oosterhout'))  return 'twins'
  if (l.includes('pionier'))               return 'pioniers'
  if (l.includes('uvv'))                   return 'uvv'
  return null
}

function mapTeamFromIoc(ioc: string): string | null {
  const map: Record<string, string> = {
    TWI: 'twins', NEP: 'neptunus', HCA: 'hcaw',
    KIN: 'kinheim', PIO: 'pioniers', PIR: 'pirates', UVV: 'uvv', AMS: 'pirates',
  }
  return map[ioc] ?? null
}

function getTeamId(game: Record<string, unknown>, side: 'home' | 'away'): string | null {
  const teamObj = game[`${side}_team`] as Record<string, string> | undefined
  const labelKey = side === 'home' ? 'homelabel' : 'awaylabel'
  const iocKey   = side === 'home' ? 'homeioc'   : 'awayioc'
  return (
    (teamObj ? mapTeam(teamObj.teamlabel ?? '') : null) ??
    mapTeamFromIoc((game[iocKey] as string) ?? '') ??
    mapTeam((game[labelKey] as string) ?? '')
  )
}

function calcScore(boxScore: Record<string, unknown>, teamId: string): number {
  const teamData = boxScore[teamId] as Record<string, unknown[]> | undefined
  if (!teamData) return 0
  const seen: Record<string, boolean> = {}
  let runs = 0
  for (const players of Object.values(teamData)) {
    if (!Array.isArray(players)) continue
    for (const p of players as Record<string, unknown>[]) {
      const key = `${p.firstname}_${p.lastname}`
      if (!seen[key]) { seen[key] = true; runs += (p.r as number) || 0 }
    }
  }
  return runs
}

export async function GET() {
  try {
    const schedRes = await fetch(SCHEDULE_URL, { next: { revalidate: 0 } })
    const schedData = await schedRes.json()
    const allGames: Record<string, unknown>[] = schedData.games ?? []

    const today = new Date().toISOString().split('T')[0]

    const live: unknown[]     = []
    const finished: unknown[] = []
    const upcoming: unknown[] = []

    const liveGameIds: string[] = allGames
      .filter(g => String(g.gamestatus) === '1')
      .map(g => String(g.id))

    // Fetch individual boxscores for live games
    const liveBoxscores: Record<string, unknown> = {}
    await Promise.all(
      liveGameIds.map(async id => {
        try {
          const r = await fetch(GAME_URL + id, { next: { revalidate: 0 } })
          liveBoxscores[id] = await r.json()
        } catch { /* skip */ }
      })
    )

    for (const g of allGames) {
      const status    = String(g.gamestatus)
      const gameDate  = g.start ? String(g.start).split(' ')[0] : ''
      const gameTime  = g.start ? String(g.start).split(' ')[1] ?? null : null
      const homeId    = getTeamId(g, 'home')
      const awayId    = getTeamId(g, 'away')
      const id        = String(g.id)

      const base = { id, gameDate, gameTime, homeId, awayId }

      if (status === '1') {
        // Live — calculate score from boxscore
        const bs = liveBoxscores[id] as Record<string, unknown> | undefined
        let homeScore: number | null = null
        let awayScore: number | null = null
        if (bs?.boxScore && bs?.gameData) {
          const boxScore = bs.boxScore as Record<string, unknown>
          const gd       = bs.gameData as Record<string, unknown>
          homeScore = calcScore(boxScore, String(gd.homeid))
          awayScore = calcScore(boxScore, String(gd.awayid))
        }
        live.push({ ...base, status: 'live', homeScore, awayScore })
      } else if (status === '2' || status === '3') {
        if (gameDate >= today || finished.length < 8) {
          finished.push({ ...base, status: 'final',
            homeScore: g.homescore ?? null,
            awayScore: g.awayscore ?? null,
          })
        }
      } else {
        if (gameDate >= today) {
          upcoming.push({ ...base, status: 'scheduled' })
        }
      }
    }

    return NextResponse.json({
      live,
      finished: finished.slice(0, 8),
      upcoming: upcoming.slice(0, 10),
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
