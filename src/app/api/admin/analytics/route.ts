import { NextRequest, NextResponse } from 'next/server'

const VERCEL_TOKEN  = process.env.VERCEL_TOKEN
const PROJECT_ID    = 'prj_JFxtFPvctpQIhyHsI7OMdQKDLext'
const TEAM_ID       = 'team_LrgwNqCG4WaabElxqV7tQTIN'
const BASE          = 'https://api.vercel.com/v1/web-analytics'

function checkAuth(req: NextRequest) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

async function fetchAnalytics(endpoint: string, params: Record<string, string>) {
  if (!VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN not configured')
  }

  const qs = new URLSearchParams({
    projectId: PROJECT_ID,
    teamId: TEAM_ID,
    ...params
  })

  const url = `${BASE}/${endpoint}?${qs}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    next: { revalidate: 300 },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`[${endpoint}] ${res.status}: ${text}`)
  }

  return res.json()
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') ?? '30d'

    const now = new Date()
    const to = now.toISOString()
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30
    const from = new Date(Date.now() - days * 86400000).toISOString()
    const granularity = days <= 7 ? 'hour' : 'day'

    const results = await Promise.allSettled([
      fetchAnalytics('overview', { from, to }),
      fetchAnalytics('timeseries', { from, to, granularity }),
      fetchAnalytics('stats', { from, to, type: 'path' }),
      fetchAnalytics('stats', { from, to, type: 'country' }),
      fetchAnalytics('stats', { from, to, type: 'device_type' }),
      fetchAnalytics('stats', { from, to, type: 'referrer_hostname' }),
    ])

    const [overview, timeseries, byPath, byCountry, byDevice, byReferrer] = results.map(r =>
      r.status === 'fulfilled' ? r.value : null
    )

    return NextResponse.json({
      overview: overview ?? { total: 0, devices: 0, bounceRate: 0 },
      timeseries: timeseries?.data?.groups?.all ?? [],
      byPath: byPath?.data ?? [],
      byCountry: byCountry?.data ?? [],
      byDevice: byDevice?.data ?? [],
      byReferrer: byReferrer?.data ?? [],
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[analytics]', err instanceof Error ? err.message : err)
    return NextResponse.json(
      {
        overview: { total: 0, devices: 0, bounceRate: 0 },
        timeseries: [],
        byPath: [],
        byCountry: [],
        byDevice: [],
        byReferrer: [],
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
