'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ROSTERS, slugify } from '@/lib/rosters-data'
import { TEAM_NAMES, TEAM_LOGOS, TEAM_COLORS } from '@/lib/teams'
import PlayerStatsModal from '@/components/PlayerStatsModal'

type PlayerResult = {
  name: string
  teamId: string
  teamName: string
  pos: string
  uniform: string
  slug: string
}

const ALL_PLAYERS: PlayerResult[] = Object.entries(ROSTERS).flatMap(([teamId, roster]) =>
  roster.players.map(p => ({
    name: p.name,
    teamId,
    teamName: TEAM_NAMES[teamId] ?? teamId,
    pos: p.pos,
    uniform: p.uniform,
    slug: slugify(p.name),
  }))
)

export default function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState<PlayerResult[]>([])
  const [active, setActive]         = useState(0)
  const [selected, setSelected]     = useState<PlayerResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router   = useRouter()

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const q = query.toLowerCase()
    const filtered = ALL_PLAYERS.filter(p =>
      p.name.toLowerCase().includes(q) || p.teamName.toLowerCase().includes(q)
    ).slice(0, 7)
    setResults(filtered)
    setActive(0)
  }, [query])

  function go(player: PlayerResult) {
    setSelected(player)
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { setActive(a => Math.min(a + 1, results.length - 1)); e.preventDefault() }
    if (e.key === 'ArrowUp')   { setActive(a => Math.max(a - 1, 0)); e.preventDefault() }
    if (e.key === 'Enter' && results[active]) go(results[active])
  }

  if (selected) {
    return (
      <PlayerStatsModal
        playerName={selected.name}
        teamId={selected.teamId}
        statType={selected.pos === 'P' ? 'pitching' : 'batting'}
        onClose={onClose}
      />
    )
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="bg-[#0a1220] border border-[#1a2a3a] rounded-2xl overflow-hidden shadow-2xl">

          {/* Input */}
          <div className="flex items-center gap-3 px-4 border-b border-[#1a2a3a]">
            <svg className="w-5 h-5 text-[var(--muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={onKey}
              placeholder="Zoek een speler of team…"
              className="flex-1 bg-transparent py-4 font-display font-700 text-white text-base outline-none placeholder:text-[var(--muted)]"
            />
            <kbd className="font-display font-700 text-[10px] text-[var(--muted)] border border-[#1a2a3a] rounded px-2 py-1 uppercase tracking-wider">
              Esc
            </kbd>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="py-2">
              {results.map((player, i) => (
                <button
                  key={`${player.teamId}-${player.slug}`}
                  onClick={() => go(player)}
                  onMouseEnter={() => setActive(i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${i === active ? 'bg-[var(--accent)]/10' : 'hover:bg-white/5'}`}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 p-1.5"
                    style={{ backgroundColor: TEAM_COLORS[player.teamId] ?? '#1e335a' }}
                  >
                    <Image src={TEAM_LOGOS[player.teamId]} alt={player.teamId} width={28} height={28} className="object-contain w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-800 text-sm text-white uppercase tracking-wide">{player.name}</p>
                    <p className="font-display font-700 text-xs text-[var(--muted)]">
                      {player.teamName} · #{player.uniform} · {player.pos}
                    </p>
                  </div>
                  {i === active && (
                    <span className="font-display font-700 text-xs text-[var(--accent)] shrink-0">→</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {query.trim() && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="font-display font-700 text-sm text-[var(--muted)] uppercase tracking-wider">
                Geen spelers gevonden voor &ldquo;{query}&rdquo;
              </p>
            </div>
          )}

          {!query.trim() && (
            <div className="px-4 py-4">
              <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-2">Snel navigeren</p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(TEAM_NAMES).map(([id, name]) => (
                  <button
                    key={id}
                    onClick={() => { router.push(`/rosters/${id}`); onClose() }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="w-6 h-6 rounded flex items-center justify-center p-1 shrink-0" style={{ backgroundColor: TEAM_COLORS[id] }}>
                      <Image src={TEAM_LOGOS[id]} alt={id} width={16} height={16} className="object-contain w-full h-full" />
                    </div>
                    <span className="font-display font-700 text-xs text-white/70 uppercase tracking-wide">{name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
