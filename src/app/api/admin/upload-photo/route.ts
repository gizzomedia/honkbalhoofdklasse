import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  if (req.headers.get('x-admin-password') !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const playerName = formData.get('playerName') as string | null
  const teamId = formData.get('teamId') as string | null
  const photoType = formData.get('photoType') as 'banner' | 'headshot' | null

  if (!file || !playerName || !photoType) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const slug = playerName
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents: á→a, é→e
    .replace(/[^a-z0-9\s-]/g, '')                     // remove remaining special chars
    .trim().replace(/\s+/g, '-')
  const path = `${slug}/${photoType}.${ext}`

  const bytes = await file.arrayBuffer()
  const { error: uploadError } = await supabaseAdmin.storage
    .from('player-photos')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage
    .from('player-photos')
    .getPublicUrl(path)

  const col = photoType === 'banner' ? 'banner_url' : 'headshot_url'

  const { data: existing } = await supabaseAdmin
    .from('player_photos')
    .select('id')
    .ilike('player_name', playerName)
    .maybeSingle()

  if (existing) {
    await supabaseAdmin
      .from('player_photos')
      .update({ [col]: urlData.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabaseAdmin
      .from('player_photos')
      .insert({ player_name: playerName, team_id: teamId, [col]: urlData.publicUrl })
  }

  return NextResponse.json({ url: urlData.publicUrl })
}
