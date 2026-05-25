import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import sharp from 'sharp'

const TARGET_BYTES = 500 * 1024 // 500 KB

async function compress(buffer: Buffer, isHeadshot: boolean): Promise<{ data: Buffer; contentType: string }> {
  const maxWidth = isHeadshot ? 800 : 1600

  for (let quality = 82; quality >= 20; quality -= 10) {
    const data = await sharp(buffer)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .jpeg({ quality, progressive: true })
      .toBuffer()

    if (data.length <= TARGET_BYTES || quality <= 20) {
      return { data, contentType: 'image/jpeg' }
    }
  }

  const data = await sharp(buffer).resize({ width: maxWidth, withoutEnlargement: true }).jpeg({ quality: 20 }).toBuffer()
  return { data, contentType: 'image/jpeg' }
}

function storagePathFromUrl(url: string): string | null {
  // e.g. https://xxx.supabase.co/storage/v1/object/public/player-photos/slug/banner-123.jpg?v=...
  const match = url.match(/\/player-photos\/(.+?)(?:\?|$)/)
  return match ? match[1] : null
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-password') !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData   = await req.formData()
  const file       = formData.get('file') as File | null
  const playerName = formData.get('playerName') as string | null
  const teamId     = formData.get('teamId') as string | null
  const photoType  = formData.get('photoType') as 'banner' | 'headshot' | null

  if (!file || !playerName || !photoType) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 })
  }

  const slug = playerName
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-')

  const rawBuffer = Buffer.from(await file.arrayBuffer())
  const { data: compressed, contentType } = await compress(rawBuffer, photoType === 'headshot')

  // Unique path — timestamp ensures a fresh CDN entry every upload
  const path = `${slug}/${photoType}-${Date.now()}.jpg`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('player-photos')
    .upload(path, compressed, { contentType, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage.from('player-photos').getPublicUrl(path)
  const publicUrl = urlData.publicUrl
  const col       = photoType === 'banner' ? 'banner_url' : 'headshot_url'
  const sizeCol   = photoType === 'banner' ? 'banner_size_kb' : 'headshot_size_kb'
  const sizeKb    = Math.round(compressed.length / 1024)

  const { data: existing } = await supabaseAdmin
    .from('player_photos')
    .select('id, banner_url, headshot_url')
    .ilike('player_name', playerName)
    .maybeSingle()

  if (existing) {
    // Delete old file from storage so it doesn't linger
    const oldUrl = photoType === 'banner' ? existing.banner_url : existing.headshot_url
    if (oldUrl) {
      const oldPath = storagePathFromUrl(oldUrl)
      if (oldPath && oldPath !== path) {
        await supabaseAdmin.storage.from('player-photos').remove([oldPath])
      }
    }

    await supabaseAdmin
      .from('player_photos')
      .update({ [col]: publicUrl, [sizeCol]: sizeKb, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabaseAdmin
      .from('player_photos')
      .insert({ player_name: playerName, team_id: teamId, [col]: publicUrl, [sizeCol]: sizeKb })
  }

  return NextResponse.json({ url: publicUrl, size_kb: sizeKb })
}
