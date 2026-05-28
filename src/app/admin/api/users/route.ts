import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'

async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  const { data } = await supabaseAdmin
    .from('admin_users')
    .select('is_super_admin')
    .eq('email', user.email)
    .single()

  return data?.is_super_admin ? user.email : null
}

export async function GET() {
  const caller = await assertSuperAdmin()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .select('*')
    .order('email')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const caller = await assertSuperAdmin()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const body = await request.json()
  const email = body.email?.trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const { error } = await supabaseAdmin.from('admin_users').insert({
    email,
    name: null,
    can_photos: false,
    can_analytics: false,
    can_livestream: false,
    can_highlights: false,
    is_super_admin: false,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request) {
  const caller = await assertSuperAdmin()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { email, key, value } = await request.json()
  if (!email || !key) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('admin_users')
    .update({ [key]: value })
    .eq('email', email)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const caller = await assertSuperAdmin()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('admin_users')
    .delete()
    .eq('email', email)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
