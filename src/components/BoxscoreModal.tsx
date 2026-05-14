'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { BatterStat, PitcherStat } from '@/app/api/boxscore/[gameId]/route'

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
  awayBatters:  BatterStat[]
  homeBatters:  BatterStat[]
  awayPitchers: PitcherStat[]
  homePitchers: PitcherStat[]
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

function BattingTable({ batters, teamColor }: { batters: BatterStat[]; teamColor: string }) {
  if (!batters.length) return <p className="font-display font-700 text-xs text-[var(--muted)] uppercase py-4 text-center">No data</p>
  const cols = ['AB', 'H', 'R', 'RBI', 'BB', 'SO', 'HR']
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest py-2 pr-3 text-left">Batter</th>
            {cols.map(c => (
              <th key={c} className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest py-2 px-2 text-center w-8">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {batters.map((b, i) => {
            const avg = b.ab > 0 ? (b.h / b.ab).toFixed(3).replace('0.', '.') : '—'
            const hasHit = b.h > 0
            return (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    {b.pos && (
                      <span className="font-display font-700 text-[10px] uppercase text-center min-w-[20px]"
                        style={{ color: teamColor }}>{b.pos}</span>
                    )}
                    <span className={`font-display font-700 text-xs uppercase ${hasHit ? 'text-white' : 'text-[var(--muted)]'}`}>
                      {b.name}
                    </span>
                    <span className="font-display font-700 text-[10px] text-[var(--muted)]">{avg}</span>
                  </div>
                </td>
                {[b.ab, b.h, b.r, b.rbi, b.bb, b.so, b.hr].map((v, j) => (
                  <td key={j} className={`font-display font-700 text-xs text-center py-2 px-2 ${v > 0 ? 'text-white' : 'text-[var(--muted)]'}`}>
                    {v}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function PitchingTable({ pitchers, teamColor }: { pitchers: PitcherStat[]; teamColor: string }) {
  if (!pitchers.length) return <p className="font-display font-700 text-xs text-[var(--muted)] uppercase py-4 text-center">No data</p>
  const cols = ['IP', 'H', 'R', 'ER', 'BB', 'SO']
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest py-2 pr-3 text-left">Pitcher</th>
            {cols.map(c => (
              <th key={c} className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest py-2 px-2 text-center w-8">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {pitchers.map((p, i) => {
            const decision = p.win ? 'W' : p.loss ? 'L' : p.save ? 'S' : null
            return (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-700 text-xs uppercase text-white">{p.name}</span>
                    {decision && (
                      <span className="font-display font-800 text-[10px] px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: teamColor + '33', color: teamColor }}>
                        {decision}
                      </span>
                    )}
                  </div>
                </td>
                {[p.ip, p.h, p.r, p.er, p.bb, p.so].map((v, j) => (
                  <td key={j} className={`font-display font-700 text-xs text-center py-2 px-2 ${Number(v) > 0 || j === 0 ? 'text-white' : 'text-[var(--muted)]'}`}>
                    {v}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function BoxscoreModal({
  gameId, awayId, homeId, awayScore, homeScore, gameDate, onClose,
}: {
  gameId: string
  awayId: string
  homeId: string
  awayScore: number | null
  homeScore: number | null
  gameDate: string
  onClose: () => void
}) {
  const [data, setData]     = useState<BoxscoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]       = useState<'away' | 'home'>('away')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/boxscore/${gameId}`)
      .then(r => r.json())
      .then(d => { setData(d); setTab(d?.awayId ?? 'away') })
      .finally(() => setLoading(false))
  }, [gameId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const awayWon  = (awayScore ?? 0) > (homeScore ?? 0)
  const homeWon  = (homeScore ?? 0) > (awayScore ?? 0)
  const formattedDate = new Date(gameDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const activeId    = tab === 'away' ? (data?.awayId ?? awayId) : (data?.homeId ?? homeId)
  const teamColor   = TEAM_COLORS[activeId] ?? '#fe3d00'
  const batters     = tab === 'away' ? (data?.awayBatters ?? []) : (data?.homeBatters ?? [])
  const pitchers    = tab === 'away' ? (data?.awayPitchers ?? []) : (data?.homePitchers ?? [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-2xl bg-[#0a1220] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] shrink-0">
          <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest">{formattedDate}</p>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full bg-[var(--card-hover)] flex items-center justify-center text-[var(--muted)] hover:text-white transition-colors text-lg leading-none">
            ×
          </button>
        </div>

        {/* Score header */}
        <div className="px-5 py-5 flex items-center gap-4 shrink-0">
          <div className={`flex items-center gap-3 flex-1 min-w-0 justify-end ${!awayWon ? 'opacity-50' : ''}`}>
            <p className="font-display font-800 text-xl uppercase text-white text-right leading-none truncate">
              <strong>{TEAM_NAMES[data?.awayId ?? awayId] ?? awayId}</strong>
            </p>
            <TeamLogo teamId={data?.awayId ?? awayId} size={44} />
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
            <TeamLogo teamId={data?.homeId ?? homeId} size={44} />
            <p className="font-display font-800 text-xl uppercase text-white leading-none truncate">
              <strong>{TEAM_NAMES[data?.homeId ?? homeId] ?? homeId}</strong>
            </p>
          </div>
        </div>

        {loading && (
          <div className="px-5 pb-8 text-center shrink-0">
            <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!loading && data && (
          <div className="overflow-y-auto flex-1 min-h-0">
            {/* Inning score table */}
            <div className="px-3 pb-2 overflow-x-auto shrink-0">
              <table className="border-collapse text-center mx-auto">
                <thead>
                  <tr>
                    <th className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest py-2 px-2 text-left w-24">Team</th>
                    {data.displayInnings.map(i => (
                      <th key={i} className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest py-2 px-2 w-8">{i}</th>
                    ))}
                    <th className="font-display font-800 text-[10px] text-white uppercase tracking-widest py-2 px-3 border-l border-[var(--border)]">R</th>
                    <th className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest py-2 px-3">H</th>
                    <th className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest py-2 px-3">E</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[var(--border)]">
                    <td className="py-3 px-2 text-left">
                      <div className="flex items-center gap-1.5">
                        <TeamLogo teamId={data.awayId} size={22} />
                        <span className="font-display font-800 text-xs uppercase text-white">{data.awayId.slice(0, 3).toUpperCase()}</span>
                      </div>
                    </td>
                    {data.awayInnings.map((v, i) => (
                      <td key={i} className={`font-display font-700 text-sm py-3 px-2 ${v === null ? 'text-[var(--muted)]' : 'text-white'}`}>
                        {v === null ? '–' : String(v)}
                      </td>
                    ))}
                    <td className={`font-display font-800 text-base py-3 px-3 border-l border-[var(--border)] ${awayWon ? 'text-white' : 'text-[var(--muted)]'}`}>{data.awayTotals.r}</td>
                    <td className="font-display font-700 text-sm text-[var(--muted)] py-3 px-3">{data.awayTotals.h}</td>
                    <td className="font-display font-700 text-sm text-[var(--muted)] py-3 px-3">{data.awayTotals.e}</td>
                  </tr>
                  <tr className="border-t border-[var(--border)]">
                    <td className="py-3 px-2 text-left">
                      <div className="flex items-center gap-1.5">
                        <TeamLogo teamId={data.homeId} size={22} />
                        <span className="font-display font-800 text-xs uppercase text-white">{data.homeId.slice(0, 3).toUpperCase()}</span>
                      </div>
                    </td>
                    {data.homeInnings.map((v, i) => (
                      <td key={i} className={`font-display text-sm py-3 px-2 ${v === 'X' ? 'font-700 text-[var(--muted)] italic' : v === null ? 'text-[var(--muted)]' : 'font-700 text-white'}`}>
                        {v === null ? '–' : String(v)}
                      </td>
                    ))}
                    <td className={`font-display font-800 text-base py-3 px-3 border-l border-[var(--border)] ${homeWon ? 'text-white' : 'text-[var(--muted)]'}`}>{data.homeTotals.r}</td>
                    <td className="font-display font-700 text-sm text-[var(--muted)] py-3 px-3">{data.homeTotals.h}</td>
                    <td className="font-display font-700 text-sm text-[var(--muted)] py-3 px-3">{data.homeTotals.e}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Pitching decision line */}
            {(data.winPitcher || data.lossPitcher) && (
              <div className="border-t border-[var(--border)] px-5 py-3 flex gap-5 flex-wrap">
                {data.winPitcher && (
                  <div>
                    <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-0.5">W</p>
                    <p className="font-display font-800 text-sm text-white uppercase"><strong>{data.winPitcher.name}</strong></p>
                    <p className="font-display font-700 text-xs text-[var(--accent)]">{data.winPitcher.era} ERA</p>
                  </div>
                )}
                {data.lossPitcher && (
                  <div>
                    <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-0.5">L</p>
                    <p className="font-display font-800 text-sm text-white uppercase"><strong>{data.lossPitcher.name}</strong></p>
                    <p className="font-display font-700 text-xs text-[var(--accent)]">{data.lossPitcher.era} ERA</p>
                  </div>
                )}
                {data.savePitcher && (
                  <div>
                    <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-0.5">SV</p>
                    <p className="font-display font-800 text-sm text-white uppercase"><strong>{data.savePitcher.name}</strong></p>
                    <p className="font-display font-700 text-xs text-[var(--accent)]">{data.savePitcher.era} ERA</p>
                  </div>
                )}
              </div>
            )}

            {/* Team tabs */}
            <div className="border-t border-[var(--border)] flex">
              {([['away', data.awayId], ['home', data.homeId]] as const).map(([side, id]) => (
                <button
                  key={side}
                  onClick={() => setTab(side)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 font-display font-800 text-xs uppercase tracking-widest transition-colors ${
                    tab === side
                      ? 'text-white border-b-2'
                      : 'text-[var(--muted)] hover:text-white'
                  }`}
                  style={tab === side ? { borderColor: TEAM_COLORS[id] ?? '#fe3d00' } : {}}
                >
                  <TeamLogo teamId={id} size={20} />
                  {id.slice(0, 3).toUpperCase()}
                </button>
              ))}
            </div>

            {/* Batting */}
            <div className="px-4 pt-4 pb-2">
              <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-2">Batting</p>
              <BattingTable batters={batters} teamColor={teamColor} />
            </div>

            {/* Pitching */}
            <div className="px-4 pt-3 pb-5">
              <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-2">Pitching</p>
              <PitchingTable pitchers={pitchers} teamColor={teamColor} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
