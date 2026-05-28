'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { BatterStat, PitcherStat } from '@/app/api/boxscore/[gameId]/route'
import { TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES } from '@/lib/teams'

type Situation = {
  inning: number
  isBottom: boolean
  outs: number
  balls: number
  strikes: number
  runner1: boolean
  runner2: boolean
  runner3: boolean
  currentBatter:  string | null
  currentPitcher: string | null
}

type BoxscoreData = {
  isLive: boolean
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
  situation: Situation | null
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

function BaseDiamond({ r1, r2, r3, size = 10 }: { r1: boolean; r2: boolean; r3: boolean; size?: number }) {
  const s = size
  const filled = '#fe3d00'
  const empty  = '#1a2a3a'
  return (
    <svg width={s * 3} height={s * 2.4} viewBox="0 0 30 24">
      {/* 2B top-center */}
      <rect x="11" y="0" width="8" height="8" transform="rotate(45 15 4)" fill={r2 ? filled : empty} />
      {/* 1B right */}
      <rect x="20" y="8" width="8" height="8" transform="rotate(45 24 12)" fill={r1 ? filled : empty} />
      {/* 3B left */}
      <rect x="2"  y="8" width="8" height="8" transform="rotate(45 6 12)"  fill={r3 ? filled : empty} />
    </svg>
  )
}

function SituationBar({ sit }: { sit: Situation }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-[#060e1b] border-t border-[var(--border)]">
      {/* Inning */}
      <div className="text-center shrink-0">
        <p className="font-display font-800 text-[10px] text-[var(--muted)] uppercase">{sit.isBottom ? 'Bot' : 'Top'}</p>
        <p className="font-display font-800 text-base text-white tabular-nums leading-none">{sit.inning}</p>
        <p className="font-display font-700 text-[9px] text-[var(--muted)] uppercase tracking-widest">Inning</p>
      </div>

      <div className="w-px h-8 bg-[var(--border)]" />

      {/* Outs */}
      <div className="text-center shrink-0">
        <div className="flex gap-1 justify-center mb-0.5">
          {[0, 1, 2].map(i => (
            <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < sit.outs ? 'bg-[var(--accent)]' : 'bg-[#1a2a3a]'}`} />
          ))}
        </div>
        <p className="font-display font-700 text-[9px] text-[var(--muted)] uppercase tracking-widest">Outs</p>
      </div>

      <div className="w-px h-8 bg-[var(--border)]" />

      {/* Bases */}
      <div className="flex flex-col items-center shrink-0">
        <BaseDiamond r1={sit.runner1} r2={sit.runner2} r3={sit.runner3} size={10} />
        <p className="font-display font-700 text-[9px] text-[var(--muted)] uppercase tracking-widest mt-0.5">Bases</p>
      </div>

      <div className="w-px h-8 bg-[var(--border)]" />

      {/* Count */}
      <div className="text-center shrink-0">
        <p className="font-display font-800 text-base text-white tabular-nums">{sit.balls}-{sit.strikes}</p>
        <p className="font-display font-700 text-[9px] text-[var(--muted)] uppercase tracking-widest">Count</p>
      </div>

      {/* Batter / Pitcher */}
      {(sit.currentBatter || sit.currentPitcher) && (
        <>
          <div className="w-px h-8 bg-[var(--border)]" />
          <div className="flex-1 min-w-0 space-y-0.5">
            {sit.currentBatter && (
              <p className="font-display font-700 text-xs text-white uppercase truncate">
                <span className="text-[var(--muted)] mr-1.5">AB</span>{sit.currentBatter}
              </p>
            )}
            {sit.currentPitcher && (
              <p className="font-display font-700 text-xs text-white uppercase truncate">
                <span className="text-[var(--muted)] mr-1.5">P</span>{sit.currentPitcher}
              </p>
            )}
          </div>
        </>
      )}
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
            const isPinch = b.isSubstitute || b.pos.startsWith('PH') || b.pos.startsWith('PR')
            return (
            <tr key={i} className="hover:bg-white/[0.02] transition-colors">
              <td className="py-2 pr-3">
                <div className="flex items-center gap-1.5">
                  {isPinch && <span className="text-white/30 text-xs shrink-0 pl-2">↳</span>}
                  {b.pos && (
                    <span className={`font-display font-700 text-[10px] uppercase text-center min-w-[24px] shrink-0 ${isPinch ? 'text-[var(--accent)]' : 'text-white/60'}`}>
                      {b.pos}
                    </span>
                  )}
                  <span className="font-display font-700 text-xs uppercase text-white">{b.name}</span>
                </div>
              </td>
              {[b.ab, b.h, b.r, b.rbi, b.bb, b.so, b.hr].map((v, j) => (
                <td key={j} className="font-display font-700 text-xs text-center py-2 px-2 tabular-nums text-white">
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
                  <td key={j} className="font-display font-700 text-xs text-center py-2 px-2 text-white">
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
            <p className="font-display font-700 text-[10px] text-[var(--accent)] uppercase tracking-widest mt-1">
              {data?.isLive ? 'Live' : 'Final'}
            </p>
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

            {/* Live situation */}
            {data.situation && <SituationBar sit={data.situation} />}

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
