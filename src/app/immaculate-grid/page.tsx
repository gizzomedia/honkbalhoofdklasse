'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { getCurrentWeekGrid, isValidAnswer, getValidPlayers, type Criterion } from '@/lib/grid-data'
import { ROSTERS } from '@/lib/rosters-data'

const TEAM_COLORS: Record<string, string> = {
  neptunus: '#121b31', pirates: '#0f6f38', kinheim: '#c0232e',
  hcaw: '#f5b51a', twins: '#ee7e1a', pioniers: '#3d68e9', uvv: '#db002f',
}

const ALL_PLAYERS = Object.entries(ROSTERS).flatMap(([teamId, r]) =>
  r.players.map(p => ({ name: p.name, teamId }))
).sort((a, b) => a.name.localeCompare(b.name))

type CellState = 'empty' | 'correct' | 'wrong'
type CellData = { state: CellState; guess: string; teamId?: string }

function CritIcon({ crit, size = 'md' }: { crit: Criterion; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 28 : 40
  if (crit.type === 'team') {
    return (
      <div className={`rounded-xl flex items-center justify-center shrink-0 p-1.5`}
        style={{ backgroundColor: TEAM_COLORS[crit.teamId] ?? '#1e335a', width: s, height: s }}>
        <Image src={crit.logo} alt={crit.label} width={s - 10} height={s - 10} className="object-contain w-full h-full" />
      </div>
    )
  }
  return (
    <div className="text-lg leading-none">{(crit as { icon: string }).icon}</div>
  )
}

function InputModal({
  rowCrit, colCrit, onSubmit, onClose,
}: {
  rowCrit: Criterion
  colCrit: Criterion
  onSubmit: (name: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<{ name: string; teamId: string }[]>([])
  const [selected, setSelected] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return }
    const q = query.toLowerCase()
    setSuggestions(ALL_PLAYERS.filter(p => p.name.toLowerCase().includes(q)).slice(0, 8))
    setSelected(-1)
  }, [query])

  const submit = useCallback((name: string) => {
    if (!name.trim()) return
    onSubmit(name.trim())
    onClose()
  }, [onSubmit, onClose])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, -1)) }
    if (e.key === 'Enter') {
      if (selected >= 0 && suggestions[selected]) submit(suggestions[selected].name)
      else submit(query)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-[#0a1220] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1">Name a player</p>
          <div className="flex items-center gap-3">
            <CritIcon crit={rowCrit} size="sm" />
            <span className="font-display font-700 text-xs text-[var(--muted)] uppercase">×</span>
            <CritIcon crit={colCrit} size="sm" />
            <div className="ml-1">
              <p className="font-display font-800 text-sm text-white uppercase leading-tight">{rowCrit.label}</p>
              <p className="font-display font-700 text-xs text-[var(--muted)] uppercase">{colCrit.label}</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Type player name…"
            className="w-full bg-[#0d1b2e] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg px-4 py-3 text-white placeholder:text-white/30 outline-none font-display font-700 text-sm [color-scheme:dark]"
          />

          {suggestions.length > 0 && (
            <div className="mt-2 rounded-xl border border-[var(--border)] overflow-hidden">
              {suggestions.map((p, i) => (
                <button
                  key={p.name}
                  onClick={() => submit(p.name)}
                  onMouseEnter={() => setSelected(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === selected ? 'bg-[var(--accent)]' : 'bg-[var(--card)] hover:bg-[var(--card-hover)]'
                  }`}
                >
                  <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 p-0.5"
                    style={{ backgroundColor: TEAM_COLORS[p.teamId] ?? '#1e335a' }}>
                    <Image
                      src={ROSTERS[p.teamId] ? `https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/${p.teamId}_logo.png` : ''}
                      alt=""
                      width={20} height={20}
                      className="object-contain w-full h-full"
                      onError={() => {}}
                    />
                  </div>
                  <span className="font-display font-800 text-sm text-white uppercase">{p.name}</span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => submit(query)}
            disabled={!query.trim()}
            className="mt-3 w-full bg-[var(--accent)] disabled:opacity-40 py-3 rounded-lg font-display font-800 text-sm uppercase tracking-wider text-white hover:bg-[var(--accent)]/80 transition-colors"
          >
            Submit →
          </button>
        </div>
      </div>
    </div>
  )
}

const SAVE_KEY = (week: number) => `hk_grid_w${week}`

export default function ImmaculateGridPage() {
  const grid = getCurrentWeekGrid()
  const [cells, setCells] = useState<CellData[]>(() =>
    Array(9).fill(null).map(() => ({ state: 'empty', guess: '' }))
  )
  const [guessesLeft, setGuessesLeft] = useState(9)
  const [activeCell, setActiveCell] = useState<number | null>(null)
  const [flash, setFlash] = useState<{ idx: number; ok: boolean } | null>(null)

  // Load saved state
  useEffect(() => {
    const saved = localStorage.getItem(SAVE_KEY(grid.week))
    if (saved) {
      const parsed = JSON.parse(saved)
      setCells(parsed.cells)
      setGuessesLeft(parsed.guessesLeft)
    }
  }, [grid.week])

  // Save state on change
  useEffect(() => {
    localStorage.setItem(SAVE_KEY(grid.week), JSON.stringify({ cells, guessesLeft }))
  }, [cells, guessesLeft, grid.week])

  const handleGuess = useCallback((cellIdx: number, playerName: string) => {
    const row = Math.floor(cellIdx / 3)
    const col = cellIdx % 3
    const rowCrit = grid.rows[row]
    const colCrit = grid.cols[col]

    // Find which team the player is on (for team criteria)
    let teamId = ''
    for (const [tid, roster] of Object.entries(ROSTERS)) {
      if (roster.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
        teamId = tid; break
      }
    }

    const valid = isValidAnswer(playerName, teamId, rowCrit, colCrit)

    setFlash({ idx: cellIdx, ok: valid })
    setTimeout(() => setFlash(null), 800)

    setCells(prev => {
      const next = [...prev]
      next[cellIdx] = {
        state: valid ? 'correct' : 'wrong',
        guess: playerName,
        teamId: valid ? teamId : undefined,
      }
      return next
    })
    setGuessesLeft(g => g - 1)
    setActiveCell(null)
  }, [grid])

  const score = cells.filter(c => c.state === 'correct').length
  const done = guessesLeft === 0 || score === 9

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">
          Week {grid.week} · Season 2026
        </p>
        <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
          <strong>Immaculate</strong>
          <span className="text-[var(--accent)]"> Grid</span>
        </h1>
        <p className="font-display font-700 text-[var(--muted)] text-sm mt-2 uppercase tracking-widest">
          Name a Hoofdklasse player matching each row × column
        </p>
      </div>

      {/* Score bar */}
      <div className="flex items-center gap-4 mb-6 bg-[var(--card)] border border-[var(--border)] rounded-xl px-5 py-3">
        <div className="flex-1">
          <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">Score</p>
          <p className="font-display font-800 text-2xl text-white">{score}<span className="text-[var(--muted)] text-base">/9</span></p>
        </div>
        <div className="h-10 w-px bg-[var(--border)]" />
        <div className="flex-1 text-right">
          <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">Guesses left</p>
          <p className={`font-display font-800 text-2xl ${guessesLeft <= 3 ? 'text-[var(--accent)]' : 'text-white'}`}>
            {guessesLeft}
          </p>
        </div>
        {done && (
          <div className="border-l border-[var(--border)] pl-4">
            <p className="font-display font-800 text-sm uppercase text-[var(--accent)]">
              {score === 9 ? '🏆 Perfect!' : score >= 6 ? '⭐ Great!' : score >= 3 ? '👍 Good!' : '💪 Keep going!'}
            </p>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-[80px_1fr_1fr_1fr] grid-rows-[80px_1fr_1fr_1fr] gap-2">

        {/* Top-left empty corner */}
        <div />

        {/* Column headers */}
        {grid.cols.map((crit, i) => (
          <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl flex flex-col items-center justify-center gap-1.5 p-2">
            <CritIcon crit={crit} />
            <p className="font-display font-800 text-[10px] uppercase text-white text-center leading-tight">
              {crit.label}
            </p>
          </div>
        ))}

        {/* Rows */}
        {grid.rows.map((rowCrit, row) => (
          <>
            {/* Row header */}
            <div key={`rh-${row}`} className="bg-[var(--card)] border border-[var(--border)] rounded-xl flex flex-col items-center justify-center gap-1.5 p-2">
              <CritIcon crit={rowCrit} />
              <p className="font-display font-800 text-[10px] uppercase text-white text-center leading-tight">
                {rowCrit.label}
              </p>
            </div>

            {/* Cells */}
            {grid.cols.map((colCrit, col) => {
              const idx = row * 3 + col
              const cell = cells[idx]
              const isFlashing = flash?.idx === idx
              const canClick = cell.state === 'empty' && guessesLeft > 0 && !done

              return (
                <button
                  key={`c-${idx}`}
                  onClick={() => canClick && setActiveCell(idx)}
                  disabled={!canClick}
                  className={`relative rounded-xl border flex flex-col items-center justify-center p-2 transition-all ${
                    isFlashing && flash?.ok  ? 'border-green-500 bg-green-500/20 scale-95' :
                    isFlashing && !flash?.ok ? 'border-red-500 bg-red-500/20 scale-95' :
                    cell.state === 'correct' ? 'border-green-600/50 bg-green-600/10' :
                    cell.state === 'wrong'   ? 'border-red-900/50 bg-red-900/10' :
                    canClick                 ? 'border-[var(--border)] bg-[var(--card)] hover:bg-[var(--card-hover)] hover:border-[var(--accent)]/50 cursor-pointer' :
                    'border-[var(--border)] bg-[var(--card)] opacity-50 cursor-not-allowed'
                  }`}
                  style={{ minHeight: 90 }}
                >
                  {cell.state === 'correct' && cell.teamId && (
                    <>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 p-1"
                        style={{ backgroundColor: TEAM_COLORS[cell.teamId] ?? '#1e335a' }}>
                        <Image
                          src={`https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/${
                            { neptunus: 'Neptunus_logo_wit_afyyae', pirates: 'pirates_logo_ic4rk8',
                              kinheim: 'Kinheim_logo_d4zw2t', hcaw: 'HCAW_logo_wit_rijssy',
                              twins: 'Twins_wit_c7dumy', pioniers: 'Pioniers_logo_mqj4tb',
                              uvv: 'UVV_logo_xcaa5d' }[cell.teamId] ?? 'Neptunus_logo_wit_afyyae'
                          }.png`}
                          alt={cell.teamId} width={24} height={24}
                          className="object-contain w-full h-full"
                        />
                      </div>
                      <p className="font-display font-800 text-[11px] uppercase text-white text-center leading-tight">
                        {cell.guess}
                      </p>
                    </>
                  )}
                  {cell.state === 'wrong' && (
                    <p className="font-display font-700 text-[10px] text-red-400/70 uppercase text-center line-through leading-tight px-1">
                      {cell.guess}
                    </p>
                  )}
                  {cell.state === 'empty' && canClick && (
                    <span className="text-[var(--muted)] text-2xl font-light">+</span>
                  )}
                </button>
              )
            })}
          </>
        ))}
      </div>

      {/* How to play */}
      <div className="mt-8 bg-[var(--card)] border border-[var(--border)] rounded-xl px-5 py-4">
        <p className="font-display font-800 text-xs uppercase text-white mb-2">How to play</p>
        <ul className="space-y-1">
          {[
            'Name a Hoofdklasse player matching the row team AND column criteria',
            'Each cell uses 1 of your 9 guesses — whether right or wrong',
            'A new grid drops every week',
          ].map((tip, i) => (
            <li key={i} className="font-display font-700 text-xs text-[var(--muted)] flex gap-2">
              <span className="text-[var(--accent)] shrink-0">·</span>{tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Input modal */}
      {activeCell !== null && (
        <InputModal
          rowCrit={grid.rows[Math.floor(activeCell / 3)]}
          colCrit={grid.cols[activeCell % 3]}
          onSubmit={name => handleGuess(activeCell, name)}
          onClose={() => setActiveCell(null)}
        />
      )}
    </div>
  )
}
