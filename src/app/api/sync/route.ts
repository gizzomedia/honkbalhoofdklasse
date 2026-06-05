import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendLiveNotification, sendNoHitterNotification } from '@/lib/email'
import { IOC_TO_TEAM } from '@/lib/teams'

const BASE_URL   = 'https://boxscore.stenwessel.nl/api'
const COMPETITION = 'hb2026'

type SteGame = {
  id: number
  gamestatus: number
  start: string          // "2026-04-09 19:30:00" (Amsterdam local time)
  location: string | null
  homeruns: number
  awayruns: number
  homeioc: string
  awayioc: string
  gamestatustext?: string // "T4" = top 4th, "B7" = bottom 7th, etc.
  home_team?: { groupwins: number; grouplosses: number; groupties: number; groupgb: number }
  away_team?: { groupwins: number; grouplosses: number; groupties: number; groupgb: number }
}

// sg.start is Amsterdam local time. Convert to UTC for comparison.
// Season runs Apr-Oct → CEST (UTC+2). Off-season → CET (UTC+1).
function scheduledStartUtcMs(start: string): number {
  if (!start) return 0
  const month = parseInt(start.slice(5, 7), 10)
  const offsetHours = (month >= 4 && month <= 10) ? 2 : 1
  return Date.parse(start.replace(' ', 'T') + 'Z') - offsetHours * 3_600_000
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

      // Track games that just went live and haven't been notified yet.
      // Guard: only notify once the scheduled start time has actually passed (±5 min),
      // so stenwessel marking a game "live" prematurely doesn't fire early notifications.
      if (newStatus === 'live' && sb.status !== 'live' && !sb.live_notified &&
          Date.now() >= scheduledStartUtcMs(String(sg.start ?? '')) - 5 * 60_000) {
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
      .select('id, status, game_date, game_time')
      .eq('season', 2026)

    const gameMap = new Map((currentGames ?? []).map(g => [g.id as number, g]))

    const { data: linkedStreams } = await supabaseAdmin
      .from('streams')
      .select('id, game_id, is_live')
      .not('game_id', 'is', null)

    let streamsToggled = 0
    for (const s of (linkedStreams ?? [])) {
      const game = gameMap.get(s.game_id as number)
      if (!game) continue

      const shouldOff = game.status === 'final'

      // Go live when the game is live, or 15 minutes before scheduled start.
      let shouldLive = game.status === 'live'
      if (!shouldLive && game.status === 'scheduled' && game.game_date && game.game_time) {
        const startUtcMs = scheduledStartUtcMs(`${game.game_date} ${game.game_time}`)
        shouldLive = startUtcMs > 0 && Date.now() >= startUtcMs - 15 * 60_000
      }

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

    // ── 8. No-hitter alert: fire once a pitcher has 0 hits through 6+ innings ──
    // Collect live games where gamestatustext indicates inning ≥ 7.
    type NoHitterAlert = {
      gameId: string
      homeTeamId: string
      awayTeamId: string
      pitchingTeamId: string
      inning: number
    }

    const candidateGames = steGames.filter(sg => {
      if (gameStatus(sg.gamestatus) !== 'live') return false
      const stMatch = String(sg.gamestatustext ?? '').match(/^([TB])(\d+)$/)
      return stMatch ? parseInt(stMatch[2]) >= 7 : false
    })

    let noHitterAlertsSent = 0

    if (candidateGames.length > 0) {
      // Batch-check which games already have a no-hitter notification logged
      const alreadyNotified = new Set<string>()
      await Promise.all(candidateGames.map(async sg => {
        const { data } = await supabaseAdmin
          .from('notification_log')
          .select('id')
          .eq('type', 'nohitter')
          .eq('date_key', String(sg.id))
          .maybeSingle()
        if (data) alreadyNotified.add(String(sg.id))
      }))

      const unchecked = candidateGames.filter(sg => !alreadyNotified.has(String(sg.id)))

      // Fetch boxscores in parallel to check hit counts
      const alerts: NoHitterAlert[] = []
      await Promise.all(unchecked.map(async sg => {
        const sb = sbByExtId.get(String(sg.id))
        if (!sb) return
        const stMatch = String(sg.gamestatustext ?? '').match(/^([TB])(\d+)$/)
        const inning  = stMatch ? parseInt(stMatch[2]) : 0
        try {
          const r  = await fetch(`${BASE_URL}/fetchgamedata.php?competition=${COMPETITION}&game=${sg.id}`, { cache: 'no-store' })
          const bs = await r.json()
          const gd = bs.gameData as Record<string, unknown>
          const awayHits = gd.awayhits == null ? -1 : Number(gd.awayhits)
          const homeHits = gd.homehits == null ? -1 : Number(gd.homehits)
          if (awayHits === 0) {
            alerts.push({ gameId: String(sg.id), homeTeamId: sb.home_team_id, awayTeamId: sb.away_team_id, pitchingTeamId: sb.home_team_id, inning })
          } else if (homeHits === 0) {
            alerts.push({ gameId: String(sg.id), homeTeamId: sb.home_team_id, awayTeamId: sb.away_team_id, pitchingTeamId: sb.away_team_id, inning })
          }
        } catch { /* skip */ }
      }))

      if (alerts.length > 0) {
        const { data: nhSubscribers } = await supabaseAdmin.from('subscribers').select('email, token')

        for (const alert of alerts) {
          // Insert log first; skip if duplicate (another cron run beat us to it)
          const { error: logErr } = await supabaseAdmin
            .from('notification_log')
            .insert({ type: 'nohitter', date_key: alert.gameId })
          if (logErr) continue

          if (nhSubscribers && nhSubscribers.length > 0) {
            await sendNoHitterNotification(
              nhSubscribers as { email: string; token: string }[],
              [alert],
            )
            noHitterAlertsSent++
          }
        }
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
      noHitterAlertsSent,
      timestamp:        new Date().toISOString(),
    })
  } catch (err) {
    console.error('[sync]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
