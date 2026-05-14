import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function checkAuth(req: NextRequest) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

// Scrape Instagram og tags server-side using Facebook's crawler UA
async function scrapeInstagram(url: string) {
  const match = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/)
  const shortcode = match?.[1]
  if (!shortcode) throw new Error('Geen geldige Instagram URL')

  const res = await fetch(`https://www.instagram.com/p/${shortcode}/`, {
    headers: {
      'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })

  const html = await res.text()

  const ogDesc  = html.match(/<meta property="og:description" content="([^"]+)"/)?.[1] ?? ''
  const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? ''
  const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ?? ''

  // og:description format: "X likes, Y comments - Name on Instagram: "Caption text""
  let caption = ogDesc
  const capMatch = ogDesc.match(/on Instagram: "([\s\S]+)"$/)
  if (capMatch) caption = capMatch[1]
  caption = caption.replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c))).trim()

  // og:title format: "Name • Instagram" or "Name (@handle) • Instagram"
  let author = ogTitle.replace(/\s*[•·]\s*Instagram.*/, '').replace(/\s*\(@[^)]+\)/, '').trim()
  if (!author) author = 'Instagram'

  return { shortcode, caption: caption.slice(0, 600), thumbnail_url: ogImage || null, author }
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabaseAdmin
    .from('highlights')
    .select('*')
    .order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { instagram_url, preview } = await req.json()
  if (!instagram_url) return NextResponse.json({ error: 'URL verplicht' }, { status: 400 })

  // If preview=true: just return scraped data, don't save
  if (preview) {
    try {
      const scraped = await scrapeInstagram(instagram_url)
      return NextResponse.json(scraped)
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 422 })
    }
  }

  // Otherwise save
  try {
    const scraped = await scrapeInstagram(instagram_url)
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabaseAdmin.from('highlights').insert({
      instagram_url,
      ...scraped,
      expires_at,
    }).select().single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await supabaseAdmin.from('highlights').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
