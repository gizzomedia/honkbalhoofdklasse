import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('batting_stats')
    .select('series_week')
    .eq('season', 2026)
    .neq('series_week', 'season')
    .order('series_week', { ascending: true })

  const unique = [...new Set((data ?? []).map(r => r.series_week))]
  return NextResponse.json({ series_weeks: unique, count: unique.length })
}
