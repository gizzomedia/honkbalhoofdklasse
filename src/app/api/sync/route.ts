import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const BASE_URL   = 'https://boxscore.stenwessel.nl/api'
const COMPETITION = 'hb2026'

const IOC_TO_TEAM: Record<string, string> = {
  NEP: 'neptunus', PIR: 'pirates', AMS: 'pirates', KIN: 'kinheim',
  HCA: 'hcaw',    TWI: 'twins',    PIO: 'pioniers', UVV: 'uvv',
}

type SteGame = {
  id: number
  gamestatus: number
  start: string          // "2026-04-09 19:30:00"
  location: string | null
  homeruns: number
  awayruns: number
  homeioc: string
  awayioc: string
  home_team?: { groupwins: number; grouplosses: number; groupties: number; groupgb: number }
  away_team?: { groupwins: number; grouplosses: number; groupties: number; groupgb: number }
}

function gameStatus(s: number): 'scheduled' | 'live' | 'final' {
  if (s === 1) return 'live'
  if (s === 2 || s === 3) return 'final'
  return 'scheduled'
}

export async function GET(req: Request) {
  // Auth: Vercel sends "Authorization: Bearer {CRON_SECRET}" for cron jobs
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('Authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    // ── 1. Fetch schedule (all games + scores + standings in one call) ──────
    const res = await fetch(
      `${BASE_URL}/fetchschedule.php?competition=${COMPETITION}`,
      { cache: 'no-store' }
    )
    if (!res.ok) throw new Error(`Schedule fetch failed: ${res.status}`)

    const json = await res.json()
    const steGames: SteGame[] = json?.games ?? []
    if (!steGames.length) throw new Error('No games returned from schedule')

    // ── 2. Load current Supabase games ───────────────────────────────────────
    const { data: sbGames, error: sbErr } = await supabaseAdmin
      .from('games')
      .select('id, external_id, status, home_score, away_score')
      .eq('season', 2026)

    if (sbErr) throw sbErr

    const sbByExtId = new Map((sbGames ?? []).map(g => [String(g.external_id), g]))

    // ── 3. Diff & build updates ──────────────────────────────────────────────
    const gameUpdates: { id: number; patch: Record<string, unknown> }[] = []
    let newFinals = 0

    for (const sg of steGames) {
      const sb = sbByExtId.get(String(sg.id))
      if (!sb) continue

      const newStatus = gameStatus(sg.gamestatus)
      const needsScore = newStatus !== 'scheduled'

      const patch: Record<string, unknown> = {}

      if (sb.status !== newStatus) patch.status = newStatus
      if (needsScore && sb.home_score !== sg.homeruns) patch.home_score = sg.homeruns
      if (needsScore && sb.away_score !== sg.awayruns) patch.away_score = sg.awayruns

      if (Object.keys(patch).length > 0) {
        patch.updated_at = new Date().toISOString()
        gameUpdates.push({ id: sb.id, patch })
        if (newStatus === 'final' && sb.status !== 'final') newFinals++
      }
    }

    // ── 4. Apply game updates ────────────────────────────────────────────────
    for (const { id, patch } of gameUpdates) {
      await supabaseAdmin.from('games').update(patch).eq('id', id)
    }

    // ── 5. Recalculate standings from stenwessel team data ───────────────────
    // Each game carries the latest groupwins/losses for both teams.
    // Collect the most recent entry per team (highest games_played).
    const teamBest: Record<string, {
      wins: number; losses: number; ties: number; gp: number; gb: number
    }> = {}

    for (const sg of steGames) {
      for (const [ioc, side] of [
        [sg.homeioc, sg.home_team],
        [sg.awayioc, sg.away_team],
      ] as [string, typeof sg.home_team][]) {
        if (!side) continue
        const teamId = IOC_TO_TEAM[ioc]
        if (!teamId) continue

        const gp = side.groupwins + side.grouplosses + side.groupties
        const cur = teamBest[teamId]
        if (!cur || gp > cur.gp) {
          teamBest[teamId] = {
            wins:   side.groupwins,
            losses: side.grouplosses,
            ties:   side.groupties,
            gp,
            gb:     side.groupgb,
          }
        }
      }
    }

    // Apply standings updates
    let standingsUpdated = 0
    for (const [teamId, s] of Object.entries(teamBest)) {
      const winPct = s.gp > 0 ? s.wins / s.gp : 0
      const { error } = await supabaseAdmin
        .from('standings')
        .update({
          wins:         s.wins,
          losses:       s.losses,
          ties:         s.ties,
          games_played: s.gp,
          win_pct:      winPct,
          games_behind: s.gb,
          updated_at:   new Date().toISOString(),
        })
        .eq('team_id', teamId)
        .eq('season', 2026)
      if (!error) standingsUpdated++
    }

    return NextResponse.json({
      ok:               true,
      gamesChecked:     steGames.length,
      gamesUpdated:     gameUpdates.length,
      newFinals,
      standingsUpdated,
      timestamp:        new Date().toISOString(),
    })
  } catch (err) {
    console.error('[sync]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
