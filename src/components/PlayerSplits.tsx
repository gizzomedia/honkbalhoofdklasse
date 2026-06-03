'use client'

import { useEffect, useState } from 'react'

type BatSplit = { label: string; found: number; ab: number; r: number; h: number; hr: number; rbi: number; bb: number; so: number; sb: number; avg: string }
type PitSplit = { label: string; found: number; ip: string; k: number; bb: number; er: number; h: number; w: number; l: number; era: string }
type BatGame  = { date: string; opponent: string; ab: number; r: number; h: number; hr: number; rbi: number; bb: number; so: number; sb: number }
type PitGame  = { date: string; opponent: string; ip: string; k: number; bb: number; er: number; h: number; w: number; l: number; era: string }

const BAT_COLS = ['AB','R','H','HR','RBI','BB','SO','SB'] as const
const PIT_COLS = ['IP','W','L','K','BB','H','ER'] as const

export default function PlayerSplits({ playerName, teamId }: { playerName: string; teamId: string }) {
  const [type,    setType]    = useState<'batting'|'pitching'|null>(null)
  const [batSplits, setBatSplits] = useState<BatSplit[]>([])
  const [pitSplits, setPitSplits] = useState<PitSplit[]>([])
  const [batGames,  setBatGames]  = useState<BatGame[]>([])
  const [pitGames,  setPitGames]  = useState<PitGame[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/player-splits?player=${encodeURIComponent(playerName)}&team=${encodeURIComponent(teamId)}`)
      .then(r => r.json())
      .then(d => {
        setType(d.type ?? null)
        if (d.type === 'pitching') { setPitSplits(d.splits ?? []); setPitGames(d.games ?? []) }
        else { setBatSplits(d.splits ?? []); setBatGames(d.games ?? []) }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [playerName, teamId])

  if (loading) return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 text-center">
      <p className="font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)]">Loading splits…</p>
    </div>
  )

  const hasBat = batSplits.length > 0 || batGames.length > 0
  const hasPit = pitSplits.length > 0 || pitGames.length > 0
  if (!hasBat && !hasPit) return null

  return (
    <div className="space-y-4">

      {/* ── BATTING SPLITS ── */}
      {hasBat && (
        <>
          {batSplits.length > 0 && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left px-4 py-3 font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)]">Period</th>
                    {[...BAT_COLS, 'AVG'].map(c => (
                      <th key={c} className="text-center px-3 py-3 font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)]">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {batSplits.map(s => (
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
          {batGames.length > 0 && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-x-auto">
              <div className="px-4 pt-3 pb-1">
                <p className="font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)]">Last {batGames.length} Games</p>
              </div>
              <table className="w-full text-sm min-w-[440px]">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left px-4 py-2 font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)]">Date</th>
                    <th className="text-left px-3 py-2 font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)]">OPP</th>
                    {BAT_COLS.map(c => <th key={c} className="text-center px-2 py-2 font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)]">{c}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {batGames.map((g, i) => (
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
        </>
      )}

      {/* ── PITCHING SPLITS ── */}
      {hasPit && (
        <>
          {pitSplits.length > 0 && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left px-4 py-3 font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)]">Period</th>
                    {[...PIT_COLS, 'ERA'].map(c => (
                      <th key={c} className="text-center px-3 py-3 font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)]">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {pitSplits.map(s => (
                    <tr key={s.label} className="hover:bg-[var(--card-hover)] transition-colors">
                      <td className="px-4 py-3 font-display font-700 text-sm text-white whitespace-nowrap">{s.label}</td>
                      {[s.ip, s.w, s.l, s.k, s.bb, s.h, s.er].map((v, i) => (
                        <td key={i} className="px-3 py-3 text-center font-display font-700 text-sm text-white/80">{v}</td>
                      ))}
                      <td className="px-3 py-3 text-center font-display font-800 text-sm text-white">{s.era}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pitGames.length > 0 && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-x-auto">
              <div className="px-4 pt-3 pb-1">
                <p className="font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)]">Last {pitGames.length} Games</p>
              </div>
              <table className="w-full text-sm min-w-[440px]">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left px-4 py-2 font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)]">Date</th>
                    <th className="text-left px-3 py-2 font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)]">OPP</th>
                    {[...PIT_COLS, 'ERA'].map(c => <th key={c} className="text-center px-2 py-2 font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)]">{c}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {pitGames.map((g, i) => (
                    <tr key={i} className="hover:bg-[var(--card-hover)] transition-colors">
                      <td className="px-4 py-2.5 font-display font-700 text-xs text-white/60 whitespace-nowrap">
                        {new Date(g.date + 'T12:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-3 py-2.5 font-display font-700 text-xs text-[var(--muted)] uppercase">{g.opponent}</td>
                      {[g.ip, g.w, g.l, g.k, g.bb, g.h, g.er].map((v, j) => (
                        <td key={j} className={`px-2 py-2.5 text-center font-display font-700 text-sm ${Number(v) > 0 || String(v).includes('.') ? 'text-white' : 'text-white/20'}`}>{v}</td>
                      ))}
                      <td className="px-2 py-2.5 text-center font-display font-800 text-sm text-white">{g.era}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
