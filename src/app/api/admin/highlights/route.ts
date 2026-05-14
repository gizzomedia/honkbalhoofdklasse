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

  function decodeEntities(s: string) {
    return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
  }

  const ogDesc      = html.match(/<meta property="og:description" content="([^"]+)"/)?.[1] ?? ''
  const ogImage     = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? ''
  const ogTitle     = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ?? ''
  const ogVideoType = html.match(/<meta property="og:video:type" content="([^"]+)"/)?.[1] ?? ''
  const ogVideoRaw  = html.match(/<meta property="og:video:secure_url" content="([^"]+)"/)?.[1]
                   ?? html.match(/<meta property="og:video" content="([^"]+)"/)?.[1]
                   ?? ''

  // Only use as video URL if it's a real mp4, not an embed page URL
  const video_url = (ogVideoType === 'video/mp4' && ogVideoRaw)
    ? decodeEntities(ogVideoRaw)
    : null

  // og:description: "X likes, Y comments - Name on Instagram: "Caption""
  let caption = ogDesc
  const capMatch = ogDesc.match(/on Instagram: "([\s\S]+)"$/)
  if (capMatch) caption = capMatch[1]
  caption = decodeEntities(caption).trim()

  let author = ogTitle.replace(/\s*[•·]\s*Instagram.*/, '').replace(/\s*\(@[^)]+\)/, '').trim()
  if (!author) author = 'Instagram'

  return { shortcode, caption: caption.slice(0, 600), thumbnail_url: ogImage || null, author, video_url }
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
  const { instagram_url, video_url_override, preview } = await req.json()
  if (!instagram_url) return NextResponse.json({ error: 'URL verplicht' }, { status: 400 })

  if (preview) {
    try {
      const scraped = await scrapeInstagram(instagram_url)
      return NextResponse.json(scraped)
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 422 })
    }
  }

  try {
    const scraped = await scrapeInstagram(instagram_url)
    // Manual override wins over auto-extracted URL
    if (video_url_override) scraped.video_url = video_url_override
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
