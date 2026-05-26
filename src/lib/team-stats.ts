import { KNBSB_NUMERIC_ID_MAP } from './teams'

const KNBSB_BASE = 'https://stats.knbsbstats.nl/api/v1/stats/events/2026-lucky-day-hoofdklasse/index'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Origin': 'https://stats.knbsbstats.nl',
}

export type TeamBatting = {
  teamId: string
  g: number; ab: number; r: number; h: number
  double: number; triple: number; hr: number; rbi: number
  avg: number; obp: number; slg: number; ops: number
  bb: number; so: number; sb: number; cs: number
  hbp: number; sf: number; sh: number; tb: number
}

export type TeamPitching = {
  teamId: string
  era: number; whip: number
  ip: string; pitch_so: number; pitch_bb: number
  pitch_h: number; pitch_r: number; pitch_er: number
  pitch_win: number; pitch_loss: number; pitch_save: number
  pitch_cg: number; pitch_sho: number; pitch_hr: number
  bavg: number
}

function n(v: unknown): number {
  const x = Number(v)
  return isNaN(x) ? 0 : x
}
function normalizeRate(v: unknown): number {
  const x = Number(v)
  if (isNaN(x)) return 0
  return x > 1 ? x / 1000 : x
}

async function fetchTeamSection(section: 'batting' | 'pitching') {
  try {
    const res = await fetch(
      `${KNBSB_BASE}?section=teams&stats-section=${section}&round=&team=&split=&language=en`,
      {
        headers: { ...HEADERS, Referer: `https://stats.knbsbstats.nl/events/2026-lucky-day-hoofdklasse/stats/teams/${section}` },
        next: { revalidate: 300 },
      }
    )
    if (!res.ok) return []
    return (await res.json()).data ?? []
  } catch {
    return []
  }
}

export async function fetchAllTeamStats(): Promise<{
  batting: TeamBatting[]
  pitching: TeamPitching[]
}> {
  const [batData, pitData] = await Promise.all([
    fetchTeamSection('batting'),
    fetchTeamSection('pitching'),
  ])

  const batting: TeamBatting[] = batData
    .map((t: Record<string, unknown>) => {
      const teamId = KNBSB_NUMERIC_ID_MAP[t.teamid as number]
      if (!teamId) return null
      return {
        teamId,
        g:      n(t.g),
        ab:     n(t.ab),
        r:      n(t.r),
        h:      n(t.h),
        double: n(t.double),
        triple: n(t.triple),
        hr:     n(t.hr),
        rbi:    n(t.rbi),
        avg:    normalizeRate(t.avg),
        obp:    normalizeRate(t.obp),
        slg:    normalizeRate(t.slg),
        ops:    normalizeRate(t.ops),
        bb:     n(t.bb),
        so:     n(t.so),
        sb:     n(t.sb),
        cs:     n(t.cs),
        hbp:    n(t.hbp),
        sf:     n(t.sf),
        sh:     n(t.sh),
        tb:     n(t.tb),
      }
    })
    .filter(Boolean) as TeamBatting[]

  const pitching: TeamPitching[] = pitData
    .map((t: Record<string, unknown>) => {
      const teamId = KNBSB_NUMERIC_ID_MAP[t.teamid as number]
      if (!teamId) return null
      return {
        teamId,
        era:         Number(Number(t.era).toFixed(2)),
        whip:        Number(Number(t.pitch_whip).toFixed(2)),
        ip:          String(t.pitch_ip ?? '0.0'),
        pitch_so:    n(t.pitch_so),
        pitch_bb:    n(t.pitch_bb),
        pitch_h:     n(t.pitch_h),
        pitch_r:     n(t.pitch_r),
        pitch_er:    n(t.pitch_er),
        pitch_win:   n(t.pitch_win),
        pitch_loss:  n(t.pitch_loss),
        pitch_save:  n(t.pitch_save),
        pitch_cg:    n(t.pitch_cg),
        pitch_sho:   n(t.pitch_sho),
        pitch_hr:    n(t.pitch_hr),
        bavg:        normalizeRate(t.bavg),
      }
    })
    .filter(Boolean) as TeamPitching[]

  return { batting, pitching }
}
