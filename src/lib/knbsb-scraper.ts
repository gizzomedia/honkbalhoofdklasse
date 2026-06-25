const WBSC = 'https://stats.knbsbstats.nl'
const SLUG = '2026-lucky-day-hoofdklasse'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function extractDataPage(html: string): unknown {
  const m = html.match(/<div[^>]*id="app"[^>]*data-page="([^"]*)"/);
  if (!m) throw new Error('Cannot extract data-page from HTML')
  return JSON.parse(decodeEntities(m[1]))
}

async function fetchPage(path: string): Promise<any> {
  const html = await fetch(`${WBSC}${path}`, {
    headers: { 'User-Agent': UA }
  }).then(r => r.text())
  return extractDataPage(html)
}

function mapStatus(gs: string | number | null | undefined): string {
  const s = String(gs || '')
  if (s === '2' || s === '3') return 'final'
  if (s === '1') return 'live'
  return 'scheduled'
}

function nv(v: unknown): number {
  const x = Number(v)
  return isNaN(x) ? 0 : x
}

export interface StenwesselGame {
  id: string | number
  start?: string
  gamestatus?: string | number
  gamestatustext?: string
  awaylabel?: string
  homelabel?: string
  awayruns?: number
  homeruns?: number
  awayhits?: number
  homehits?: number
  awayerrors?: number
  homeerrors?: number
  awayioc?: string
  homeioc?: string
  homeid?: string | number
  awayid?: string | number
  outs?: number
  runner1?: number
  runner2?: number
  runner3?: number
  innings?: number
  location?: string
  stadium?: string
  [key: string]: any
}

export interface StenwesselBoxScore {
  gameData: Record<string, any>
  boxScore?: Record<string, any>
  [key: string]: any
}

export async function fetchSchedule(): Promise<{ games: StenwesselGame[] }> {
  const page = await fetchPage(`/en/events/${SLUG}/schedule-and-results`)
  const games = page.props?.games || []
  return { games }
}

export async function fetchGameBoxscore(gameId: string | number): Promise<StenwesselBoxScore> {
  const page = await fetchPage(`/en/events/${SLUG}/schedule-and-results/box-score/${gameId}`)
  const orig = page.props?.viewData?.original

  if (!orig || !orig.gameData || !orig.boxScore) {
    throw new Error('Invalid game data structure')
  }

  const gd = orig.gameData
  const bs = orig.boxScore || {}

  // Build compatible boxScore structure
  function collect(teamKey: string): Record<string, any> {
    const byP: Record<string, any> = {}
    const sec = bs[teamKey] || {}

    for (const [sk, players] of Object.entries(sec)) {
      if (!Array.isArray(players) || isNaN(parseInt(sk))) continue
      for (const p of players) {
        const id = p.playerid
        if (!id) continue
        const cur = byP[id]
        if (!cur || (nv(p.pa) + nv(p.pitch_ip)) > (nv(cur.pa) + nv(cur.pitch_ip))) {
          byP[id] = p
        }
      }
    }
    return byP
  }

  const aK = String(gd.awayid)
  const hK = String(gd.homeid)
  const awayPlayers = Object.values(collect(aK)) as any[]
  const homePlayers = Object.values(collect(hK)) as any[]

  // Mark starters: players without pinch designation (PR, PH, etc) are starters
  const isSubstitute = (p: any) => {
    const pos = String(p.pos || '').toUpperCase()
    return /^(PR|PH|DD|C\/PH|OF\/PH)/.test(pos)
  }

  // Format into stenwessel-compatible structure
  const boxScore: Record<string, any> = {}

  // Away team
  boxScore[aK] = {}
  for (let spot = 1; spot <= 9; spot++) {
    const players = awayPlayers.filter(p => nv(p.spot) === spot || nv(p.sub) === spot)
    boxScore[aK][spot] = players.sort((a, b) => {
      const aIsSub = isSubstitute(a)
      const bIsSub = isSubstitute(b)
      return aIsSub === bIsSub ? 0 : aIsSub ? 1 : -1
    })
  }
  boxScore[aK]['90'] = awayPlayers.filter(p => nv(p.spot) === 90 || nv(p.sub) === 90)

  // Home team
  boxScore[hK] = {}
  for (let spot = 1; spot <= 9; spot++) {
    const players = homePlayers.filter(p => nv(p.spot) === spot || nv(p.sub) === spot)
    boxScore[hK][spot] = players.sort((a, b) => {
      const aIsSub = isSubstitute(a)
      const bIsSub = isSubstitute(b)
      return aIsSub === bIsSub ? 0 : aIsSub ? 1 : -1
    })
  }
  boxScore[hK]['90'] = homePlayers.filter(p => nv(p.spot) === 90 || nv(p.sub) === 90)

  return {
    gameData: gd,
    boxScore: boxScore,
  }
}
