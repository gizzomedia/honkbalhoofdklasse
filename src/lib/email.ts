import { Resend } from 'resend'
import { TEAM_NAMES } from '@/lib/teams'

const FROM = process.env.FROM_EMAIL ?? 'Honkbal Hoofdklasse <noreply@honkbalhoofdklasse.com>'
const SITE = 'https://honkbalhoofdklasse.com'

function baseTemplate(content: string, unsubUrl: string) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#060e1b;color:#fff;border-radius:12px;overflow:hidden">
      ${content}
      <div style="padding:16px 28px;border-top:1px solid #1e2e42">
        <a href="${unsubUrl}" style="color:#4a6a8a;font-size:11px;text-decoration:none">Unsubscribe</a>
      </div>
    </div>
  `
}

export async function sendLiveNotification(
  emails: { email: string; token: string }[],
  games: { homeTeamId: string; awayTeamId: string }[]
) {
  if (!process.env.RESEND_API_KEY || emails.length === 0 || games.length === 0) return
  const resend = new Resend(process.env.RESEND_API_KEY)

  const gameList = games
    .map(g => `${TEAM_NAMES[g.awayTeamId] ?? g.awayTeamId} @ ${TEAM_NAMES[g.homeTeamId] ?? g.homeTeamId}`)
    .join('<br>')

  const subject = games.length === 1
    ? `🔴 LIVE: ${TEAM_NAMES[games[0].awayTeamId] ?? games[0].awayTeamId} @ ${TEAM_NAMES[games[0].homeTeamId] ?? games[0].homeTeamId}`
    : `🔴 ${games.length} wedstrijden nu LIVE`

  await Promise.allSettled(
    emails.map(({ email, token }) => {
      const unsubUrl = `${SITE}/api/subscribe?email=${encodeURIComponent(email)}&token=${token}`
      return resend.emails.send({
        from: FROM,
        to: email,
        subject,
        html: baseTemplate(`
          <div style="background:#fe3d00;padding:20px 28px">
            <p style="margin:0;font-size:11px;letter-spacing:3px;text-transform:uppercase;opacity:.8">Honkbal Hoofdklasse</p>
            <h1 style="margin:6px 0 0;font-size:26px;font-weight:900;text-transform:uppercase">🔴 Live Now</h1>
          </div>
          <div style="padding:28px">
            <p style="margin:0 0 16px;font-size:18px;font-weight:700;line-height:1.5">${gameList}</p>
            <p style="margin:0 0 24px;color:#8ba0b8;font-size:14px">
              ${games.length === 1 ? 'This game has' : 'These games have'} just started. Follow the live scores and boxscore on the website.
            </p>
            <a href="${SITE}/livescores"
              style="display:inline-block;background:#fe3d00;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:1px">
              View live scores →
            </a>
          </div>
        `, unsubUrl),
      })
    })
  )
}

export async function sendGameNotification(
  emails: { email: string; token: string }[],
  type: 'pickle' | 'immaculate'
) {
  if (!process.env.RESEND_API_KEY || emails.length === 0) return
  const resend = new Resend(process.env.RESEND_API_KEY)

  const isPickle = type === 'pickle'
  const subject  = isPickle ? "🥒 Today's Pickle is live!" : '⚾ New Immaculate Grid!'
  const emoji    = isPickle ? '🥒' : '⚾'
  const title    = isPickle ? 'Pickle' : 'Immaculate Grid'
  const desc     = isPickle
    ? "Guess today's Honkbal Hoofdklasse player. You have 9 attempts."
    : 'A new baseball grid is available. How well do you know the players?'
  const url      = isPickle ? `${SITE}/pickle` : `${SITE}/immaculate`
  const btnLabel = isPickle ? 'Play Pickle →' : 'Play Immaculate →'

  await Promise.allSettled(
    emails.map(({ email, token }) => {
      const unsubUrl = `${SITE}/api/subscribe?email=${encodeURIComponent(email)}&token=${token}`
      return resend.emails.send({
        from: FROM,
        to: email,
        subject,
        html: baseTemplate(`
          <div style="background:#1e335a;padding:20px 28px">
            <p style="margin:0;font-size:11px;letter-spacing:3px;text-transform:uppercase;opacity:.8">Honkbal Hoofdklasse</p>
            <h1 style="margin:6px 0 0;font-size:26px;font-weight:900;text-transform:uppercase">${emoji} ${title}</h1>
          </div>
          <div style="padding:28px">
            <p style="margin:0 0 8px;font-size:22px;font-weight:800">New game available!</p>
            <p style="margin:0 0 24px;color:#8ba0b8;font-size:15px">${desc}</p>
            <a href="${url}"
              style="display:inline-block;background:#fe3d00;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:1px">
              ${btnLabel}
            </a>
          </div>
        `, unsubUrl),
      })
    })
  )
}
