import { NextRequest, NextResponse } from 'next/server'
import { computeSeasonStats, fetchPlayerPhotos } from '@/lib/player-stats-lib'

export async function GET(req: NextRequest) {
  const name = (req.nextUrl.searchParams.get('name') ?? '').trim()
  if (!name) return NextResponse.json({ seasonStats: null, photos: null })

  const [seasonStats, photos] = await Promise.all([
    computeSeasonStats(name),
    fetchPlayerPhotos(name),
  ])

  return NextResponse.json({ seasonStats, photos })
}
