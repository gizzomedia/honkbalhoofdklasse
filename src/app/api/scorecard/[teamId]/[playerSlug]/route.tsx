import { ImageResponse } from 'next/og'
import { ROSTERS, slugify } from '@/lib/rosters-data'
import { TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES } from '@/lib/teams'

export const runtime = 'nodejs'

const POS_LABELS: Record<string, string> = {
  P: 'Pitcher', C: 'Catcher', IF: 'Infielder', OF: 'Outfielder',
  'C/IF': 'C/IF', UTL: 'Utility', DH: 'DH',
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

  const teamColor  = TEAM_COLORS[teamId] ?? '#1e335a'
  const teamLogo   = TEAM_LOGOS[teamId]
  const posLabel   = POS_LABELS[player.pos] ?? player.pos

  const avg = searchParams.get('avg') ?? '—'
  const hr  = searchParams.get('hr')  ?? '—'
  const rbi = searchParams.get('rbi') ?? '—'
  const ops = searchParams.get('ops') ?? '—'
  const sb  = searchParams.get('sb')  ?? '—'

  // OPS → rating 40–99
  const opsNum = parseFloat(ops)
  const rating = !isNaN(opsNum)
    ? Math.min(99, Math.max(40, Math.round(opsNum * 100)))
    : null

  const statItems = [
    { label: 'AVG', value: avg },
    { label: 'HR',  value: hr  },
    { label: 'RBI', value: rbi },
    { label: 'OPS', value: ops },
    { label: 'SB',  value: sb  },
  ]

  // Fetch player photo
  let photoUrl: string | null = null
  try {
    const { supabaseAdmin } = await import('@/lib/supabase')
    const { data } = await supabaseAdmin
      .from('player_photos')
      .select('banner_url, headshot_url')
      .ilike('player_name', player.name)
      .limit(1)
      .maybeSingle()
    photoUrl = data?.banner_url ?? data?.headshot_url ?? null
  } catch {}

  const nameParts = player.name.split(' ')
  const firstName = nameParts.slice(0, -1).join(' ').toUpperCase()
  const lastName  = nameParts[nameParts.length - 1].toUpperCase()

  // Second team color for blob (slightly lighter/complementary)
  const blob2 = '#fe3d00'

  const W = 630, H = 900

  return new ImageResponse(
    (
      <div style={{
        width: W, height: H,
        position: 'relative',
        display: 'flex',
        fontFamily: 'sans-serif',
        overflow: 'hidden',
        borderRadius: 28,
        background: '#0c1220',
      }}>

        {/* ── Player photo background (top 72%) ──────────────────── */}
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '74%',
            objectFit: 'cover', objectPosition: 'top center',
          }} />
        ) : (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '74%',
            background: `linear-gradient(150deg, ${teamColor} 0%, #040b16 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={teamLogo} alt="" style={{ width: 200, height: 200, opacity: 0.2, objectFit: 'contain' }} />
          </div>
        )}

        {/* ── Top-left color blobs ────────────────────────────────── */}
        <div style={{
          position: 'absolute', top: -50, left: -50,
          width: 200, height: 200, borderRadius: '50%',
          background: teamColor, opacity: 0.95, display: 'flex',
        }} />
        <div style={{
          position: 'absolute', top: 40, left: 55,
          width: 140, height: 140, borderRadius: '50%',
          background: blob2, opacity: 0.9, display: 'flex',
        }} />

        {/* ── Top gradient (readability) ──────────────────────────── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 130,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)',
          display: 'flex',
        }} />

        {/* ── Branding pill (top center) ──────────────────────────── */}
        <div style={{
          position: 'absolute', top: 22, left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.93)',
            borderRadius: 100, padding: '7px 20px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://res.cloudinary.com/dqld625sq/image/upload/v1778542430/logo_hk_abi5hm.png"
              alt="" style={{ width: 24, height: 24, objectFit: 'contain' }}
            />
            <span style={{ color: '#080f1c', fontSize: 13, fontWeight: 800, letterSpacing: 2 }}>
              HONKBAL HOOFDKLASSE
            </span>
          </div>
        </div>

        {/* ── Rating gem (top right) ──────────────────────────────── */}
        {rating !== null && (
          <div style={{
            position: 'absolute', top: 16, right: 20,
            width: 68, height: 68,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              position: 'absolute',
              width: 54, height: 54,
              background: 'linear-gradient(135deg, #c084fc 0%, #818cf8 50%, #60a5fa 100%)',
              transform: 'rotate(45deg)',
              borderRadius: 8,
              display: 'flex',
              boxShadow: '0 4px 20px rgba(129,140,248,0.5)',
            }} />
            <span style={{
              position: 'relative', zIndex: 1,
              color: 'white', fontSize: 24, fontWeight: 900,
              display: 'flex',
              textShadow: '0 1px 4px rgba(0,0,0,0.4)',
            }}>
              {rating}
            </span>
          </div>
        )}

        {/* ── Bottom light section with diagonal top edge ─────────── */}
        {/* The diagonal: left side lower, right side higher */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: 285,
          background: '#f0ebe2',
          clipPath: 'polygon(0% 14%, 100% 0%, 100% 100%, 0% 100%)',
          display: 'flex',
        }} />

        {/* Bottom content */}
        <div style={{
          position: 'absolute',
          bottom: 68, left: 0, right: 0,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          padding: '0 28px',
        }}>
          {/* Left: team logo + position */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={teamLogo} alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} />
            <span style={{
              color: '#444', fontSize: 15, fontWeight: 900,
              letterSpacing: 3, display: 'flex',
            }}>
              {posLabel.toUpperCase()}
            </span>
          </div>

          {/* Right: player name */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0 }}>
            {firstName && (
              <span style={{
                color: '#777', fontSize: 19, fontWeight: 700,
                letterSpacing: 3, display: 'flex',
              }}>
                {firstName}
              </span>
            )}
            <span style={{
              color: '#0a0f1a', fontSize: 52, fontWeight: 900,
              lineHeight: '1', letterSpacing: -1, marginTop: -4,
              display: 'flex',
            }}>
              {lastName}
            </span>
          </div>
        </div>

        {/* ── Stats strip at very bottom ──────────────────────────── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          display: 'flex',
          background: teamColor,
          height: 66,
        }}>
          {statItems.map((s, i) => (
            <div key={s.label} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              borderRight: i < statItems.length - 1 ? '1px solid rgba(255,255,255,0.12)' : 'none',
              gap: 2,
            }}>
              <span style={{ color: 'white', fontSize: 22, fontWeight: 900, lineHeight: '1', display: 'flex' }}>
                {s.value}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 700, letterSpacing: 2.5, display: 'flex' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Card border ─────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: 28,
          border: '2px solid rgba(255,255,255,0.12)',
          display: 'flex',
          pointerEvents: 'none',
        }} />
      </div>
    ),
    { width: W, height: H }
  )
}
