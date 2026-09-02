import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KNBSB_ID_TO_TEAM: Record<number, string> = {
  39583: 'pirates', 39587: 'neptunus', 39584: 'hcaw',
  39586: 'kinheim', 39588: 'twins', 39589: 'uvv', 39585: 'pioniers',
}
const TUSSENVOEGSELS = new Set(['van', 'de', 'den', 'der', 'het', 'op', 'ten', 'ter', 't', 'vd', 'la', 'le'])
function formatName(first: string, last: string): string {
  const firstName = first.trim().split(' ')[0]
  const lastName = last.trim().split(' ').map((w, i, arr) => {
    const l = w.toLowerCase()
    return (i < arr.length - 1 && TUSSENVOEGSELS.has(l)) ? l : l.charAt(0).toUpperCase() + l.slice(1)
  }).join(' ')
  return `${firstName} ${lastName}`.trim()
}
const ipToOuts = (ip: unknown): number => {
  const s = String(ip ?? '0')
  if (s.includes('.')) { const [f, o] = s.split('.').map(n => parseInt(n, 10) || 0); return f * 3 + Math.min(o, 2) }
  return parseInt(s, 10) || 0
}
const outsToIp = (outs: number) => `${Math.floor(outs / 3)}.${outs % 3}`
const r3 = (n: number) => Math.round(n * 1000) / 1000
const n = (v: unknown) => Number(v ?? 0)

const ROUND_RE: Record<string, RegExp> = {
  semi: /play-?offs?\s*[ab]/i,
  final: /holland|finale/i,
}

export async function GET(req: NextRequest) {
  const round = req.nextUrl.searchParams.get('round') ?? 'semi'
  const re = ROUND_RE[round] ?? ROUND_RE.semi
  try {
    const schedRes = await fetch('https://boxscore.stenwessel.nl/api/fetchschedule.php?competition=hb2026', { cache: 'no-store' })
    const allGames: Array<Record<string, unknown>> = (await schedRes.json()).games ?? []
    const gameIds = allGames
      .filter(g => (String(g.gamestatus) === '2' || String(g.gamestatus) === '3') && re.test(String(g.gametypelabel ?? '')))
      .map(g => Number(g.id))

    type Acc = { full_name: string; team_id: string; ab: number; h: number; r: number; hr: number; rbi: number; sb: number; doubles: number; triples: number; bb: number; hbp: number; sf: number; pitch_outs: number; k: number; wins: number; saves: number; ha: number; walks: number; er: number }
    const map = new Map<string, Acc>()

    for (const id of gameIds) {
      const res = await fetch(`https://boxscore.stenwessel.nl/api/fetchgamedata.php?competition=hb2026&game=${id}`, { cache: 'no-store' })
      if (!res.ok) continue
      const boxScore: Record<string, Record<string, unknown[]>> = (await res.json()).boxScore ?? {}
      for (const [teamKey, spots] of Object.entries(boxScore)) {
        if (teamKey === 'totals' || teamKey === 'pitchers') continue
        const team = KNBSB_ID_TO_TEAM[parseInt(teamKey, 10)]
        if (!team) continue
        for (const players of Object.values(spots)) {
          if (!Array.isArray(players) || !players[0]) continue
          const p = players[0] as Record<string, unknown>
          const full = formatName(String(p.firstname ?? ''), String(p.lastname ?? ''))
          const key = `${full}|${team}`
          const e = map.get(key) ?? { full_name: full, team_id: team, ab: 0, h: 0, r: 0, hr: 0, rbi: 0, sb: 0, doubles: 0, triples: 0, bb: 0, hbp: 0, sf: 0, pitch_outs: 0, k: 0, wins: 0, saves: 0, ha: 0, walks: 0, er: 0 }
          e.ab += n(p.ab); e.h += n(p.h); e.r += n(p.r); e.hr += n(p.hr); e.rbi += n(p.rbi); e.sb += n(p.sb)
          e.doubles += n(p.double); e.triples += n(p.triple); e.bb += n(p.bb); e.hbp += n(p.hbp); e.sf += n(p.sf)
          e.pitch_outs += ipToOuts(p.pitch_ip); e.k += n(p.pitch_so); e.wins += n(p.pitch_win); e.saves += n(p.pitch_save)
          e.ha += n(p.pitch_h); e.walks += n(p.pitch_bb); e.er += n(p.pitch_er)
          map.set(key, e)
        }
      }
    }

    const batters: Record<string, unknown>[] = []
    const pitchers: Record<string, unknown>[] = []
    for (const p of map.values()) {
      if (p.ab >= 1) {
        const tb = (p.h - p.doubles - p.triples - p.hr) + 2 * p.doubles + 3 * p.triples + 4 * p.hr
        const obpDenom = p.ab + p.bb + p.hbp + p.sf
        const obp = obpDenom > 0 ? r3((p.h + p.bb + p.hbp) / obpDenom) : 0
        const slg = p.ab > 0 ? r3(tb / p.ab) : 0
        batters.push({
          full_name: p.full_name, team_id: p.team_id,
          at_bats: p.ab, hits: p.h, runs: p.r, doubles: p.doubles, home_runs: p.hr, rbi: p.rbi, stolen_bases: p.sb,
          avg: p.ab > 0 ? r3(p.h / p.ab) : 0, obp, slg, ops: r3(obp + slg),
        })
      }
      if (p.pitch_outs > 0) {
        pitchers.push({
          full_name: p.full_name, team_id: p.team_id,
          innings_pitched: outsToIp(p.pitch_outs), strikeouts: p.k, wins: p.wins, saves: p.saves,
          hits_allowed: p.ha, walks: p.walks, earned_runs: p.er,
        })
      }
    }

    return NextResponse.json({ batters, pitchers }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ batters: [], pitchers: [] }, { status: 500 })
  }
}
