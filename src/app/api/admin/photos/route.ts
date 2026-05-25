import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function checkAuth(req: NextRequest) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

function storagePathFromUrl(url: string): string | null {
  const match = url.match(/\/player-photos\/(.+?)(?:\?|$)/)
  return match ? match[1] : null
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('player_photos')
    .select('player_name, banner_url, headshot_url, banner_focal_x, banner_focal_y, banner_size_kb, headshot_size_kb')

  return NextResponse.json(data ?? [], {
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { playerName, focalX, focalY } = await req.json()
  if (!playerName || focalX == null || focalY == null) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  await supabaseAdmin
    .from('player_photos')
    .update({ banner_focal_x: focalX, banner_focal_y: focalY })
    .ilike('player_name', playerName)

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { playerName, photoType } = await req.json()
  if (!playerName || !photoType) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const col = photoType === 'banner' ? 'banner_url' : 'headshot_url'

  // Fetch the current URL so we can remove the file from storage too
  const { data: existing } = await supabaseAdmin
    .from('player_photos')
    .select('id, banner_url, headshot_url')
    .ilike('player_name', playerName)
    .maybeSingle()

  if (existing) {
    const oldUrl = (existing as Record<string, unknown>)[col] as string | null
    if (oldUrl) {
      const oldPath = storagePathFromUrl(oldUrl)
      if (oldPath) {
        await supabaseAdmin.storage.from('player-photos').remove([oldPath])
      }
    }

    await supabaseAdmin
      .from('player_photos')
      .update({ [col]: null })
      .eq('id', existing.id)
  }

  return NextResponse.json({ ok: true })
}
