import { ImageResponse } from 'next/og'
import { ROSTERS, slugify } from '@/lib/rosters-data'
import { TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES } from '@/lib/teams'
import { supabaseAdmin } from '@/lib/supabase'

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

  const teamColor = TEAM_COLORS[teamId] ?? '#1e335a'
  const teamLogo  = TEAM_LOGOS[teamId]
  const teamShort = (TEAM_NAMES[teamId] ?? teamId).split(' ').pop()!.toUpperCase()
  const posLabel  = POS_LABELS[player.pos] ?? player.pos

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

  // Fetch player photo from Supabase
  let photoUrl: string | null = null
  try {
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

  // Trading card proportions: 630 × 880
  const W = 630, H = 880

  return new ImageResponse(
    (
      <div
        style={{
          width: W, height: H,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'sans-serif',
          overflow: 'hidden',
          borderRadius: 20,
          background: teamColor,
        }}
      >
        {/* ── Player photo (full card background) ─────────────────── */}
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt=""
            style={{
              position: 'absolute',
              top: 0, left: 0,
              width: '100%',
              height: '78%',
              objectFit: 'cover',
              objectPosition: 'top center',
            }}
          />
        ) : (
          /* No photo: team color gradient background */
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '78%',
            background: `linear-gradient(160deg, ${teamColor} 0%, #040b16 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={teamLogo} alt="" style={{ width: 220, height: 220, opacity: 0.25, objectFit: 'contain' }} />
          </div>
        )}

        {/* ── Top gradient (darkness + readability) ───────────────── */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: 160,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, transparent 100%)',
          display: 'flex',
        }} />

        {/* ── Bottom gradient (team color bleed up) ───────────────── */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0, height: '52%',
          background: `linear-gradient(to top, ${teamColor} 0%, ${teamColor}ee 35%, ${teamColor}88 60%, transparent 100%)`,
          display: 'flex',
        }} />

        {/* ── Top bar: league label + year ─────────────────────────── */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '22px 26px 0',
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(8px)',
            borderRadius: 6,
            padding: '5px 12px',
            display: 'flex',
          }}>
            <span style={{ color: 'white', fontSize: 12, fontWeight: 800, letterSpacing: 2.5 }}>
              HONKBAL HOOFDKLASSE
            </span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: 700, letterSpacing: 2, display: 'flex' }}>
            2026
          </span>
        </div>

        {/* ── Team name watermark in photo area ────────────────────── */}
        <div style={{
          position: 'absolute',
          top: 52,
          left: 0, right: 0,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{
            color: 'rgba(255,255,255,0.10)',
            fontSize: 110,
            fontWeight: 900,
            fontStyle: 'italic',
            letterSpacing: -3,
            lineHeight: '1',
          }}>
            {teamShort}
          </span>
        </div>

        {/* ── Bottom content ───────────────────────────────────────── */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Player name + logo row */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            padding: '0 26px 14px',
          }}>
            {/* Name + position */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* First name */}
              {firstName && (
                <span style={{
                  color: 'rgba(255,255,255,0.70)',
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: 4,
                  display: 'flex',
                  textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                }}>
                  {firstName}
                </span>
              )}
              {/* Last name */}
              <span style={{
                color: 'white',
                fontSize: 58,
                fontWeight: 900,
                lineHeight: '1',
                letterSpacing: -1,
                marginTop: -4,
                display: 'flex',
                textShadow: '0 2px 12px rgba(0,0,0,0.9)',
              }}>
                {lastName}
              </span>
              {/* Position + number */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <div style={{
                  background: '#fe3d00',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 900,
                  padding: '5px 14px',
                  letterSpacing: 3,
                  display: 'flex',
                }}>
                  {posLabel.toUpperCase()}
                </div>
                <span style={{
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: 15,
                  fontWeight: 700,
                  display: 'flex',
                  textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                }}>
                  #{player.uniform}
                </span>
              </div>
            </div>

            {/* Team logo */}
            <div style={{
              width: 80, height: 80,
              borderRadius: 14,
              background: 'rgba(0,0,0,0.35)',
              border: '1.5px solid rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 12,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={teamLogo} alt="" style={{ width: 54, height: 54, objectFit: 'contain' }} />
            </div>
          </div>

          {/* Stats strip */}
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.55)',
            borderTop: '3px solid #fe3d00',
          }}>
            {statItems.map((s, i) => (
              <div key={s.label} style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '16px 0',
                borderRight: i < statItems.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}>
                <span style={{ color: 'white', fontSize: 26, fontWeight: 900, lineHeight: '1', display: 'flex' }}>
                  {s.value}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, letterSpacing: 2.5, marginTop: 4, display: 'flex' }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Card border glow ─────────────────────────────────────── */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 20,
          border: `2px solid rgba(255,255,255,0.15)`,
          display: 'flex',
          pointerEvents: 'none',
        }} />
      </div>
    ),
    { width: W, height: H }
  )
}
