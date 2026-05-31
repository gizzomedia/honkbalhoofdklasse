import { ImageResponse } from 'next/og'
import { TEAM_COLORS, TEAM_LOGOS } from '@/lib/teams'

export const runtime = 'edge'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params
  const color = TEAM_COLORS[teamId] ?? '#1e335a'
  const logo  = TEAM_LOGOS[teamId] ?? ''

  return new ImageResponse(
    (
      <div style={{
        width: 192, height: 192,
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 32,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} style={{ width: 130, height: 130, objectFit: 'contain' }} alt="" />
      </div>
    ),
    { width: 192, height: 192 }
  )
}
