'use client'

import { useEffect, useState } from 'react'

type GameSplit = { date: string; opponent: string; ab: number; r: number; h: number; hr: number; rbi: number; bb: number; so: number; sb: number }
type SplitRow  = { label: string; ab: number; r: number; h: number; hr: number; rbi: number; bb: number; so: number; sb: number; avg: string }

const STAT_COLS = ['AB','R','H','HR','RBI','BB','SO','SB'] as const

export default function PlayerSplits({ playerName, teamId, accentColor }: { playerName: string; teamId: string; accentColor: string }) {
  const [splits, setSplits]   = useState<SplitRow[]>([])
  const [games,  setGames]    = useState<GameSplit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/player-splits?player=${encodeURIComponent(playerName)}&team=${encodeURIComponent(teamId)}`)
      .then(r => r.json())
      .then(({ splits, games }) => { setSplits(splits ?? []); setGames(games ?? []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [playerName, teamId])

  if (loading) return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 text-center">
      <p className="font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)]">Loading splits…</p>
    </div>
  )

  if (!splits.length && !games.length) return null

  return (
    <div className="space-y-4">
      {/* Duration totals */}
      {splits.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)]">Period</th>
                {[...STAT_COLS, 'AVG'].map(col => (
                  <th key={col} className="text-center px-3 py-3 font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)]">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {splits.map(s => (
                <tr key={s.label} className="hover:bg-[var(--card-hover)] transition-colors">
                  <td className="px-4 py-3 font-display font-700 text-sm text-white whitespace-nowrap">{s.label}</td>
                  {([s.ab, s.r, s.h, s.hr, s.rbi, s.bb, s.so, s.sb] as number[]).map((v, i) => (
                    <td key={i} className="px-3 py-3 text-center font-display font-700 text-sm text-white/80">{v}</td>
                  ))}
                  <td className="px-3 py-3 text-center font-display font-800 text-sm text-white">{s.avg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Last N game log */}
      {games.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-x-auto">
          <div className="px-4 pt-3 pb-1">
            <p className="font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)]">Last {games.length} Games</p>
          </div>
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-4 py-2 font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)]">Date</th>
                <th className="text-left px-3 py-2 font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)]">OPP</th>
                {STAT_COLS.map(col => (
                  <th key={col} className="text-center px-2 py-2 font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)]">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {games.map((g, i) => (
                <tr key={i} className="hover:bg-[var(--card-hover)] transition-colors">
                  <td className="px-4 py-2.5 font-display font-700 text-xs text-white/60 whitespace-nowrap">
                    {new Date(g.date + 'T12:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-3 py-2.5 font-display font-700 text-xs text-[var(--muted)] uppercase">{g.opponent}</td>
                  {([g.ab, g.r, g.h, g.hr, g.rbi, g.bb, g.so, g.sb] as number[]).map((v, j) => (
                    <td key={j} className={`px-2 py-2.5 text-center font-display font-700 text-sm ${v > 0 ? 'text-white' : 'text-white/20'}`}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
