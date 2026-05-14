'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { getAwardsByPlayer, AWARD_CATEGORIES } from '@/lib/awards-data'
import { ROSTERS } from '@/lib/rosters-data'
import { headshotFaceUrl } from '@/lib/cloudinary'

// ── Team data ──────────────────────────────────────────────────────────────
const TEAM_COLORS: Record<string, string> = {
  neptunus: '#121b31', pirates: '#0f6f38', kinheim: '#c0232e',
  hcaw: '#f5b51a', twins: '#ee7e1a', pioniers: '#3d68e9', uvv: '#db002f',
}
const TEAM_LOGOS: Record<string, string> = {
  neptunus: 'https://res.cloudinary.com/dqld625sq/image/upload/v1770654466/Neptunus_logo_wit_afyyae.png',
  pirates:  'https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/pirates_logo_ic4rk8.png',
  kinheim:  'https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/Kinheim_logo_d4zw2t.png',
  hcaw:     'https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/HCAW_logo_wit_rijssy.png',
  twins:    'https://res.cloudinary.com/dqld625sq/image/upload/v1770654463/Twins_wit_c7dumy.png',
  pioniers: 'https://res.cloudinary.com/dqld625sq/image/upload/v1770654445/Pioniers_logo_mqj4tb.png',
  uvv:      'https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/UVV_logo_xcaa5d.png',
}
const TEAM_NAMES: Record<string, string> = {
  neptunus: 'Curaçao Neptunus', pirates: 'Amsterdam Pirates', kinheim: 'Kinheim',
  hcaw: 'HCAW', twins: 'Oosterhout Twins', pioniers: 'Hoofddorp Pioniers', uvv: 'UVV',
}

// ── Types ──────────────────────────────────────────────────────────────────
type SeasonStats = Record<string, unknown>
type Photos      = { banner_url: string | null; headshot_url: string | null; banner_focal_x?: number | null; banner_focal_y?: number | null } | null
type CareerBat   = { year:string; lg:string; team:string; g:string; ab:string; h:string; hr:string; rbi:string; avg:string; obp:string; slg:string }
type CareerPit   = { year:string; lg:string; team:string; w:string; l:string; era:string; ip:string; so:string; whip:string }
type Career      = { batting: CareerBat[]; pitching: CareerPit[] }

// ── Helpers ────────────────────────────────────────────────────────────────
function num(v: unknown): number { return isNaN(Number(v)) ? 0 : Number(v) }
function str(v: unknown): string { return (v === null || v === undefined || v === '') ? '—' : String(v) }

function fmtAvg(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (isNaN(n)) return '—'
  return n.toFixed(3).replace('0.', '.')
}
function fmtEra(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  return isNaN(n) ? '—' : n.toFixed(2)
}
function fmtIp(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  const s = String(v)
  if (s.includes('.')) return s === '0.0' ? '—' : s
  const n = Number(s)
  if (isNaN(n) || n === 0) return '—'
  return `${Math.floor(n / 3)}.${n % 3}`
}

function findRosterPlayer(name: string) {
  const norm = name.toLowerCase().trim()
  for (const [teamId, roster] of Object.entries(ROSTERS)) {
    const p = roster.players.find(p => p.name.toLowerCase() === norm)
    if (p) return { ...p, teamId }
  }
  return null
}

function findBbrefId(name: string): string | undefined {
  return findRosterPlayer(name)?.bbref_id
}

// ── Big stat card ──────────────────────────────────────────────────────────
function BigStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-4 px-2">
      <p className="font-display font-800 text-3xl md:text-4xl leading-none" style={{ color: accent }}>
        {value}
      </p>
      <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mt-1">{label}</p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function PlayerStatsModal({
  playerName,
  teamId,
  statType,
  onClose,
}: {
  playerName: string
  teamId: string
  statType: 'batting' | 'pitching'
  onClose: () => void
}) {
  const [st, setSt]         = useState<SeasonStats | null>(null)
  const [photos, setPhotos] = useState<Photos>(null)
  const [career, setCareer] = useState<Career | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]       = useState<'batting' | 'pitching'>(statType)

  const rosterPlayer = findRosterPlayer(playerName)
  const bbrefId      = rosterPlayer?.bbref_id
  const awards       = getAwardsByPlayer(playerName)

  const teamColor = TEAM_COLORS[teamId] ?? '#1e335a'
  const accentColor = teamColor === '#121b31' ? '#f59e0b' : teamColor

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

  const hasPitching = num(st?.pitch_appear) > 0
  const hasBatting  = num(st?.ab) > 0

  const bannerUrl      = photos?.banner_url ?? null
  const headshotUrl    = headshotFaceUrl(photos?.headshot_url ?? null)
  const bannerPosition = `${photos?.banner_focal_x ?? 50}% ${photos?.banner_focal_y ?? 50}%`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-2xl bg-[#060e1b] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <div className="relative shrink-0 overflow-hidden" style={{ minHeight: 180 }}>
          {/* Team color gradient */}
          <div className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${teamColor} 0%, #060e1b 70%)` }} />

          {/* Banner photo */}
          {bannerUrl && (
            <div className="absolute inset-0">
              <Image src={bannerUrl} alt={playerName} fill
                className="object-cover" style={{ opacity: 0.2, objectPosition: bannerPosition }} priority />
            </div>
          )}

          {/* Jersey number watermark */}
          {rosterPlayer?.uniform && (
            <div className="absolute right-4 top-0 font-display font-800 leading-none select-none pointer-events-none"
              style={{ fontSize: 'clamp(80px,18vw,160px)', color: teamColor, opacity: 0.12, lineHeight: 1 }}>
              {rosterPlayer.uniform}
            </div>
          )}

          {/* Close button */}
          <button onClick={onClose}
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors text-xl leading-none">
            ×
          </button>

          {/* Content */}
          <div className="relative z-10 flex items-end gap-4 px-5 pt-8 pb-5">
            {/* Headshot */}
            {headshotUrl ? (
              <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl">
                <Image src={headshotUrl} alt={playerName} fill className="object-cover object-center" priority />
              </div>
            ) : (
              <div className="w-24 h-24 shrink-0 rounded-xl border-2 border-white/30 flex flex-col items-center justify-center gap-1"
                style={{ background: 'rgba(255,255,255,0.08)' }}>
                <span className="font-display font-800 text-4xl text-white leading-none">
                  {rosterPlayer?.uniform ?? '?'}
                </span>
                {rosterPlayer?.pos && (
                  <span className="font-display font-700 text-[10px] text-white/50 uppercase tracking-widest">
                    {rosterPlayer.pos}
                  </span>
                )}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-800 text-2xl md:text-3xl uppercase text-white leading-none mb-1 tracking-tight">
                {playerName}
              </h2>

              {/* Team + position row */}
              <div className="flex items-center gap-2 mb-1.5">
                {TEAM_LOGOS[teamId] && (
                  <div className="w-6 h-6 rounded p-0.5 flex items-center justify-center shrink-0"
                    style={{ background: `${teamColor}80` }}>
                    <Image src={TEAM_LOGOS[teamId]} alt={teamId} width={20} height={20}
                      className="object-contain w-full h-full" />
                  </div>
                )}
                <span className="font-display font-700 text-xs uppercase tracking-widest"
                  style={{ color: accentColor }}>
                  {TEAM_NAMES[teamId] ?? teamId}
                </span>
                {rosterPlayer?.pos && (
                  <span className="font-display font-700 text-xs text-white/40 uppercase tracking-widest">
                    · {rosterPlayer.pos}
                  </span>
                )}
              </div>

              {/* Bio row */}
              <div className="flex flex-wrap gap-3 text-[11px] text-white/40 font-display font-700 uppercase tracking-widest">
                {rosterPlayer?.bt  && <span>B/T: <span className="text-white/70">{rosterPlayer.bt}</span></span>}
                {rosterPlayer?.yob && <span>Born: <span className="text-white/70">{rosterPlayer.yob}</span></span>}
                {rosterPlayer?.yob && <span>Age: <span className="text-white/70">{new Date().getFullYear() - rosterPlayer.yob}</span></span>}
              </div>
            </div>
          </div>

          {/* Accent bottom line */}
          <div style={{ height: 3, background: accentColor }} />
        </div>

        {/* ── BODY ──────────────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !st ? (
            <div className="text-center py-12">
              <p className="font-display font-700 text-[var(--muted)] uppercase text-sm tracking-widest">No 2026 stats found</p>
            </div>
          ) : (
            <>
              {/* Tabs (only show if player has both) */}
              {hasBatting && hasPitching && (
                <div className="flex border-b border-[var(--border)]">
                  {(['batting', 'pitching'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                      className={`flex-1 py-3 font-display font-800 text-xs uppercase tracking-widest transition-colors ${
                        tab === t ? 'text-white border-b-2' : 'text-[var(--muted)] hover:text-white'
                      }`}
                      style={tab === t ? { borderColor: accentColor } : {}}>
                      {t}
                    </button>
                  ))}
                </div>
              )}

              {/* Big stat cards */}
              {(tab === 'batting' && hasBatting) && (
                <>
                  <div className="grid grid-cols-4 border-b border-[var(--border)] divide-x divide-[var(--border)]">
                    <BigStat label="AVG"  value={fmtAvg(st.avg)}      accent={accentColor} />
                    <BigStat label="HR"   value={str(st.hr)}           accent={accentColor} />
                    <BigStat label="RBI"  value={str(st.rbi)}          accent={accentColor} />
                    <BigStat label="OPS"  value={fmtAvg(st.ops)}       accent={accentColor} />
                  </div>
                  {/* Full batting stats */}
                  <div className="px-4 py-4">
                    <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-3">2026 Batting</p>
                    <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
                      {[
                        ['GP', st.games], ['AB', st.ab], ['H', st.h],  ['R', st.r],
                        ['2B', st.double], ['3B', st.triple], ['HR', st.hr],
                        ['RBI', st.rbi], ['BB', st.bb], ['SO', st.so], ['SB', st.sb],
                        ['OBP', fmtAvg(st.obp)], ['SLG', fmtAvg(st.slg)],
                      ].map(([lbl, val]) => (
                        <div key={String(lbl)} className="bg-[#0a1220] rounded-lg border border-[var(--border)] py-2.5 text-center">
                          <p className="font-display font-800 text-sm text-white">{String(val) === '' || val === null || val === undefined ? '—' : String(val)}</p>
                          <p className="font-display font-700 text-[9px] text-[var(--muted)] uppercase tracking-widest mt-0.5">{String(lbl)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {(tab === 'pitching' && hasPitching) && (
                <>
                  <div className="grid grid-cols-4 border-b border-[var(--border)] divide-x divide-[var(--border)]">
                    <BigStat label="ERA"  value={fmtEra(st.era)}       accent={accentColor} />
                    <BigStat label="IP"   value={fmtIp(st.pitch_ip)}   accent={accentColor} />
                    <BigStat label="SO"   value={str(st.pitch_so)}     accent={accentColor} />
                    <BigStat label="W-L"  value={`${num(st.pitch_win)}-${num(st.pitch_loss)}`} accent={accentColor} />
                  </div>
                  {/* Full pitching stats */}
                  <div className="px-4 py-4">
                    <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-3">2026 Pitching</p>
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                      {[
                        ['App', st.pitch_appear], ['GS', st.pitch_gs], ['IP', fmtIp(st.pitch_ip)],
                        ['W', st.pitch_win], ['L', st.pitch_loss], ['SV', st.pitch_save],
                        ['H', st.pitch_h], ['R', st.pitch_r], ['ER', st.pitch_er],
                        ['BB', st.pitch_bb], ['SO', st.pitch_so], ['ERA', fmtEra(st.era)],
                      ].map(([lbl, val]) => (
                        <div key={String(lbl)} className="bg-[#0a1220] rounded-lg border border-[var(--border)] py-2.5 text-center">
                          <p className="font-display font-800 text-sm text-white">{String(val) === '' || val === null || val === undefined ? '—' : String(val)}</p>
                          <p className="font-display font-700 text-[9px] text-[var(--muted)] uppercase tracking-widest mt-0.5">{String(lbl)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Awards */}
              {awards.length > 0 && (
                <div className="px-4 pb-4 border-t border-[var(--border)] pt-4">
                  <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-3">Awards</p>
                  <div className="space-y-2">
                    {awards.map((award, i) => {
                      const cat = AWARD_CATEGORIES.find(c => c.key === award.category)
                      return (
                        <div key={i} className="flex items-center justify-between bg-[#0a1220] rounded-lg px-3 py-2.5 border border-[var(--border)]">
                          <div>
                            <p className="font-display font-800 text-sm uppercase text-white leading-none">{cat?.en ?? award.category}</p>
                            {award.label && <p className="font-display font-700 text-[10px] text-[var(--accent)] uppercase tracking-widest mt-0.5">{award.label}</p>}
                          </div>
                          <p className="font-display font-700 text-xs text-[var(--muted)] uppercase">Season {award.season}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Career stats */}
              {career && (career.batting.length > 0 || career.pitching.length > 0) && (
                <div className="border-t border-[var(--border)] px-4 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">Career (Baseball Reference)</p>
                    {bbrefId && (
                      <a href={`https://www.baseball-reference.com/register/player.fcgi?id=${bbrefId}`}
                        target="_blank" rel="noopener noreferrer"
                        className="font-display font-700 text-[10px] text-[var(--accent)] uppercase tracking-widest hover:underline">
                        BBRef →
                      </a>
                    )}
                  </div>
                  {career.batting.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="border-b border-[var(--border)]">
                            {['Year','Lg','Team','G','AB','H','HR','RBI','AVG','OBP','SLG'].map(h => (
                              <th key={h} className="font-display font-700 text-[var(--muted)] uppercase tracking-widest px-1.5 py-1 text-center first:text-left whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {career.batting.map((row, i) => {
                            const isCareer = row.year === 'Career'
                            return (
                              <tr key={i} className={`border-b border-[var(--border)]/50 last:border-0 ${isCareer ? 'border-t border-[var(--border)]' : ''}`}>
                                <td className={`font-display font-800 px-1.5 py-1.5 text-left ${isCareer ? 'text-[var(--accent)]' : 'text-white'}`}>{row.year}</td>
                                <td className="font-display font-700 px-1.5 py-1.5 text-center text-[var(--muted)]">{row.lg}</td>
                                <td className="font-display font-800 px-1.5 py-1.5 text-center text-white">{row.team}</td>
                                {[row.g, row.ab, row.h, row.hr, row.rbi].map((v, j) => (
                                  <td key={j} className="font-display font-700 px-1.5 py-1.5 text-center text-white">{v || '–'}</td>
                                ))}
                                <td className="font-display font-800 px-1.5 py-1.5 text-center" style={{ color: accentColor }}>{row.avg || '–'}</td>
                                <td className="font-display font-700 px-1.5 py-1.5 text-center text-white">{row.obp || '–'}</td>
                                <td className="font-display font-700 px-1.5 py-1.5 text-center text-white">{row.slg || '–'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
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
