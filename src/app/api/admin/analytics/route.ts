import { NextRequest, NextResponse } from 'next/server'

const VERCEL_TOKEN  = process.env.VERCEL_TOKEN!
const PROJECT_ID    = 'prj_JFxtFPvctpQIhyHsI7OMdQKDLext'
const TEAM_ID       = 'team_LrgwNqCG4WaabElxqV7tQTIN'
const BASE          = 'https://vercel.com/api/web-analytics'

function checkAuth(req: NextRequest) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

async function va(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams({ projectId: PROJECT_ID, teamId: TEAM_ID, ...params })
  const res = await fetch(`${BASE}/${path}?${qs}`, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    next: { revalidate: 300 },
  })
  return res.json()
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') ?? '30d'

  const now  = new Date()
  const to   = now.toISOString()
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30
  const from = new Date(Date.now() - days * 86400000).toISOString()
  const granularity = days <= 7 ? 'hour' : 'day'

  const [overview, timeseries, byPath, byCountry, byDevice, byReferrer] = await Promise.all([
    va('overview',   { from, to }),
    va('timeseries', { from, to, granularity }),
    va('stats',      { from, to, type: 'path' }),
    va('stats',      { from, to, type: 'country' }),
    va('stats',      { from, to, type: 'device_type' }),
    va('stats',      { from, to, type: 'referrer_hostname' }),
  ])

  return NextResponse.json({
    overview,
    timeseries: timeseries?.data?.groups?.all ?? [],
    byPath:     byPath?.data    ?? [],
    byCountry:  byCountry?.data ?? [],
    byDevice:   byDevice?.data  ?? [],
    byReferrer: byReferrer?.data ?? [],
  }, { headers: { 'Cache-Control': 'no-store' } })
}
