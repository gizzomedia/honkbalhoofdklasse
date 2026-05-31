import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import webpush from 'web-push'

export const runtime = 'nodejs'

function getWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL ?? 'mailto:info@honkbalhoofdklasse.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
  return webpush
}

const KNBSB_TO_TEAM: Record<number, string> = {
  39583: 'pirates', 39587: 'neptunus', 39584: 'hcaw',
  39586: 'kinheim', 39588: 'twins', 39589: 'uvv', 39585: 'pioniers',
}
const TEAM_NAME: Record<string, string> = {
  neptunus: 'Neptunus', pirates: 'Pirates', kinheim: 'Kinheim',
  hcaw: 'HCAW', twins: 'Twins', pioniers: 'Pioniers', uvv: 'UVV',
}
const BASE = 'https://honkbalhoofdklasse.com'

type GameState = {
  status: number
  homeruns: number
  awayruns: number
  innings: Record<string, { home: number; away: number }>
  playerHR: Record<string, number>
  notifiedStart: boolean
  notifiedFinal: boolean
}

function ordinal(n: number): string {
  const s = ['th','st','nd','rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

async function sendToTeams(
  teamIds: string[],
  payload: { title: string; body: string; icon: string; url: string; tag: string }
) {
  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, team_ids')

  if (!subs?.length) return

  const targets = subs.filter(s => {
    if (!s.team_ids || s.team_ids.length === 0) return true // all teams
    return s.team_ids.some((t: string) => teamIds.includes(t))
  })

  await Promise.allSettled(targets.map(async sub => {
    try {
      await getWebPush().sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ ...payload, data: { url: payload.url } }),
        { TTL: 3600 }
      )
    } catch (err: unknown) {
      // Remove invalid subscriptions
      if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }
  }))
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('Authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Fetch live games
  const schedRes = await fetch('https://boxscore.stenwessel.nl/api/fetchschedule.php?competition=hb2026', { cache: 'no-store' })
  const schedData = await schedRes.json()
  const liveGames = (schedData.games ?? []).filter((g: Record<string, unknown>) => g.gamestatus === 1)

  if (!liveGames.length) return NextResponse.json({ ok: true, live: 0 })

  const notifications: string[] = []

  for (const game of liveGames) {
    const gameId: number = game.id
    const homeTeamId = KNBSB_TO_TEAM[game.homeid as number] ?? ''
    const awayTeamId = KNBSB_TO_TEAM[game.awayid as number] ?? ''
    const homeName = TEAM_NAME[homeTeamId] ?? homeTeamId
    const awayName = TEAM_NAME[awayTeamId] ?? awayTeamId
    const teams = [homeTeamId, awayTeamId].filter(Boolean)
    const gameUrl = `/livescores`
    const icon = `${BASE}/api/notification-icon/${homeTeamId}`

    // 2. Load previous state
    const { data: stateRow } = await supabaseAdmin
      .from('push_game_state')
      .select('state_json')
      .eq('game_id', gameId)
      .maybeSingle()

    const prevState: GameState = stateRow?.state_json ?? {
      status: 0, homeruns: 0, awayruns: 0,
      innings: {}, playerHR: {}, notifiedStart: false, notifiedFinal: false,
    }

    // 3. Fetch full game data
    const gdRes = await fetch(
      `https://boxscore.stenwessel.nl/api/fetchgamedata.php?competition=hb2026&game=${gameId}`,
      { cache: 'no-store' }
    )
    if (!gdRes.ok) continue
    const gd = await gdRes.json()
    const gameData = gd.gameData
    const boxScore = gd.boxScore ?? {}

    const newState: GameState = {
      status: gameData.gamestatus,
      homeruns: gameData.homeruns ?? 0,
      awayruns: gameData.awayruns ?? 0,
      innings: {},
      playerHR: { ...prevState.playerHR },
      notifiedStart: prevState.notifiedStart,
      notifiedFinal: prevState.notifiedFinal,
    }

    // Build inning state
    for (let i = 1; i <= 15; i++) {
      const h = gameData[`runshome${i}`] ?? 0
      const a = gameData[`runsaway${i}`] ?? 0
      if (h !== null || a !== null) newState.innings[i] = { home: h ?? 0, away: a ?? 0 }
    }

    // 4. Game start notification
    if (!prevState.notifiedStart && gameData.gamestatus === 1) {
      await sendToTeams(teams, {
        title: `${awayName} @ ${homeName}`,
        body: `Game is now live! ⚾`,
        icon,
        url: gameUrl,
        tag: `game-start-${gameId}`,
      })
      newState.notifiedStart = true
      notifications.push(`start:${gameId}`)
    }

    // 5. Home run detections (per player)
    for (const [, teamPlayers] of Object.entries(boxScore)) {
      if (typeof teamPlayers !== 'object') continue
      for (const [, spots] of Object.entries(teamPlayers as Record<string, unknown>)) {
        const arr = spots as Array<Record<string, unknown>>
        if (!Array.isArray(arr) || !arr[0]) continue
        const player = arr[0]
        const pid = String(player.playerid ?? player.id ?? '')
        const currentHR = Number(player.hr ?? 0)
        const prevHR = prevState.playerHR[pid] ?? 0

        if (currentHR > prevHR) {
          const firstName = String(player.firstname ?? '')
          const lastName = String(player.lastname ?? '')
          const name = `${firstName} ${lastName.charAt(0) + lastName.slice(1).toLowerCase()}`.trim()
          const rbi = Number(player.rbi ?? 0)
          const rbiStr = rbi > 1 ? `${rbi}-run` : 'solo'
          const inning = gameData.innings ?? '?'
          const score = `${awayName} ${gameData.awayruns ?? 0} – ${homeName} ${gameData.homeruns ?? 0}`
          const isHomePlayer = Number(player.home) === 1 || Number(player.teamid) === Number(gameData.homeid)
          const playerTeam = isHomePlayer ? homeTeamId : awayTeamId

          await sendToTeams(teams, {
            title: `${awayName} @ ${homeName} — ${ordinal(Number(inning))} inning`,
            body: `${name} hits a ${rbiStr} home run! ${score}`,
            icon: `${BASE}/api/notification-icon/${playerTeam}`,
            url: gameUrl,
            tag: `hr-${gameId}-${pid}-${currentHR}`,
          })
          newState.playerHR[pid] = currentHR
          notifications.push(`hr:${name}`)
        } else {
          newState.playerHR[pid] = currentHR
        }
      }
    }

    // 6. Inning score change (batched per half-inning)
    for (let i = 1; i <= 15; i++) {
      const cur = newState.innings[i]
      const prev = prevState.innings[i]
      if (!cur) continue

      // Home team scores
      if (cur.home > (prev?.home ?? 0) && prevState.notifiedStart) {
        const runs = cur.home - (prev?.home ?? 0)
        const score = `${awayName} ${gameData.awayruns} – ${homeName} ${gameData.homeruns}`
        await sendToTeams(teams, {
          title: `${awayName} @ ${homeName} — ${ordinal(i)} inning`,
          body: `${homeName} score${runs > 1 ? 's' : 's'} ${runs === 1 ? '1 run' : `${runs} runs`}! ${score}`,
          icon: `${BASE}/api/notification-icon/${homeTeamId}`,
          url: gameUrl,
          tag: `score-home-${gameId}-${i}-${cur.home}`,
        })
        notifications.push(`score-home:${i}`)
      }

      // Away team scores
      if (cur.away > (prev?.away ?? 0) && prevState.notifiedStart) {
        const runs = cur.away - (prev?.away ?? 0)
        const score = `${awayName} ${gameData.awayruns} – ${homeName} ${gameData.homeruns}`
        await sendToTeams(teams, {
          title: `${awayName} @ ${homeName} — ${ordinal(i)} inning`,
          body: `${awayName} score${runs > 1 ? 's' : 's'} ${runs === 1 ? '1 run' : `${runs} runs`}! ${score}`,
          icon: `${BASE}/api/notification-icon/${awayTeamId}`,
          url: gameUrl,
          tag: `score-away-${gameId}-${i}-${cur.away}`,
        })
        notifications.push(`score-away:${i}`)
      }
    }

    // 7. Final
    if (gameData.gamestatus === 2 && !prevState.notifiedFinal && prevState.notifiedStart) {
      const winner = (gameData.homeruns ?? 0) > (gameData.awayruns ?? 0) ? homeName : awayName
      const loser  = winner === homeName ? awayName : homeName
      const winScore = Math.max(gameData.homeruns ?? 0, gameData.awayruns ?? 0)
      const loseScore = Math.min(gameData.homeruns ?? 0, gameData.awayruns ?? 0)
      const wpName = gameData.win ? String(gameData.win).split(' ').pop() ?? '' : ''
      const body = wpName
        ? `${winner} beat ${loser}, ${winScore}–${loseScore}. WP: ${wpName}`
        : `Final: ${winner} ${winScore}, ${loser} ${loseScore}`

      await sendToTeams(teams, {
        title: `Final: ${awayName} @ ${homeName}`,
        body,
        icon,
        url: gameUrl,
        tag: `final-${gameId}`,
      })
      newState.notifiedFinal = true
      notifications.push(`final:${gameId}`)
    }

    // 8. Save new state
    await supabaseAdmin
      .from('push_game_state')
      .upsert({ game_id: gameId, state_json: newState, updated_at: new Date().toISOString() }, { onConflict: 'game_id' })
  }

  return NextResponse.json({ ok: true, live: liveGames.length, sent: notifications })
}
