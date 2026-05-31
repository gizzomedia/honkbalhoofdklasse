import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import webpush from 'web-push'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL ?? 'mailto:info@honkbalhoofdklasse.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')

  if (!subs?.length) return NextResponse.json({ ok: true, sent: 0, msg: 'No subscribers' })

  const payload = JSON.stringify({
    title: 'Twins @ Pioniers — 4th inning',
    body: 'Darryl Collins hits a solo home run! TWI 3 – PIO 1',
    icon: 'https://honkbalhoofdklasse.com/api/notification-icon/twins',
    tag: 'test-notif',
    data: { url: '/livescores' },
  })

  let sent = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 60 }
      )
      sent++
    } catch { /* ignore */ }
  }

  return NextResponse.json({ ok: true, sent, total: subs.length })
}
