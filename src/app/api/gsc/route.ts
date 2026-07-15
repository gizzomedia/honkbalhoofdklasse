import { NextRequest, NextResponse } from 'next/server'
import { fetchGscData } from '@/lib/gsc'

function checkAuth(req: NextRequest) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

const EMPTY = {
  totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
  timeseries: [],
  queries: [],
  pages: [],
  countries: [],
  devices: [],
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') ?? '28d'
    const days = range === '7d' ? 7 : range === '90d' ? 90 : range === '28d' ? 28 : 30

    const data = await fetchGscData(days)
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[gsc]', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { ...EMPTY, error: err instanceof Error ? err.message : 'failed' },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
