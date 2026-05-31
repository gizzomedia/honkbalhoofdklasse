'use client'

import { useState, useEffect } from 'react'

type Player = { name: string; pos: string }

export default function SupplementalRoster({ teamId, teamColor }: { teamId: string; teamColor: string }) {
  const [players, setPlayers] = useState<Player[]>([])

  useEffect(() => {
    fetch(`/api/roster-supplement/${teamId}`)
      .then(r => r.json())
      .then(setPlayers)
      .catch(() => {})
  }, [teamId])

  if (!players.length) return null

  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-1 h-5 bg-[var(--muted)] shrink-0" />
        <h2 className="font-display font-800 italic text-xl uppercase text-white tracking-tight">
          <strong>Nieuw dit seizoen</strong>
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {players.map(player => (
          <div
            key={player.name}
            className="flex items-center gap-4 bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3"
          >
            <span className="font-display font-800 text-lg w-8 text-center shrink-0 text-[var(--muted)]">—</span>
            <div className="flex-1 min-w-0">
              <p className="font-display font-800 text-sm uppercase text-white truncate">
                <strong>{player.name}</strong>
              </p>
              <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">
                {player.pos === 'P' ? 'Pitcher' : 'Positiespeler'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
