import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendLiveNotification } from '@/lib/email'
import { IOC_TO_TEAM } from '@/lib/teams'

const BASE_URL   = 'https://boxscore.stenwessel.nl/api'
const COMPETITION = 'hb2026'

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
      .select('id, external_id, status, home_score, away_score, live_notified, home_team_id, away_team_id')
      .eq('season', 2026)

    if (sbErr) throw sbErr

    const sbByExtId = new Map((sbGames ?? []).map(g => [String(g.external_id), g]))

    // ── 3. Diff & build updates ──────────────────────────────────────────────
    const gameUpdates: { id: number; patch: Record<string, unknown> }[] = []
    const newlyLive: { homeTeamId: string; awayTeamId: string; dbId: number }[] = []
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

      // Track games that just went live and haven't been notified yet
      if (newStatus === 'live' && sb.status !== 'live' && !sb.live_notified) {
        newlyLive.push({ homeTeamId: sb.home_team_id, awayTeamId: sb.away_team_id, dbId: sb.id })
      }
    }

    // ── 4. Apply game updates ────────────────────────────────────────────────
    let gameErrors = 0
    for (const { id, patch } of gameUpdates) {
      try {
        await supabaseAdmin.from('games').update(patch).eq('id', id)
      } catch (e) {
        console.error(`[sync] game update failed id=${id}:`, e)
        gameErrors++
      }
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
      try { const { error } = await supabaseAdmin
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
      } catch (e) { console.error(`[sync] standings update failed team=${teamId}:`, e) }
    }

    // ── 6. Auto-toggle streams based on linked game status ──────────────────
    // Re-fetch current game statuses (after updates were applied)
    const { data: currentGames } = await supabaseAdmin
      .from('games')
      .select('id, status')
      .eq('season', 2026)

    const gameStatusMap = new Map((currentGames ?? []).map(g => [g.id as number, g.status as string]))

    const { data: linkedStreams } = await supabaseAdmin
      .from('streams')
      .select('id, game_id, is_live')
      .not('game_id', 'is', null)

    let streamsToggled = 0
    for (const s of (linkedStreams ?? [])) {
      const status = gameStatusMap.get(s.game_id as number)
      const shouldLive = status === 'live'
      const shouldOff  = status === 'final'

      if (shouldLive && !s.is_live) {
        await supabaseAdmin.from('streams').update({ is_live: true }).eq('id', s.id)
        streamsToggled++
      } else if (shouldOff && s.is_live) {
        await supabaseAdmin.from('streams').update({ is_live: false }).eq('id', s.id)
        streamsToggled++
      }
    }

    // ── 7. Send live notifications ───────────────────────────────────────────
    let notificationsSent = 0
    if (newlyLive.length > 0) {
      const { data: subscribers } = await supabaseAdmin
        .from('subscribers')
        .select('email, token')

      if (subscribers && subscribers.length > 0) {
        await sendLiveNotification(
          subscribers as { email: string; token: string }[],
          newlyLive.map(g => ({ homeTeamId: g.homeTeamId, awayTeamId: g.awayTeamId }))
        )
        notificationsSent = subscribers.length
      }

      // Mark games as notified
      for (const g of newlyLive) {
        await supabaseAdmin.from('games').update({ live_notified: true }).eq('id', g.dbId)
      }
    }

    return NextResponse.json({
      ok:               true,
      gamesChecked:     steGames.length,
      gamesUpdated:     gameUpdates.length,
      gameErrors,
      newFinals,
      standingsUpdated,
      streamsToggled,
      notificationsSent,
      timestamp:        new Date().toISOString(),
    })
  } catch (err) {
    console.error('[sync]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
