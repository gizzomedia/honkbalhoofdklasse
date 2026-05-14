import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const revalidate = 0

export async function GET() {
  const { data } = await supabase
    .from('highlights')
    .select('id, instagram_url, shortcode, author, caption, thumbnail_url, expires_at, created_at')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}
