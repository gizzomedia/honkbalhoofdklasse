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
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bedankt voor je aanvraag</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px">
<tr><td align="center">
<table width="100%" style="max-width:560px">

  <!-- Top brand bar -->
  <tr>
    <td style="background:#fe3d00;border-radius:12px 12px 0 0;padding:16px 32px" align="center">
      <p style="margin:0;font-size:12px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#fff">
        HONKBAL HOOFDKLASSE
      </p>
    </td>
  </tr>

  <!-- Main white card -->
  <tr>
    <td style="background:#ffffff;padding:40px 40px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">

      <h1 style="margin:0 0 8px;font-size:30px;font-weight:900;color:#0f172a;line-height:1.2">
        Bedankt, ${name}!
      </h1>
      <p style="margin:0 0 24px;font-size:13px;font-weight:600;color:#fe3d00;text-transform:uppercase;letter-spacing:2px">
        Partner-aanvraag ontvangen
      </p>

      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155">
        We hebben de aanvraag van <strong style="color:#0f172a">${company}</strong> ontvangen en nemen binnen <strong style="color:#fe3d00">2 werkdagen</strong> contact met je op voor een kennismaking.
      </p>
      <p style="margin:0 0 32px;font-size:15px;line-height:1.7;color:#64748b">
        We kijken uit naar een mogelijke samenwerking en zijn benieuwd naar jullie merk en doelen.
      </p>

      <!-- Stats -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
        <tr>
          <td style="padding:18px 12px;text-align:center;border-right:1px solid #e2e8f0">
            <p style="margin:0;font-size:22px;font-weight:900;color:#fe3d00;line-height:1">2.25M+</p>
            <p style="margin:4px 0 0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;font-weight:700">Weergaven</p>
          </td>
          <td style="padding:18px 12px;text-align:center;border-right:1px solid #e2e8f0">
            <p style="margin:0;font-size:22px;font-weight:900;color:#fe3d00;line-height:1">68K+</p>
            <p style="margin:4px 0 0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;font-weight:700">Interacties</p>
          </td>
          <td style="padding:18px 12px;text-align:center">
            <p style="margin:0;font-size:22px;font-weight:900;color:#fe3d00;line-height:1">7</p>
            <p style="margin:4px 0 0;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;font-weight:700">Clubs</p>
          </td>
        </tr>
      </table>

      <!-- CTA -->
      <a href="${SITE}/partner-up"
         style="display:block;background:#fe3d00;color:#fff;text-decoration:none;padding:15px 28px;border-radius:8px;font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:1.5px;text-align:center">
        Bekijk partner-mogelijkheden →
      </a>

    </td>
  </tr>

  <!-- Divider -->
  <tr>
    <td style="background:#fff;padding:0 40px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:0">
    </td>
  </tr>

  <!-- Contact persons -->
  <tr>
    <td style="background:#fff;padding:28px 40px 32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <!-- Gijs -->
          <td width="50%" style="padding-right:12px">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:12px;vertical-align:top">
                  <img src="https://res.cloudinary.com/dn8c5398m/image/upload/q_auto,f_auto,w_80,h_80,c_fill,g_face/v1780517528/Linkedin_final_2_txwecf.jpg"
                       alt="Gijs van Zalingen" width="48" height="48"
                       style="border-radius:50%;display:block;border:2px solid #e2e8f0">
                </td>
                <td style="vertical-align:top">
                  <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;line-height:1.2">Gijs van Zalingen</p>
                  <p style="margin:2px 0 0;font-size:12px;color:#94a3b8">Honkbal Hoofdklasse</p>
                </td>
              </tr>
            </table>
          </td>
          <!-- Louie -->
          <td width="50%" style="padding-left:12px">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:12px;vertical-align:top">
                  <img src="https://res.cloudinary.com/dn8c5398m/image/upload/q_auto,f_auto,w_80,h_80,c_fill,g_face/v1780517686/1774275060262_ulsx5l.jpg"
                       alt="Louie Jay Sienders" width="48" height="48"
                       style="border-radius:50%;display:block;border:2px solid #e2e8f0">
                </td>
                <td style="vertical-align:top">
                  <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;line-height:1.2">Louie Jay Sienders</p>
                  <p style="margin:2px 0 0;font-size:12px;color:#94a3b8">Honkbal Hoofdklasse</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:20px 40px" align="center">
      <p style="margin:0;font-size:12px;color:#94a3b8">
        © 2026 Honkbal Hoofdklasse &nbsp;·&nbsp;
        <a href="https://instagram.com/honkbalhoofdklasse" style="color:#fe3d00;text-decoration:none">@honkbalhoofdklasse</a>
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
