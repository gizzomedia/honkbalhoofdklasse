import { NextResponse } from 'next/server'
import { getHollandSeries } from '@/lib/holland-series'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const data = await getHollandSeries()
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
