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
      subject: `Bedankt ${name} — we nemen snel contact op`,
      html: `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1520;font-family:system-ui,-apple-system,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1520;padding:32px 16px">
<tr><td align="center">
<table width="100%" style="max-width:560px;border-radius:16px;overflow:hidden;background:#0d1520;border:1px solid #1e2e42">

  <!-- Logo header -->
  <tr>
    <td style="background:#060e1b;padding:24px 32px;border-bottom:1px solid #1e2e42" align="center">
      <img src="https://res.cloudinary.com/dqld625sq/image/upload/v1778542430/logo_hk_abi5hm.png"
           alt="Honkbal Hoofdklasse" width="80" style="display:block;margin:0 auto">
    </td>
  </tr>

  <!-- Orange hero -->
  <tr>
    <td style="background:linear-gradient(135deg,#fe3d00 0%,#cc3000 100%);padding:40px 32px">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,0.7);font-weight:700">
        Partner-aanvraag ontvangen
      </p>
      <h1 style="margin:0;font-size:32px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:-0.5px;line-height:1.1">
        Bedankt,<br>${name}!
      </h1>
    </td>
  </tr>

  <!-- Main message -->
  <tr>
    <td style="padding:36px 32px 28px">
      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#e8f0f8">
        We hebben je aanvraag van <strong style="color:#fff">${company}</strong> in goede orde ontvangen.
        Ons team neemt binnen <strong style="color:#fe3d00">2 werkdagen</strong> contact met je op voor een kennismaking.
      </p>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#8ba0b8">
        We kijken uit naar de samenwerking en zijn benieuwd naar jullie merk en doelen.
      </p>
    </td>
  </tr>

  <!-- Stats row -->
  <tr>
    <td style="padding:0 32px 32px">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#060e1b;border-radius:12px;border:1px solid #1e2e42;overflow:hidden">
        <tr>
          <td style="padding:20px;text-align:center;border-right:1px solid #1e2e42">
            <p style="margin:0;font-size:24px;font-weight:900;color:#fe3d00;line-height:1">2.25M+</p>
            <p style="margin:4px 0 0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#4a6a8a;font-weight:700">Weergaven</p>
          </td>
          <td style="padding:20px;text-align:center;border-right:1px solid #1e2e42">
            <p style="margin:0;font-size:24px;font-weight:900;color:#fe3d00;line-height:1">68K+</p>
            <p style="margin:4px 0 0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#4a6a8a;font-weight:700">Interacties</p>
          </td>
          <td style="padding:20px;text-align:center">
            <p style="margin:0;font-size:24px;font-weight:900;color:#fe3d00;line-height:1">7</p>
            <p style="margin:4px 0 0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#4a6a8a;font-weight:700">Clubs</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- CTA -->
  <tr>
    <td style="padding:0 32px 36px">
      <a href="${SITE}/partner-up"
         style="display:block;background:#fe3d00;color:#fff;text-decoration:none;padding:15px 28px;border-radius:10px;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:1.5px;text-align:center">
        Bekijk partner-mogelijkheden →
      </a>
    </td>
  </tr>

  <!-- Divider -->
  <tr><td style="border-top:1px solid #1e2e42"></td></tr>

  <!-- Question block -->
  <tr>
    <td style="padding:28px 32px">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#8ba0b8;text-transform:uppercase;letter-spacing:1px">Vragen?</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#8ba0b8">
        Stuur een DM via
        <a href="https://instagram.com/honkbalhoofdklasse" style="color:#fe3d00;text-decoration:none;font-weight:700">@honkbalhoofdklasse</a>
        op Instagram of beantwoord deze mail.
      </p>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#060e1b;padding:20px 32px;border-top:1px solid #1e2e42" align="center">
      <p style="margin:0;font-size:11px;color:#2a3a4a;letter-spacing:1px;text-transform:uppercase">
        © 2026 Honkbal Hoofdklasse &nbsp;·&nbsp; KNBSB
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`,
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
