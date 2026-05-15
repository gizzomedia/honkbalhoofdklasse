import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import sharp from 'sharp'

const TARGET_BYTES = 500 * 1024

async function compress(buffer: Buffer, isHeadshot: boolean): Promise<Buffer> {
  const maxWidth = isHeadshot ? 800 : 1600
  for (let quality = 82; quality >= 20; quality -= 10) {
    const data = await sharp(buffer)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .jpeg({ quality, progressive: true })
      .toBuffer()
    if (data.length <= TARGET_BYTES) return data
  }
  return sharp(buffer).resize({ width: maxWidth, withoutEnlargement: true }).jpeg({ quality: 20 }).toBuffer()
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-password') !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { playerName, photoType } = await req.json() as { playerName: string; photoType: 'banner' | 'headshot' }
  if (!playerName || !photoType) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const col = photoType === 'banner' ? 'banner_url' : 'headshot_url'

  const { data: record } = await supabaseAdmin
    .from('player_photos')
    .select('id, banner_url, headshot_url')
    .ilike('player_name', playerName)
    .maybeSingle()

  const url = record?.[col] as string | null
  if (!url) return NextResponse.json({ skipped: 'no url' })

  // Download current image
  const fetchRes = await fetch(url, { cache: 'no-store' })
  if (!fetchRes.ok) return NextResponse.json({ skipped: 'download failed' })

  const originalBuffer = Buffer.from(await fetchRes.arrayBuffer())
  const originalKb = Math.round(originalBuffer.length / 1024)

  // Skip if already small enough
  if (originalBuffer.length <= TARGET_BYTES) {
    return NextResponse.json({ skipped: true, size_kb: originalKb, reason: 'already under 500 KB' })
  }

  const compressed = await compress(originalBuffer, photoType === 'headshot')
  const compressedKb = Math.round(compressed.length / 1024)

  // Build storage path from URL
  const slug = playerName
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-')
  const path = `${slug}/${photoType}.jpg`

  const { error } = await supabaseAdmin.storage
    .from('player-photos')
    .upload(path, compressed, { contentType: 'image/jpeg', upsert: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: urlData } = supabaseAdmin.storage.from('player-photos').getPublicUrl(path)

  const sizeCol = photoType === 'banner' ? 'banner_size_kb' : 'headshot_size_kb'
  await supabaseAdmin
    .from('player_photos')
    .update({ [col]: urlData.publicUrl, [sizeCol]: compressedKb })
    .eq('id', record!.id)

  return NextResponse.json({ ok: true, original_kb: originalKb, compressed_kb: compressedKb })
}
