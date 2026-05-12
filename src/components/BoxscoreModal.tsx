'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

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
  neptunus: 'Neptunus', pirates: 'Amsterdam Pirates', kinheim: 'Kinheim',
  hcaw: 'HCAW', twins: 'Oosterhout Twins', pioniers: 'Hoofddorp Pioniers', uvv: 'UVV',
}

type BoxscoreData = {
  displayInnings: number[]
  startInning: number
  awayId: string
  homeId: string
  awayInnings: (number | string | null)[]
  homeInnings: (number | string | null)[]
  awayTotals: { r: number; h: number; e: number }
  homeTotals: { r: number; h: number; e: number }
  winPitcher:  { name: string; era: string } | null
  lossPitcher: { name: string; era: string } | null
  savePitcher: { name: string; era: string } | null
}

function TeamLogo({ teamId, size = 44 }: { teamId: string; size?: number }) {
  const logo  = TEAM_LOGOS[teamId]
  const color = TEAM_COLORS[teamId] ?? '#1e335a'
  return (
    <div className="rounded-xl flex items-center justify-center shrink-0 p-1.5"
      style={{ backgroundColor: color, width: size, height: size }}>
      {logo
        ? <Image src={logo} alt={teamId} width={size - 10} height={size - 10} className="object-contain w-full h-full" />
        : <span className="font-display font-800 text-white text-xs">{teamId.slice(0, 3).toUpperCase()}</span>
      }
    </div>
  )
}

export default function BoxscoreModal({
  gameId,
  awayId,
  homeId,
  awayScore,
  homeScore,
  gameDate,
  onClose,
}: {
  gameId: string
  awayId: string
  homeId: string
  awayScore: number | null
  homeScore: number | null
  gameDate: string
  onClose: () => void
}) {
  const [data, setData] = useState<BoxscoreData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/boxscore/${gameId}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [gameId])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const awayWon = (awayScore ?? 0) > (homeScore ?? 0)
  const homeWon = (homeScore ?? 0) > (awayScore ?? 0)

  const formattedDate = new Date(gameDate + 'T12:00:00').toLocaleDateString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl bg-[#0a1220] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest">{formattedDate}</p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[var(--card-hover)] flex items-center justify-center text-[var(--muted)] hover:text-white transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Score header */}
        <div className="px-5 py-5 flex items-center gap-4">
          {/* Away */}
          <div className={`flex items-center gap-3 flex-1 min-w-0 justify-end ${!awayWon ? 'opacity-50' : ''}`}>
            <p className="font-display font-800 text-xl uppercase text-white text-right leading-none truncate">
              <strong>{TEAM_NAMES[awayId] ?? awayId}</strong>
            </p>
            <TeamLogo teamId={awayId} size={44} />
          </div>
          <div className="shrink-0 text-center">
            <p className="font-display font-800 text-3xl text-white tabular-nums">
              <span className={awayWon ? 'text-white' : 'text-[var(--muted)]'}>{awayScore ?? '–'}</span>
              <span className="text-[var(--muted)] mx-2">–</span>
              <span className={homeWon ? 'text-white' : 'text-[var(--muted)]'}>{homeScore ?? '–'}</span>
            </p>
            <p className="font-display font-700 text-[10px] text-[var(--accent)] uppercase tracking-widest mt-1">Final</p>
          </div>
          <div className={`flex items-center gap-3 flex-1 min-w-0 ${!homeWon ? 'opacity-50' : ''}`}>
            <TeamLogo teamId={homeId} size={44} />
            <p className="font-display font-800 text-xl uppercase text-white leading-none truncate">
              <strong>{TEAM_NAMES[homeId] ?? homeId}</strong>
            </p>
          </div>
        </div>

        {loading && (
          <div className="px-5 pb-6 text-center">
            <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!loading && data && (
          <>
            {/* Inning score table */}
            <div className="px-3 pb-2 overflow-x-auto">
              <table className="w-full border-collapse text-center min-w-max mx-auto">
                <thead>
                  <tr>
                    <th className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest py-2 px-2 text-left w-24">Team</th>
                    {data.displayInnings.map(i => (
                      <th key={i} className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest py-2 px-2 w-8">
                        {i}
                      </th>
                    ))}
                    <th className="font-display font-800 text-[10px] text-white uppercase tracking-widest py-2 px-3 border-l border-[var(--border)]">R</th>
                    <th className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest py-2 px-3">H</th>
                    <th className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest py-2 px-3">E</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Away row */}
                  <tr className="border-t border-[var(--border)]">
                    <td className="py-3 px-2 text-left">
                      <div className="flex items-center gap-1.5">
                        <TeamLogo teamId={data.awayId} size={22} />
                        <span className="font-display font-800 text-xs uppercase text-white">{data.awayId.slice(0,3).toUpperCase()}</span>
                      </div>
                    </td>
                    {data.awayInnings.map((v, i) => (
                      <td key={i} className={`font-display font-700 text-sm py-3 px-2 ${v === null ? 'text-[var(--muted)]' : 'text-white'}`}>
                        {v === null ? '–' : String(v)}
                      </td>
                    ))}
                    <td className={`font-display font-800 text-base py-3 px-3 border-l border-[var(--border)] ${awayWon ? 'text-white' : 'text-[var(--muted)]'}`}>
                      {data.awayTotals.r}
                    </td>
                    <td className="font-display font-700 text-sm text-[var(--muted)] py-3 px-3">{data.awayTotals.h}</td>
                    <td className="font-display font-700 text-sm text-[var(--muted)] py-3 px-3">{data.awayTotals.e}</td>
                  </tr>
                  {/* Home row */}
                  <tr className="border-t border-[var(--border)]">
                    <td className="py-3 px-2 text-left">
                      <div className="flex items-center gap-1.5">
                        <TeamLogo teamId={data.homeId} size={22} />
                        <span className="font-display font-800 text-xs uppercase text-white">{data.homeId.slice(0,3).toUpperCase()}</span>
                      </div>
                    </td>
                    {data.homeInnings.map((v, i) => (
                      <td key={i} className={`font-display text-sm py-3 px-2 ${v === 'X' ? 'font-700 text-[var(--muted)] italic' : v === null ? 'text-[var(--muted)]' : 'font-700 text-white'}`}>
                        {v === null ? '–' : String(v)}
                      </td>
                    ))}
                    <td className={`font-display font-800 text-base py-3 px-3 border-l border-[var(--border)] ${homeWon ? 'text-white' : 'text-[var(--muted)]'}`}>
                      {data.homeTotals.r}
                    </td>
                    <td className="font-display font-700 text-sm text-[var(--muted)] py-3 px-3">{data.homeTotals.h}</td>
                    <td className="font-display font-700 text-sm text-[var(--muted)] py-3 px-3">{data.homeTotals.e}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Pitchers */}
            {(data.winPitcher || data.lossPitcher) && (
              <div className="border-t border-[var(--border)] px-5 py-4 flex gap-6 flex-wrap">
                {data.winPitcher && (
                  <div>
                    <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-0.5">W</p>
                    <p className="font-display font-800 text-sm text-white uppercase">
                      <strong>{data.winPitcher.name}</strong>
                    </p>
                    <p className="font-display font-700 text-xs text-[var(--accent)]">{data.winPitcher.era} ERA</p>
                  </div>
                )}
                {data.lossPitcher && (
                  <div>
                    <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-0.5">L</p>
                    <p className="font-display font-800 text-sm text-white uppercase">
                      <strong>{data.lossPitcher.name}</strong>
                    </p>
                    <p className="font-display font-700 text-xs text-[var(--accent)]">{data.lossPitcher.era} ERA</p>
                  </div>
                )}
                {data.savePitcher && (
                  <div>
                    <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-0.5">SV</p>
                    <p className="font-display font-800 text-sm text-white uppercase">
                      <strong>{data.savePitcher.name}</strong>
                    </p>
                    <p className="font-display font-700 text-xs text-[var(--accent)]">{data.savePitcher.era} ERA</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
