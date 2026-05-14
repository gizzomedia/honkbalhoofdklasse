import { supabase } from '@/lib/supabase'

const COMPETITION = 'hb2026'
const BASE_URL = 'https://boxscore.stenwessel.nl/api'

interface ScheduleGame {
  id: string
  gamestatus: string | number
  [key: string]: unknown
}

interface BoxScorePlayer {
  firstname: string
  lastname: string
  uniform?: string
  pos?: string
  ab?: string | number
  h?: string | number
  hr?: string | number
  rbi?: string | number
  r?: string | number
  bb?: string | number
  so?: string | number
  double?: string | number
  triple?: string | number
  sb?: string | number
  sf?: string | number
  sh?: string | number
  hbp?: string | number
  pitch_ip?: string | number
  pitch_gs?: string | number
  pitch_er?: string | number
  pitch_so?: string | number
  pitch_bb?: string | number
  pitch_h?: string | number
  pitch_r?: string | number
  pitch_win?: string | number
  pitch_loss?: string | number
  pitch_save?: string | number
  pitch_appear?: string | number
  pitch_cg?: string | number
  [key: string]: unknown
}

type BoxScoreSection = BoxScorePlayer[]

interface BoxScoreTeam {
  [section: string]: BoxScoreSection
}

interface BoxScoreData {
  boxScore?: {
    [teamId: string]: BoxScoreTeam
  }
  [key: string]: unknown
}

function n(val: string | number | undefined): number {
  if (val === undefined || val === null || val === '') return 0
  const parsed = Number(val)
  return isNaN(parsed) ? 0 : parsed
}

function matchesName(player: BoxScorePlayer, inputName: string): boolean {
  const fullName = `${player.firstname} ${player.lastname}`.toLowerCase()
  const input = inputName.trim().toLowerCase()

  // Exact full name match
  if (fullName === input) return true

  const inputParts = input.split(/\s+/)
  const firstName = inputParts[0]
  const lastName = inputParts.slice(1).join(' ')
  const lastWord = inputParts.at(-1) ?? ''

  const pFirst = player.firstname.toLowerCase()
  const pLast = player.lastname.toLowerCase()

  // firstname + lastname exact
  if (pFirst === firstName && pLast === lastName) return true

  // Partial first name (initials) + exact last name
  if (pFirst.startsWith(firstName.slice(0, 1)) && pLast === lastName) return true

  // Last word of input matches player last name, and first chars of first name match
  if (pLast === lastWord && firstName.length >= 1 && pFirst.startsWith(firstName.slice(0, 1))) return true

  return false
}

async function fetchFinishedGameIds(): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/fetchschedule.php?competition=${COMPETITION}`, {
    next: { revalidate: 1800 },
  })
  if (!res.ok) return []
  const json = await res.json()

  const games: ScheduleGame[] = Array.isArray(json)
    ? json
    : Array.isArray(json?.games)
    ? json.games
    : Array.isArray(json?.schedule)
    ? json.schedule
    : Object.values(json ?? {}).find(v => Array.isArray(v)) as ScheduleGame[] ?? []

  return games
    .filter(g => String(g.gamestatus) === '2' || String(g.gamestatus) === '3')
    .map(g => String(g.id))
}

async function fetchBoxScore(gameId: string): Promise<BoxScoreData | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/fetchgamedata.php?competition=${COMPETITION}&game=${gameId}`,
      { next: { revalidate: 1800 } }
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function extractPlayersFromBoxScore(data: BoxScoreData): BoxScorePlayer[] {
  const players: BoxScorePlayer[] = []
  const boxScore = data?.boxScore
  if (!boxScore || typeof boxScore !== 'object') return players

  for (const teamId of Object.keys(boxScore)) {
    const team = boxScore[teamId]
    if (!team || typeof team !== 'object') continue
    for (const section of Object.values(team)) {
      if (!Array.isArray(section)) continue
      for (const player of section) {
        if (player && typeof player === 'object' && player.firstname !== undefined) {
          players.push(player as BoxScorePlayer)
        }
      }
    }
  }
  return players
}

interface AggregatedStats {
  // Batting
  ab: number
  h: number
  hr: number
  rbi: number
  r: number
  bb: number
  so: number
  double: number
  triple: number
  sb: number
  sf: number
  sh: number
  hbp: number
  // Pitching (raw outs for ip)
  pitch_outs: number
  pitch_gs: number
  pitch_er: number
  pitch_so: number
  pitch_bb: number
  pitch_h: number
  pitch_r: number
  pitch_win: number
  pitch_loss: number
  pitch_save: number
  pitch_appear: number
  pitch_cg: number
  // derived
  avg: number | null
  era: number | null
  pitch_ip: string
  gamesFound: number
}

export type SeasonStats = {
  firstname: string
  lastname: string
  ab: number
  h: number
  hr: number
  rbi: number
  r: number
  bb: number
  so: number
  double: number
  triple: number
  sb: number
  sf: number
  sh: number
  hbp: number
  avg: number | null
  obp: number | null
  slg: number | null
  ops: number | null
  pitch_ip: string
  pitch_gs: number
  pitch_er: number
  pitch_so: number
  pitch_bb: number
  pitch_h: number
  pitch_r: number
  pitch_win: number
  pitch_loss: number
  pitch_save: number
  pitch_appear: number
  pitch_cg: number
  era: number | null
  games: number
}

export type PlayerPhotos = {
  banner_url: string | null
  headshot_url: string | null
} | null

export async function computeSeasonStats(name: string): Promise<SeasonStats | null> {
    const gameIds   = await fetchFinishedGameIds()
    const boxScores = await Promise.all(gameIds.map(id => fetchBoxScore(id)))

    const agg: AggregatedStats = {
      ab: 0, h: 0, hr: 0, rbi: 0, r: 0, bb: 0, so: 0,
      double: 0, triple: 0, sb: 0, sf: 0, sh: 0, hbp: 0,
      pitch_outs: 0, pitch_gs: 0, pitch_er: 0, pitch_so: 0,
      pitch_bb: 0, pitch_h: 0, pitch_r: 0,
      pitch_win: 0, pitch_loss: 0, pitch_save: 0,
      pitch_appear: 0, pitch_cg: 0,
      avg: null, era: null, pitch_ip: '0.0',
      gamesFound: 0,
    }

    function ipToOuts(ip: number): number {
      const inn  = Math.floor(ip)
      const frac = Math.round((ip - inn) * 10)
      return inn * 3 + frac
    }

    let foundPlayer = false

    for (const data of boxScores) {
      if (!data) continue
      const allPlayers = extractPlayersFromBoxScore(data)

      const seen = new Map<string, BoxScorePlayer>()
      for (const p of allPlayers) {
        const key      = `${p.firstname}_${p.lastname}`.toLowerCase()
        const existing = seen.get(key)
        if (!existing) { seen.set(key, p); continue }
        const newIp    = n(p.pitch_ip)
        const exIp     = n(existing.pitch_ip)
        const isPitcher = newIp > 0 || exIp > 0
        if (isPitcher ? newIp > exIp : n(p.ab) > n(existing.ab)) seen.set(key, p)
      }

      const matched = [...seen.values()].find(p => matchesName(p, name))
      if (!matched) continue

      foundPlayer = true
      agg.gamesFound++
      agg.ab      += n(matched.ab);    agg.h    += n(matched.h)
      agg.hr      += n(matched.hr);    agg.rbi  += n(matched.rbi)
      agg.r       += n(matched.r);     agg.bb   += n(matched.bb)
      agg.so      += n(matched.so);    agg.double += n(matched.double)
      agg.triple  += n(matched.triple);agg.sb   += n(matched.sb)
      agg.sf      += n(matched.sf);    agg.sh   += n(matched.sh)
      agg.hbp     += n(matched.hbp)
      agg.pitch_outs   += ipToOuts(n(matched.pitch_ip))
      agg.pitch_gs     += n(matched.pitch_gs)
      agg.pitch_er     += n(matched.pitch_er)
      agg.pitch_so     += n(matched.pitch_so)
      agg.pitch_bb     += n(matched.pitch_bb)
      agg.pitch_h      += n(matched.pitch_h)
      agg.pitch_r      += n(matched.pitch_r)
      agg.pitch_win    += n(matched.pitch_win)
      agg.pitch_loss   += n(matched.pitch_loss)
      agg.pitch_save   += n(matched.pitch_save)
      agg.pitch_appear += n(matched.pitch_appear)
      agg.pitch_cg     += n(matched.pitch_cg)
    }

    if (!foundPlayer) return null

    const avg  = agg.ab > 0 ? agg.h / agg.ab : null
    const pa   = agg.ab + agg.bb + agg.hbp + agg.sf + agg.sh
    const obp  = pa > 0 ? (agg.h + agg.bb + agg.hbp) / pa : null
    const singles = agg.h - agg.hr - agg.double - agg.triple
    const tb   = singles + agg.double * 2 + agg.triple * 3 + agg.hr * 4
    const slg  = agg.ab > 0 ? tb / agg.ab : null
    const ops  = obp !== null && slg !== null ? obp + slg : null
    const fullInnings   = Math.floor(agg.pitch_outs / 3)
    const remainingOuts = agg.pitch_outs % 3
    const pitch_ip      = `${fullInnings}.${remainingOuts}`
    const ipDecimal     = fullInnings + remainingOuts / 3
    const era           = ipDecimal > 0 ? (agg.pitch_er / ipDecimal) * 9 : null

    return {
      firstname: name.trim().split(/\s+/)[0],
      lastname:  name.trim().split(/\s+/).slice(1).join(' '),
      ab: agg.ab, h: agg.h, hr: agg.hr, rbi: agg.rbi, r: agg.r,
      bb: agg.bb, so: agg.so, double: agg.double, triple: agg.triple,
      sb: agg.sb, sf: agg.sf, sh: agg.sh, hbp: agg.hbp,
      avg: avg !== null ? Number(avg.toFixed(3)) : null,
      obp: obp !== null ? Number(obp.toFixed(3)) : null,
      slg: slg !== null ? Number(slg.toFixed(3)) : null,
      ops: ops !== null ? Number(ops.toFixed(3)) : null,
      pitch_ip, pitch_gs: agg.pitch_gs, pitch_er: agg.pitch_er,
      pitch_so: agg.pitch_so, pitch_bb: agg.pitch_bb, pitch_h: agg.pitch_h,
      pitch_r: agg.pitch_r, pitch_win: agg.pitch_win, pitch_loss: agg.pitch_loss,
      pitch_save: agg.pitch_save, pitch_appear: agg.pitch_appear,
      pitch_cg: agg.pitch_cg,
      era: era !== null ? Number(era.toFixed(2)) : null,
      games: agg.gamesFound,
    }
}

export async function fetchPlayerPhotos(playerName: string): Promise<PlayerPhotos> {
  const { data } = await supabase
    .from('player_photos')
    .select('banner_url, headshot_url')
    .ilike('player_name', playerName)
    .maybeSingle()
  return data ?? null
}
