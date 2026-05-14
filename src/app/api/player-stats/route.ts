import { NextRequest, NextResponse } from 'next/server'
import { computeSeasonStats, fetchPlayerPhotos } from '@/lib/player-stats-lib'

// ── Route handler ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = (searchParams.get('name') ?? '').trim()

  if (!name) {
    return NextResponse.json({ seasonStats: null, seriesLog: [], photos: null })
  }

  // Cached stats + fast photo lookup in parallel
  const [seasonStats, photos] = await Promise.all([
    computeSeasonStats(name),
    fetchPlayerPhotos(name),
  ])

  return NextResponse.json({
    seasonStats,
    seriesLog: [],
    photos,
  })
}
