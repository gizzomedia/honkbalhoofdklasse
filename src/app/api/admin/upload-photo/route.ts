import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import sharp from 'sharp'

const TARGET_BYTES = 500 * 1024 // 500 KB

async function compress(buffer: Buffer, isHeadshot: boolean): Promise<{ data: Buffer; contentType: string }> {
  const maxWidth = isHeadshot ? 800 : 1600

  // Try progressively lower quality until under 500 KB
  for (let quality = 82; quality >= 20; quality -= 10) {
    const data = await sharp(buffer)
      .resize({ width: maxWidth, withoutEnlargement: true })
      .jpeg({ quality, progressive: true })
      .toBuffer()

    if (data.length <= TARGET_BYTES || quality <= 20) {
      return { data, contentType: 'image/jpeg' }
    }
  }

  // Fallback (shouldn't reach here)
  const data = await sharp(buffer).resize({ width: maxWidth, withoutEnlargement: true }).jpeg({ quality: 20 }).toBuffer()
  return { data, contentType: 'image/jpeg' }
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-password') !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData  = await req.formData()
  const file      = formData.get('file') as File | null
  const playerName = formData.get('playerName') as string | null
  const teamId    = formData.get('teamId') as string | null
  const photoType = formData.get('photoType') as 'banner' | 'headshot' | null

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

  const path = `${slug}/${photoType}.jpg`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('player-photos')
    .upload(path, compressed, { contentType, upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage.from('player-photos').getPublicUrl(path)
  const col     = photoType === 'banner' ? 'banner_url' : 'headshot_url'
  const sizeCol = photoType === 'banner' ? 'banner_size_kb' : 'headshot_size_kb'
  const sizeKb  = Math.round(compressed.length / 1024)

  const { data: existing } = await supabaseAdmin
    .from('player_photos')
    .select('id')
    .ilike('player_name', playerName)
    .maybeSingle()

  if (existing) {
    await supabaseAdmin
      .from('player_photos')
      .update({ [col]: urlData.publicUrl, [sizeCol]: sizeKb, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabaseAdmin
      .from('player_photos')
      .insert({ player_name: playerName, team_id: teamId, [col]: urlData.publicUrl, [sizeCol]: sizeKb })
  }

  return NextResponse.json({
    url: urlData.publicUrl,
    size_kb: Math.round(compressed.length / 1024),
  })
}
