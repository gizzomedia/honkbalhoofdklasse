'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES } from '@/lib/teams'
import type { TeamBatting, TeamPitching } from '@/lib/team-stats'

type Standing = {
  team_id: string; wins: number; losses: number; win_pct: number
  runs_scored: number; runs_allowed: number; games_played: number
}

type SortKey = 'standings' | 'avg' | 'hr' | 'r' | 'era' | 'so' | 'whip' | 'ops' | 'sb'
const ASC_KEYS: SortKey[] = ['era', 'whip'] // lower = better

type StatButton = { key: SortKey; label: string }
const BATTING_SORTS: StatButton[] = [
  { key: 'avg',  label: 'BA'   },
  { key: 'ops',  label: 'OPS'  },
  { key: 'hr',   label: 'HR'   },
  { key: 'r',    label: 'R'    },
  { key: 'sb',   label: 'SB'   },
]
const PITCHING_SORTS: StatButton[] = [
  { key: 'era',  label: 'ERA'  },
  { key: 'whip', label: 'WHIP' },
  { key: 'so',   label: 'SO'   },
]

function fmtRate(v: number): string {
  return v.toFixed(3).replace(/^0\./, '.')
}

function getValue(
  key: SortKey,
  standing: Standing | undefined,
  bat: TeamBatting | undefined,
  pit: TeamPitching | undefined,
): number {
  switch (key) {
    case 'standings': return standing ? standing.wins * 1000 + standing.win_pct : 0
    case 'avg':  return bat?.avg  ?? 0
    case 'ops':  return bat?.ops  ?? 0
    case 'hr':   return bat?.hr   ?? 0
    case 'r':    return bat?.r    ?? 0
    case 'sb':   return bat?.sb   ?? 0
    case 'era':  return pit?.era  ?? 99
    case 'so':   return pit?.pitch_so ?? 0
    case 'whip': return pit?.whip ?? 99
  }
}

function StatValue({ sortKey, bat, pit }: { sortKey: SortKey; bat?: TeamBatting; pit?: TeamPitching }) {
  switch (sortKey) {
    case 'avg':  return <>{bat ? fmtRate(bat.avg) : '—'}</>
    case 'ops':  return <>{bat ? fmtRate(bat.ops) : '—'}</>
    case 'hr':   return <>{bat?.hr ?? '—'}</>
    case 'r':    return <>{bat?.r  ?? '—'}</>
    case 'sb':   return <>{bat?.sb ?? '—'}</>
    case 'era':  return <>{pit ? pit.era.toFixed(2) : '—'}</>
    case 'so':   return <>{pit?.pitch_so ?? '—'}</>
    case 'whip': return <>{pit ? pit.whip.toFixed(2) : '—'}</>
    default:     return null
  }
}

export default function TeamsTable({
  standings,
  batting,
  pitching,
}: {
  standings: Standing[]
  batting:   TeamBatting[]
  pitching:  TeamPitching[]
}) {
  const [sortKey, setSortKey] = useState<SortKey>('standings')

  const batMap = Object.fromEntries(batting.map(b => [b.teamId, b]))
  const pitMap = Object.fromEntries(pitching.map(p => [p.teamId, p]))
  const stMap  = Object.fromEntries(standings.map(s => [s.team_id, s]))

  // Build team list from union of all data sources
  const allIds = Array.from(new Set([
    ...standings.map(s => s.team_id),
    ...batting.map(b => b.teamId),
  ]))

  const sorted = [...allIds].sort((a, b) => {
    const va = getValue(sortKey, stMap[a], batMap[a], pitMap[a])
    const vb = getValue(sortKey, stMap[b], batMap[b], pitMap[b])
    return ASC_KEYS.includes(sortKey) ? va - vb : vb - va
  })

  const activeStat = sortKey !== 'standings' ? sortKey : null

  function SortBtn({ btn }: { btn: StatButton }) {
    const active = sortKey === btn.key
    return (
      <button
        onClick={() => setSortKey(btn.key)}
        className={`shrink-0 font-display font-700 text-xs uppercase tracking-wider transition-all px-3.5 py-2 rounded-full border ${
          active
            ? 'text-white bg-[var(--accent)] border-[var(--accent)]'
            : 'text-[var(--muted)] border-white/10 hover:text-white hover:border-white/30'
        }`}
      >
        {btn.label}
        {active && <span className="ml-1 text-white/70">{ASC_KEYS.includes(btn.key) ? '↑' : '↓'}</span>}
      </button>
    )
  }

  return (
    <div>
      {/* Sort controls — horizontally scrollable on mobile */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setSortKey('standings')}
          className={`shrink-0 font-display font-700 text-xs uppercase tracking-wider transition-all px-3.5 py-2 rounded-full border ${
            sortKey === 'standings'
              ? 'text-white bg-[var(--accent)] border-[var(--accent)]'
              : 'text-[var(--muted)] border-white/10 hover:text-white hover:border-white/30'
          }`}
        >
          Standings
        </button>
        <div className="shrink-0 w-px h-5 bg-white/10 mx-1" />
        {BATTING_SORTS.map(btn => <SortBtn key={btn.key} btn={btn} />)}
        <div className="shrink-0 w-px h-5 bg-white/10 mx-1" />
        {PITCHING_SORTS.map(btn => <SortBtn key={btn.key} btn={btn} />)}
      </div>

      {/* Team rows */}
      <div className="space-y-3">
        {sorted.map((teamId, i) => {
          const s   = stMap[teamId]
          const bat = batMap[teamId]
          const pit = pitMap[teamId]
          const color = TEAM_COLORS[teamId] ?? '#1e335a'
          const name  = TEAM_NAMES[teamId]  ?? teamId
          const logo  = TEAM_LOGOS[teamId]
          const rd    = s ? s.runs_scored - s.runs_allowed : 0

          return (
            <Link
              key={teamId}
              href={`/teams/${teamId}`}
              className="flex items-center gap-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl px-5 py-4 hover:border-[var(--accent)]/40 hover:bg-[var(--card-hover)] transition-all group"
            >
              {/* Rank */}
              <span className="font-display font-800 text-2xl text-[var(--muted)] w-6 shrink-0 text-right">{i + 1}</span>

              {/* Logo */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 p-2" style={{ backgroundColor: color }}>
                {logo
                  ? <Image src={logo} alt={name} width={40} height={40} className="object-contain w-full h-full" />
                  : <span className="font-display font-800 text-xs text-white">{teamId.slice(0, 3).toUpperCase()}</span>
                }
              </div>

              {/* Name + record */}
              <div className="flex-1 min-w-0">
                <p className="font-display font-800 text-base md:text-lg uppercase tracking-wide text-white leading-none truncate">{name}</p>
                {s && (
                  <p className="font-display font-700 text-xs text-[var(--muted)] mt-1">
                    {s.wins}–{s.losses}
                    <span className="hidden sm:inline"> &middot; {s.win_pct.toFixed(3).replace('0.', '.')}</span>
                    <span className={`ml-1 ${rd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {rd >= 0 ? '+' : ''}{rd}
                    </span>
                  </p>
                )}
              </div>

              {/* Batting stats (desktop) */}
              <div className="hidden md:flex gap-6 shrink-0">
                {BATTING_SORTS.map(btn => (
                  <div key={btn.key} className="text-center w-10">
                    <p className={`font-display font-700 text-[10px] uppercase tracking-wider ${sortKey === btn.key ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>
                      {btn.label}
                    </p>
                    <p className={`font-display font-800 text-base ${sortKey === btn.key ? 'text-[var(--accent)]' : 'text-white'}`}>
                      <StatValue sortKey={btn.key} bat={bat} pit={pit} />
                    </p>
                  </div>
                ))}
              </div>

              <div className="hidden md:block w-px h-8 bg-white/10 shrink-0" />

              {/* Pitching stats (desktop) */}
              <div className="hidden md:flex gap-6 shrink-0">
                {PITCHING_SORTS.map(btn => (
                  <div key={btn.key} className="text-center w-10">
                    <p className={`font-display font-700 text-[10px] uppercase tracking-wider ${sortKey === btn.key ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>
                      {btn.label}
                    </p>
                    <p className={`font-display font-800 text-base ${sortKey === btn.key ? 'text-[var(--accent)]' : 'text-white'}`}>
                      <StatValue sortKey={btn.key} bat={bat} pit={pit} />
                    </p>
                  </div>
                ))}
              </div>

              {/* Active sort value on mobile */}
              {activeStat && (
                <div className="md:hidden text-center shrink-0">
                  <p className="font-display font-700 text-[10px] uppercase text-[var(--accent)] tracking-wider">
                    {BATTING_SORTS.concat(PITCHING_SORTS).find(b => b.key === activeStat)?.label}
                  </p>
                  <p className="font-display font-800 text-lg text-[var(--accent)]">
                    <StatValue sortKey={activeStat} bat={bat} pit={pit} />
                  </p>
                </div>
              )}

              <span className="font-display font-800 text-[var(--accent)] text-xl group-hover:translate-x-1 transition-transform shrink-0">→</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
