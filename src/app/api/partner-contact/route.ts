import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

const SITE = 'https://honkbalhoofdklasse.com'
const NOTIFY_EMAIL = 'hoofdklasseinsta@gmail.com'
const TG_CHAT = process.env.PARTNER_TELEGRAM_CHAT_ID ?? '-1003763285383'

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML' }),
  })
}

export async function POST(req: NextRequest) {
  const { company, name, email, phone, message } = await req.json()
  if (!company || !name || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const errors: string[] = []

  // 1. Save to Supabase
  const { error: dbErr } = await supabaseAdmin.from('partner_leads').insert({
    company, name, email,
    phone: phone || null,
    message: message || null,
  })
  if (dbErr) errors.push(`DB: ${dbErr.message}`)

  // 2. Confirmation email to the submitter
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Honkbal Hoofdklasse <noreply@honkbalhoofdklasse.com>',
      to: email,
      subject: 'Bedankt voor je aanvraag — Honkbal Hoofdklasse',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#060e1b;color:#fff;border-radius:12px;overflow:hidden">
          <div style="background:#fe3d00;padding:20px 28px">
            <p style="margin:0;font-size:11px;letter-spacing:3px;text-transform:uppercase;opacity:.8">Honkbal Hoofdklasse</p>
            <h1 style="margin:6px 0 0;font-size:24px;font-weight:900;text-transform:uppercase">Bedankt, ${name}!</h1>
          </div>
          <div style="padding:28px">
            <p style="margin:0 0 16px;font-size:16px;line-height:1.6">
              We hebben je aanvraag van <strong>${company}</strong> ontvangen en nemen binnen <strong>2 werkdagen</strong> contact met je op.
            </p>
            <p style="margin:0 0 24px;color:#8ba0b8;font-size:14px">
              Heb je in de tussentijd vragen? Stuur dan een berichtje via Instagram <a href="https://instagram.com/honkbalhoofdklasse" style="color:#fe3d00">@honkbalhoofdklasse</a>.
            </p>
            <a href="${SITE}/partner-up"
              style="display:inline-block;background:#fe3d00;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:1px">
              Bekijk partner-mogelijkheden →
            </a>
          </div>
          <div style="padding:16px 28px;border-top:1px solid #1e2e42">
            <p style="margin:0;color:#4a6a8a;font-size:11px">© 2026 Honkbal Hoofdklasse</p>
          </div>
        </div>
      `,
    }).catch(e => errors.push(`Email confirm: ${e.message}`))

    // 3. Internal notification email
    await resend.emails.send({
      from: 'Partner Form <noreply@honkbalhoofdklasse.com>',
      to: NOTIFY_EMAIL,
      subject: `Nieuwe partner-aanvraag: ${company}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px">
          <h2>Nieuwe partner-aanvraag</h2>
          <table style="border-collapse:collapse;width:100%">
            <tr><td style="padding:6px 12px 6px 0;color:#888;font-size:13px">Bedrijf</td><td style="font-size:14px;font-weight:600">${company}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#888;font-size:13px">Naam</td><td style="font-size:14px">${name}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#888;font-size:13px">Email</td><td style="font-size:14px"><a href="mailto:${email}">${email}</a></td></tr>
            ${phone ? `<tr><td style="padding:6px 12px 6px 0;color:#888;font-size:13px">Telefoon</td><td style="font-size:14px">${phone}</td></tr>` : ''}
            ${message ? `<tr><td style="padding:6px 12px 6px 0;color:#888;font-size:13px;vertical-align:top">Bericht</td><td style="font-size:14px">${message.replace(/\n/g, '<br>')}</td></tr>` : ''}
          </table>
        </div>
      `,
    }).catch(e => errors.push(`Email notify: ${e.message}`))
  }

  // 4. Telegram notification
  await sendTelegram(
    `📋 <b>Nieuwe partner-aanvraag</b>\n\n` +
    `🏢 <b>${company}</b>\n` +
    `👤 ${name}\n` +
    `📧 ${email}` +
    (phone ? `\n📞 ${phone}` : '') +
    (message ? `\n\n💬 ${message}` : '')
  ).catch(e => errors.push(`Telegram: ${e}`))

  return NextResponse.json({ ok: true, errors: errors.length ? errors : undefined })
}
