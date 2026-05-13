'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { getAwardsByPlayer, AWARD_CATEGORIES } from '@/lib/awards-data'

const TEAM_COLORS: Record<string, string> = {
  neptunus: '#121b31', pirates: '#ffc425', kinheim: '#c0232e',
  hcaw: '#f5b51a', twins: '#ee7e1a', pioniers: '#e41d30', uvv: '#db002f',
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

type PlayerData = {
  seasonStats: Record<string, unknown> | null
  seriesLog: Record<string, unknown>[]
  photos: { banner_url: string | null; headshot_url: string | null } | null
}

function fmtIp(v: unknown): string {
  const n = Number(v)
  if (isNaN(n)) return '-'
  if (Number.isInteger(n)) return `${Math.floor(n / 3)}.${n % 3}`
  return n.toFixed(1)
}

function s(v: unknown): string {
  if (v === null || v === undefined || v === '') return '-'
  return String(v)
}

function fmtAvg(v: unknown): string {
  if (v === null || v === undefined || v === '') return '-'
  const n = Number(v)
  if (!isNaN(n) && n <= 1) return n.toFixed(3).replace('0.', '.')
  return String(v)
}

function n(v: unknown): number { return isNaN(Number(v)) ? 0 : Number(v) }

function calcAvg(st: Record<string, unknown>): string {
  if (st.avg !== null && st.avg !== undefined && st.avg !== '') return fmtAvg(st.avg)
  const ab = n(st.ab)
  if (ab === 0) return '-'
  return fmtAvg(n(st.h) / ab)
}

function calcObp(st: Record<string, unknown>): string {
  if (st.obp !== null && st.obp !== undefined && st.obp !== '') return fmtAvg(st.obp)
  const ab = n(st.ab), h = n(st.h), bb = n(st.bb), hbp = n(st.hbp), sf = n(st.sf)
  const denom = ab + bb + hbp + sf
  if (denom === 0) return '-'
  return fmtAvg((h + bb + hbp) / denom)
}

function calcSlg(st: Record<string, unknown>): string {
  if (st.slg !== null && st.slg !== undefined && st.slg !== '') return fmtAvg(st.slg)
  const ab = n(st.ab)
  if (ab === 0) return '-'
  const tb = n(st.h) + n(st.double) + 2 * n(st.triple) + 3 * n(st.hr)
  return fmtAvg(tb / ab)
}

function calcEra(st: Record<string, unknown>): string {
  if (st.era !== null && st.era !== undefined && st.era !== '') return s(st.era)
  const ip = n(st.pitch_ip), er = n(st.pitch_er)
  if (ip === 0) return '-'
  return (er / ip * 27).toFixed(2)
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0f1e2e] rounded-lg p-3 text-center border border-[var(--border)]">
      <p className="font-display font-800 text-lg text-white leading-none">{value}</p>
      <p className="font-display font-700 text-[9px] text-[var(--muted)] uppercase tracking-widest mt-1">{label}</p>
    </div>
  )
}

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
  const [data, setData] = useState<PlayerData | null>(null)
  const [loading, setLoading] = useState(true)
  const awards = getAwardsByPlayer(playerName)

  useEffect(() => {
    setLoading(true)
    setData(null)
    fetch(`/api/player-stats?name=${encodeURIComponent(playerName)}&type=${statType}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [playerName, statType])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const teamColor = TEAM_COLORS[teamId] ?? '#1e335a'
  const teamLogo = TEAM_LOGOS[teamId]
  const st = data?.seasonStats
  const bannerUrl = data?.photos?.banner_url
  const headshotUrl = data?.photos?.headshot_url

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-[#0a1220] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        {bannerUrl ? (
          /* MLB-style header with banner photo */
          <div className="relative shrink-0 border-b border-[var(--border)]">
            {/* Banner with gradient + overlaid content */}
            <div className="relative h-36 w-full overflow-hidden">
              <Image src={bannerUrl} alt={playerName} fill className="object-cover object-top" priority />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/80" />

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors text-xl leading-none"
              >×</button>

              {/* Headshot + name overlaid at bottom of banner */}
              <div className="absolute bottom-3 left-4 flex items-end gap-3">
                {headshotUrl && (
                  <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 shrink-0 shadow-lg">
                    <Image src={headshotUrl} alt={playerName} fill className="object-cover" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-display font-800 italic text-xl uppercase text-white leading-none drop-shadow-lg">
                    <strong>{playerName}</strong>
                  </p>
                  <p className="font-display font-700 text-[10px] uppercase tracking-widest mt-0.5 drop-shadow"
                    style={{ color: teamColor === '#121b31' ? '#f59e0b' : teamColor }}>
                    {TEAM_NAMES[teamId] ?? teamId} · {statType === 'pitching' ? 'Pitcher' : 'Batter'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Fallback header */
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0"
            style={{ background: `linear-gradient(135deg, ${teamColor}30, transparent)` }}>
            <div className="flex items-center gap-3">
              {teamLogo && (
                <div className="w-9 h-9 rounded-xl flex items-center justify-center p-1.5 shrink-0"
                  style={{ backgroundColor: teamColor }}>
                  <Image src={teamLogo} alt={teamId} width={28} height={28} className="object-contain w-full h-full" />
                </div>
              )}
              <div>
                <p className="font-display font-800 italic text-xl uppercase text-white leading-none">
                  <strong>{playerName}</strong>
                </p>
                <p className="font-display font-700 text-[10px] uppercase tracking-widest mt-0.5"
                  style={{ color: teamColor === '#121b31' ? 'var(--accent)' : teamColor }}>
                  {TEAM_NAMES[teamId] ?? teamId} · {statType === 'pitching' ? 'Pitcher' : 'Batter'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-[var(--card-hover)] flex items-center justify-center text-[var(--muted)] hover:text-white transition-colors text-xl leading-none shrink-0"
            >×</button>
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {!st ? (
                <div className="text-center py-8">
                  <p className="font-display font-700 text-[var(--muted)] text-sm uppercase">
                    No season stats found
                  </p>
                  <p className="font-display font-700 text-[var(--muted)] text-xs mt-1">
                    Season 2026
                  </p>
                </div>
              ) : statType === 'batting' ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  <StatBox label="AVG" value={calcAvg(st)} />
                  <StatBox label="AB"  value={s(st.ab)} />
                  <StatBox label="H"   value={s(st.h)} />
                  <StatBox label="HR"  value={s(st.hr)} />
                  <StatBox label="RBI" value={s(st.rbi)} />
                  <StatBox label="R"   value={s(st.r)} />
                  <StatBox label="BB"  value={s(st.bb)} />
                  <StatBox label="SO"  value={s(st.so)} />
                  <StatBox label="SB"  value={s(st.sb)} />
                  <StatBox label="2B"  value={s(st.double)} />
                  <StatBox label="3B"  value={s(st.triple)} />
                  <StatBox label="OBP" value={calcObp(st)} />
                  <StatBox label="SLG" value={calcSlg(st)} />
                  <StatBox label="PA"  value={s(st.pa)} />
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  <StatBox label="ERA" value={calcEra(st)} />
                  <StatBox label="IP"  value={fmtIp(st.pitch_ip)} />
                  <StatBox label="W"   value={s(st.pitch_win)} />
                  <StatBox label="L"   value={s(st.pitch_loss)} />
                  <StatBox label="SV"  value={s(st.pitch_save)} />
                  <StatBox label="SO"  value={s(st.pitch_so)} />
                  <StatBox label="BB"  value={s(st.pitch_bb)} />
                  <StatBox label="H"   value={s(st.pitch_h)} />
                  <StatBox label="ER"  value={s(st.pitch_er)} />
                  <StatBox label="App" value={s(st.pitch_appear)} />
                  <StatBox label="GS"  value={s(st.pitch_gs)} />
                  <StatBox label="CG"  value={s(st.pitch_cg)} />
                </div>
              )}

              {/* Awards */}
              {awards.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-3">Awards</p>
                  <div className="space-y-2">
                    {awards.map((award, i) => {
                      const cat = AWARD_CATEGORIES.find(c => c.key === award.category)
                      return (
                        <div key={i} className="flex items-center justify-between bg-[#0f1e2e] rounded-lg px-3 py-2.5 border border-[var(--border)]">
                          <div>
                            <p className="font-display font-800 text-sm uppercase text-white leading-none">
                              {cat?.en ?? award.category}
                            </p>
                            {award.label && (
                              <p className="font-display font-700 text-[10px] text-[var(--accent)] uppercase tracking-widest mt-0.5">{award.label}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-display font-700 text-xs text-[var(--muted)] uppercase">Season {award.season}</p>
                            {award.note && (
                              <p className="font-display font-700 text-[10px] text-[var(--muted)] italic mt-0.5">{award.note}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-[var(--border)] px-5 py-3">
          <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest text-center">
            Stats: KNBSB · Season 2026
          </p>
        </div>
      </div>
    </div>
  )
}
