'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { getAwardsByPlayer, AWARD_CATEGORIES } from '@/lib/awards-data'
import { ROSTERS } from '@/lib/rosters-data'
import { headshotFaceUrl } from '@/lib/cloudinary'
import { TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES } from '@/lib/teams'

type SeasonStats = Record<string, unknown>
type Photos = { banner_url: string | null; headshot_url: string | null; banner_focal_x?: number | null; banner_focal_y?: number | null } | null
type CareerBat = { year: string; lg: string; team: string; g: string; ab: string; h: string; hr: string; rbi: string; avg: string; obp: string; slg: string }
type CareerPit = { year: string; lg: string; team: string; w: string; l: string; era: string; ip: string; so: string; whip: string }
type Career = { batting: CareerBat[]; pitching: CareerPit[] }

function n(v: unknown): number { return isNaN(Number(v)) ? 0 : Number(v) }
function d(v: unknown, decimals = 0): string {
  if (v === null || v === undefined || v === '') return '—'
  const x = Number(v)
  if (isNaN(x) || (decimals === 0 && x === 0 && String(v) === '0')) return decimals === 0 ? '0' : '—'
  return decimals > 0 ? x.toFixed(decimals).replace(/^0\./, '.') : String(x)
}
function avg(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  const x = Number(v); if (isNaN(x)) return '—'
  return x.toFixed(3).replace(/^0\./, '.')
}
function ip(v: unknown): string {
  const s = String(v ?? ''); if (!s || s === '0.0') return '0.0'
  if (s.includes('.')) return s
  const x = Number(s); if (!x) return '0.0'
  return `${Math.floor(x / 3)}.${x % 3}`
}

function findRosterPlayer(name: string) {
  const norm = name.toLowerCase().trim()
  for (const [teamId, roster] of Object.entries(ROSTERS)) {
    const p = roster.players.find(p => p.name.toLowerCase() === norm)
    if (p) return { ...p, teamId }
  }
  return null
}

// ── Stat table ─────────────────────────────────────────────────────────────
function StatTable({ headers, rows, accentColor }: {
  headers: string[]
  rows: { label: string; values: string[]; isAccent?: boolean }[]
  accentColor: string
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-max">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="font-display font-700 text-[var(--muted)] uppercase tracking-widest px-3 py-2 text-left whitespace-nowrap w-28">Year</th>
            {headers.map(h => (
              <th key={h} className="font-display font-700 text-[var(--muted)] uppercase tracking-widest px-2 py-2 text-right whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--border)]/40 last:border-0 hover:bg-white/[0.02]">
              <td className="font-display font-800 px-3 py-2.5 text-left whitespace-nowrap text-[11px]"
                style={{ color: row.isAccent ? accentColor : 'rgba(255,255,255,0.5)' }}>
                {row.label}
              </td>
              {row.values.map((val, j) => {
                const isRate = headers[j] === 'AVG' || headers[j] === 'OBP' || headers[j] === 'SLG' || headers[j] === 'OPS' || headers[j] === 'ERA' || headers[j] === 'WHIP'
                return (
                  <td key={j} className="px-2 py-2.5 text-right whitespace-nowrap"
                    style={{ color: isRate && val !== '—' ? accentColor : 'rgba(255,255,255,0.85)', fontFamily: 'inherit' }}>
                    <span className="font-display font-800 text-xs">{val}</span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────
export default function PlayerStatsModal({
  playerName, teamId, statType, onClose,
}: {
  playerName: string; teamId: string; statType: 'batting' | 'pitching'; onClose: () => void
}) {
  const [st, setSt]           = useState<SeasonStats | null>(null)
  const [photos, setPhotos]   = useState<Photos>(null)
  const [career, setCareer]   = useState<Career | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'batting' | 'pitching'>(statType)

  const rosterPlayer = findRosterPlayer(playerName)
  const bbrefId      = rosterPlayer?.bbref_id
  const awards       = getAwardsByPlayer(playerName)
  const teamColor    = TEAM_COLORS[teamId] ?? '#1e335a'
  const accentColor  = teamColor === '#121b31' ? '#f59e0b' : teamColor

  useEffect(() => {
    setLoading(true); setSt(null); setPhotos(null); setCareer(null)
    const jobs: Promise<void>[] = [
      fetch(`/api/player-stats?name=${encodeURIComponent(playerName)}&type=${statType}`)
        .then(r => r.json())
        .then(d => { setSt(d.seasonStats); setPhotos(d.photos) }),
    ]
    if (bbrefId) {
      jobs.push(
        fetch(`/api/career-stats?id=${encodeURIComponent(bbrefId)}`)
          .then(r => r.json())
          .then(d => { if (Array.isArray(d?.batting)) setCareer(d) })
          .catch(() => {})
      )
    }
    Promise.all(jobs).finally(() => setLoading(false))
  }, [playerName, statType, bbrefId])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const hasBatting  = n(st?.ab) > 0
  const hasPitching = n(st?.pitch_appear) > 0
  const age         = rosterPlayer?.yob ? new Date().getFullYear() - rosterPlayer.yob : null

  const bannerUrl      = photos?.banner_url ?? null
  const headshotUrl    = headshotFaceUrl(photos?.headshot_url ?? null)
  const bannerPosition = `${photos?.banner_focal_x ?? 50}% ${photos?.banner_focal_y ?? 50}%`

  // Build batting stat row
  const batRow = st ? [
    d(st.games), d(st.ab), d(st.h), d(st.double), d(st.triple), d(st.hr),
    d(st.rbi), d(st.bb), d(st.so), d(st.sb), avg(st.avg), avg(st.obp), avg(st.slg), avg(st.ops),
  ] : []

  // Build pitching stat row
  const pitRow = st ? [
    d(st.pitch_appear), d(st.pitch_gs), ip(st.pitch_ip),
    d(st.pitch_win), d(st.pitch_loss), d(st.pitch_save),
    d(st.pitch_h), d(st.pitch_bb), d(st.pitch_so), d(st.pitch_er), d(st.era, 2),
  ] : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-3xl bg-[#060e1b] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <div className="relative shrink-0 overflow-hidden" style={{ height: 240 }}>

          {/* Banner photo — prominent, like MLB */}
          {bannerUrl ? (
            <Image src={bannerUrl} alt={playerName} fill priority
              className="object-cover" style={{ objectPosition: bannerPosition, opacity: 0.55 }} />
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${teamColor} 0%, #0a1220 100%)` }} />
          )}

          {/* Dark gradient so text is always readable */}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, #060e1b 0%, rgba(6,14,27,0.5) 50%, rgba(6,14,27,0.1) 100%)' }} />
          <div className="absolute inset-0"
            style={{ background: `linear-gradient(to right, ${teamColor}cc 0%, transparent 50%)` }} />

          {/* Jersey number watermark */}
          {rosterPlayer?.uniform && (
            <div className="absolute right-0 top-0 bottom-0 flex items-center pr-6 select-none pointer-events-none">
              <span className="font-display font-800 text-white/[0.06]" style={{ fontSize: 'clamp(120px, 22vw, 200px)', lineHeight: 1 }}>
                {rosterPlayer.uniform}
              </span>
            </div>
          )}

          {/* Close button */}
          <button onClick={onClose}
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-colors text-lg leading-none">
            ×
          </button>

          {/* Player info anchored at bottom */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 flex items-end gap-4 z-10">

            {/* Headshot */}
            {headshotUrl ? (
              <div className="relative shrink-0 rounded-xl overflow-hidden shadow-2xl"
                style={{ width: 88, height: 88, border: `3px solid ${accentColor}` }}>
                <Image src={headshotUrl} alt={playerName} fill className="object-cover object-center" priority />
              </div>
            ) : (
              <div className="shrink-0 rounded-xl flex flex-col items-center justify-center gap-0.5 shadow-2xl"
                style={{ width: 88, height: 88, border: `3px solid ${accentColor}`, background: 'rgba(255,255,255,0.07)' }}>
                <span className="font-display font-800 text-3xl text-white leading-none">{rosterPlayer?.uniform ?? '?'}</span>
                {rosterPlayer?.pos && <span className="font-display font-700 text-[9px] text-white/40 uppercase tracking-widest">{rosterPlayer.pos}</span>}
              </div>
            )}

            {/* Name + info */}
            <div className="flex-1 min-w-0 pb-1">
              {/* Team logo + name */}
              <div className="flex items-center gap-1.5 mb-1">
                {TEAM_LOGOS[teamId] && (
                  <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                    <Image src={TEAM_LOGOS[teamId]} alt={teamId} width={16} height={16} className="object-contain w-full h-full" />
                  </div>
                )}
                <span className="font-display font-700 text-[10px] uppercase tracking-widest" style={{ color: accentColor }}>
                  {TEAM_NAMES[teamId] ?? teamId}
                </span>
              </div>

              {/* Name + number */}
              <h2 className="font-display font-800 uppercase text-white leading-none tracking-tight mb-1.5"
                style={{ fontSize: 'clamp(1.25rem, 4vw, 1.875rem)' }}>
                {playerName}
                {rosterPlayer?.uniform && (
                  <span className="ml-2 font-display font-700" style={{ color: accentColor, opacity: 0.9 }}>
                    #{rosterPlayer.uniform}
                  </span>
                )}
              </h2>

              {/* Bio chips */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-white/50 font-display font-700 uppercase tracking-widest text-[10px]">
                {rosterPlayer?.pos && <span className="text-white/75">{rosterPlayer.pos}</span>}
                {rosterPlayer?.bt  && <><span className="text-white/25">|</span><span>B/T: <span className="text-white/75">{rosterPlayer.bt}</span></span></>}
                {age               && <><span className="text-white/25">|</span><span>Age: <span className="text-white/75">{age}</span></span></>}
              </div>
            </div>
          </div>
        </div>

        {/* Accent line */}
        <div style={{ height: 3, background: accentColor, flexShrink: 0 }} />

        {/* ── BODY ──────────────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1">

          {/* Tab strip */}
          {!loading && st && hasBatting && hasPitching && (
            <div className="flex border-b border-[var(--border)] px-1">
              {(['batting', 'pitching'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-5 py-3 font-display font-800 text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px ${
                    tab === t ? 'text-white' : 'text-[var(--muted)] hover:text-white border-transparent'
                  }`}
                  style={tab === t ? { borderColor: accentColor } : {}}>
                  {t}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${accentColor} transparent transparent transparent` }} />
            </div>
          ) : !st ? (
            <div className="text-center py-14">
              <p className="font-display font-700 text-[var(--muted)] uppercase text-sm tracking-widest">No 2026 stats available</p>
            </div>
          ) : (
            <>
              {/* ── BATTING ── */}
              {(tab === 'batting' || (!hasPitching && hasBatting)) && hasBatting && (
                <div className="px-5 pt-5 pb-4">
                  <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-3">2026 Batting</p>
                  <StatTable
                    accentColor={accentColor}
                    headers={['G','AB','H','2B','3B','HR','RBI','BB','SO','SB','AVG','OBP','SLG','OPS']}
                    rows={[
                      { label: '2026 Season', values: batRow, isAccent: false },
                      ...(career?.batting ?? []).map(r => ({
                        label: r.year === 'Career' ? 'Career' : `${r.year} ${r.lg}`,
                        isAccent: r.year === 'Career',
                        values: [r.g, r.ab, r.h, '—', '—', r.hr, r.rbi, '—', '—', '—', r.avg, r.obp, r.slg, '—'],
                      })),
                    ]}
                  />
                  {bbrefId && (
                    <a href={`https://www.baseball-reference.com/register/player.fcgi?id=${bbrefId}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-block mt-3 font-display font-700 text-[10px] text-[var(--muted)] hover:text-white uppercase tracking-widest transition-colors">
                      Full career stats on Baseball Reference →
                    </a>
                  )}
                </div>
              )}

              {/* ── PITCHING ── */}
              {(tab === 'pitching' || (!hasBatting && hasPitching)) && hasPitching && (
                <div className="px-5 pt-5 pb-4">
                  <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-3">2026 Pitching</p>
                  <StatTable
                    accentColor={accentColor}
                    headers={['App','GS','IP','W','L','SV','H','BB','SO','ER','ERA']}
                    rows={[{ label: '2026 Season', values: pitRow }]}
                  />
                  {career?.pitching && career.pitching.length > 0 && (
                    <div className="mt-4">
                      <StatTable
                        accentColor={accentColor}
                        headers={['W','L','ERA','IP','SO','WHIP']}
                        rows={career.pitching.map(r => ({
                          label: r.year === 'Career' ? 'Career' : `${r.year} ${r.lg}`,
                          isAccent: r.year === 'Career',
                          values: [r.w, r.l, r.era, r.ip, r.so, r.whip],
                        }))}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── AWARDS ── */}
              {awards.length > 0 && (
                <div className="px-5 pb-5 border-t border-[var(--border)] pt-4">
                  <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-3">Awards</p>
                  <div className="space-y-2">
                    {awards.map((award, i) => {
                      const cat = AWARD_CATEGORIES.find(c => c.key === award.category)
                      return (
                        <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2.5 border border-[var(--border)] bg-white/[0.02]">
                          <div>
                            <p className="font-display font-800 text-sm uppercase text-white leading-none">{cat?.en ?? award.category}</p>
                            {award.label && <p className="font-display font-700 text-[10px] uppercase tracking-widest mt-0.5" style={{ color: accentColor }}>{award.label}</p>}
                          </div>
                          <p className="font-display font-700 text-xs text-[var(--muted)] uppercase">Season {award.season}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-[var(--border)] px-5 py-2.5 flex items-center justify-between">
          <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">
            KNBSB Hoofdklasse · Season 2026
          </p>
          {rosterPlayer?.instagram && (
            <a href={`https://instagram.com/${rosterPlayer.instagram}`} target="_blank" rel="noopener noreferrer"
              className="font-display font-700 text-[10px] text-[var(--muted)] hover:text-white transition-colors uppercase tracking-widest">
              @{rosterPlayer.instagram}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
