import { ImageResponse } from 'next/og'
import { ROSTERS, slugify } from '@/lib/rosters-data'
import { TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES } from '@/lib/teams'

export const runtime = 'edge'

const POS_LABELS: Record<string, string> = {
  P: 'Pitcher', C: 'Catcher', IF: 'Infielder', OF: 'Outfielder',
  'C/IF': 'C / IF', UTL: 'Utility', DH: 'DH',
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string; playerSlug: string }> }
) {
  const { teamId, playerSlug } = await params
  const { searchParams } = new URL(request.url)

  const roster = ROSTERS[teamId]
  if (!roster) return new Response('Not found', { status: 404 })
  const player = roster.players.find(p => slugify(p.name) === playerSlug)
  if (!player) return new Response('Not found', { status: 404 })

  const teamColor = TEAM_COLORS[teamId] ?? '#1e335a'
  const teamLogo  = TEAM_LOGOS[teamId]
  const teamName  = TEAM_NAMES[teamId] ?? teamId
  const posLabel  = POS_LABELS[player.pos] ?? player.pos

  // Stats from query params (provided by ScorecardButton after fetching /api/compare)
  const avg = searchParams.get('avg') ?? '—'
  const hr  = searchParams.get('hr')  ?? '—'
  const rbi = searchParams.get('rbi') ?? '—'
  const ops = searchParams.get('ops') ?? '—'
  const sb  = searchParams.get('sb')  ?? '—'

  const statItems = [
    { label: 'AVG', value: avg },
    { label: 'HR',  value: hr  },
    { label: 'RBI', value: rbi },
    { label: 'OPS', value: ops },
    { label: 'SB',  value: sb  },
  ]

  const nameParts = player.name.split(' ')
  const firstName = nameParts.slice(0, -1).join(' ').toUpperCase()
  const lastName  = nameParts[nameParts.length - 1].toUpperCase()

  return new ImageResponse(
    (
      <div
        style={{
          width: 1080, height: 1080,
          background: `linear-gradient(140deg, ${teamColor} 0%, #040b16 65%)`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Dark overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.48)', display: 'flex' }} />

        {/* Logo watermark */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={teamLogo}
          style={{ position: 'absolute', width: 680, height: 680, opacity: 0.07, objectFit: 'contain' }}
          alt=""
        />

        {/* Top accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 10, background: '#fe3d00', display: 'flex' }} />

        {/* Content */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Team name */}
          <div style={{ color: '#fe3d00', fontSize: 30, fontWeight: 900, letterSpacing: 14, marginBottom: 16, display: 'flex' }}>
            {teamName.toUpperCase()}
          </div>

          {/* Jersey number watermark */}
          <div style={{
            color: 'rgba(255,255,255,0.06)', fontSize: 320, fontWeight: 900,
            fontStyle: 'italic', lineHeight: '0.9', marginBottom: -24, display: 'flex',
          }}>
            #{player.uniform}
          </div>

          {/* Player name */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 50, fontWeight: 900, fontStyle: 'italic', display: 'flex' }}>
              {firstName}
            </div>
            <div style={{ color: '#ffffff', fontSize: 106, fontWeight: 900, fontStyle: 'italic', lineHeight: '1', marginTop: -8, display: 'flex' }}>
              {lastName}
            </div>
          </div>

          {/* Position pill */}
          <div style={{
            background: '#fe3d00', color: 'white',
            fontSize: 22, fontWeight: 900, letterSpacing: 8,
            padding: '12px 48px', marginTop: 18, marginBottom: 44,
            display: 'flex',
          }}>
            {posLabel.toUpperCase()}
          </div>

          {/* Stats bar */}
          <div style={{
            display: 'flex', borderTop: '5px solid #fe3d00',
            background: 'rgba(0,0,0,0.65)', width: 960,
          }}>
            {statItems.map((s, i) => (
              <div key={s.label} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '26px 0',
                borderRight: i < statItems.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
              }}>
                <div style={{ color: '#ffffff', fontSize: 58, fontWeight: 900, lineHeight: '1', display: 'flex' }}>
                  {s.value}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 19, fontWeight: 700, letterSpacing: 5, marginTop: 8, display: 'flex' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom branding */}
        <div style={{
          position: 'absolute', bottom: 26, display: 'flex',
          color: 'rgba(255,255,255,0.22)', fontSize: 19, fontWeight: 700, letterSpacing: 5,
        }}>
          HONKBAL HOOFDKLASSE 2026 · honkbalhoofdklasse.com
        </div>
      </div>
    ),
    { width: 1080, height: 1080 }
  )
}
