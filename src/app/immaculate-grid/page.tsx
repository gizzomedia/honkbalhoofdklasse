'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { getCurrentWeekGrid, getMostRecentFriday, fridayDateKey, isValidAnswer, type Criterion, type GridConfig } from '@/lib/grid-data'
import NotifyButton from '@/components/NotifyButton'
import { ROSTERS } from '@/lib/rosters-data'

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

const ALL_PLAYERS = Object.entries(ROSTERS).flatMap(([teamId, r]) =>
  r.players.map(p => ({ name: p.name, teamId }))
).sort((a, b) => a.name.localeCompare(b.name))

// ── Header cell: logo for teams, bold text for criteria ────────────────────
function HeaderCell({ crit, axis }: { crit: Criterion; axis: 'row' | 'col' }) {
  const isTeam = crit.type === 'team'
  const size = axis === 'col' ? 64 : 56

  if (isTeam) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 h-full">
        <div
          className="rounded-xl flex items-center justify-center p-2 shrink-0"
          style={{ backgroundColor: TEAM_COLORS[crit.teamId], width: size, height: size }}
        >
          <Image src={crit.logo} alt={crit.label} width={size - 16} height={size - 16} className="object-contain w-full h-full" />
        </div>
        <p className="font-display font-800 text-[11px] uppercase text-white text-center leading-tight hidden md:block">
          {crit.label}
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-full px-2">
      <p className="font-display font-800 text-sm md:text-base uppercase text-white text-center leading-snug tracking-wide">
        {crit.label}
      </p>
    </div>
  )
}

// ── Player search modal ────────────────────────────────────────────────────
function InputModal({
  rowCrit, colCrit, onSubmit, onClose,
}: {
  rowCrit: Criterion; colCrit: Criterion
  onSubmit: (name: string) => void; onClose: () => void
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
  }, [onSubmit])

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
      <div className="relative w-full max-w-sm bg-[#0a1220] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Criteria context */}
        <div className="px-5 py-4 border-b border-[var(--border)] bg-[#060e1a]">
          <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-2">Name a player who is a…</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-[var(--accent)]/20 border border-[var(--accent)]/40 rounded-lg px-3 py-1.5 font-display font-800 text-xs uppercase text-white">
              {rowCrit.label}
            </span>
            <span className="font-display font-700 text-xs text-[var(--muted)]">+</span>
            <span className="bg-[var(--accent)]/20 border border-[var(--accent)]/40 rounded-lg px-3 py-1.5 font-display font-800 text-xs uppercase text-white">
              {colCrit.label}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Type player name…"
            className="w-full bg-[#0d1b2e] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg px-4 py-3 text-white placeholder:text-white/30 outline-none font-display font-700 text-sm [color-scheme:dark]"
          />

          {suggestions.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              {suggestions.map((p, i) => (
                <button key={p.name} onClick={() => submit(p.name)} onMouseEnter={() => setSelected(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-[var(--border)] last:border-0 ${
                    i === selected ? 'bg-[var(--accent)]' : 'bg-[var(--card)] hover:bg-[var(--card-hover)]'
                  }`}>
                  <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 p-0.5"
                    style={{ backgroundColor: TEAM_COLORS[p.teamId] ?? '#1e335a' }}>
                    <Image src={TEAM_LOGOS[p.teamId]} alt="" width={16} height={16} className="object-contain w-full h-full" />
                  </div>
                  <span className="font-display font-800 text-sm text-white uppercase">{p.name}</span>
                </button>
              ))}
            </div>
          )}

          <button onClick={() => submit(query)} disabled={!query.trim()}
            className="w-full bg-[var(--accent)] disabled:opacity-40 py-3 rounded-lg font-display font-800 text-sm uppercase tracking-wider text-white hover:bg-[var(--accent)]/80 transition-colors">
            Submit →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Game cell ──────────────────────────────────────────────────────────────
type CellState = 'empty' | 'correct' | 'wrong'
type CellData  = { state: CellState; guess: string; teamId?: string }

function GameCell({ cell, canClick, flash, onClick }: {
  cell: CellData; canClick: boolean
  flash: { ok: boolean } | null; onClick: () => void
}) {
  const bg =
    flash?.ok  ? 'border-green-500 bg-green-500/20' :
    flash && !flash.ok ? 'border-red-500 bg-red-500/20' :
    cell.state === 'correct' ? 'border-green-700/50 bg-green-900/20' :
    cell.state === 'wrong'   ? 'border-red-900/40 bg-[#0f0a0a]' :
    canClick ? 'border-[#1e2e42] bg-[#080f1a] hover:border-[var(--accent)]/50 hover:bg-[#0c1620] cursor-pointer' :
    'border-[#1a2535] bg-[#080f1a] cursor-not-allowed'

  return (
    <div
      onClick={canClick ? onClick : undefined}
      className={`rounded-xl border flex flex-col items-center justify-center p-3 transition-all select-none ${bg} ${flash ? 'scale-95' : ''}`}
      style={{ minHeight: 110 }}
    >
      {cell.state === 'correct' && cell.teamId && (
        <>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-2 p-1.5 shrink-0"
            style={{ backgroundColor: TEAM_COLORS[cell.teamId] ?? '#1e335a' }}>
            <Image src={TEAM_LOGOS[cell.teamId]} alt={cell.teamId} width={28} height={28} className="object-contain w-full h-full" />
          </div>
          <p className="font-display font-800 text-xs uppercase text-white text-center leading-tight">{cell.guess}</p>
        </>
      )}
      {cell.state === 'wrong' && (
        <p className="font-display font-700 text-[11px] text-red-400/60 uppercase text-center line-through leading-tight px-1">{cell.guess}</p>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
const SAVE_KEY = () => `hk_grid_${fridayDateKey()}`

export default function ImmaculateGridPage() {
  const grid: GridConfig = getCurrentWeekGrid()
  const [cells, setCells] = useState<CellData[]>(() =>
    Array(9).fill(null).map(() => ({ state: 'empty' as CellState, guess: '' }))
  )
  const [guessesLeft, setGuessesLeft] = useState(9)
  const [activeCell, setActiveCell] = useState<number | null>(null)
  const [flashes, setFlashes] = useState<Record<number, { ok: boolean }>>({})

  useEffect(() => {
    const saved = localStorage.getItem(SAVE_KEY())
    if (saved) { const p = JSON.parse(saved); setCells(p.cells); setGuessesLeft(p.guessesLeft) }
  }, [])

  useEffect(() => {
    localStorage.setItem(SAVE_KEY(), JSON.stringify({ cells, guessesLeft }))
  }, [cells, guessesLeft])

  const handleGuess = useCallback((cellIdx: number, playerName: string) => {
    const row = Math.floor(cellIdx / 3)
    const col = cellIdx % 3

    let teamId = ''
    for (const [tid, roster] of Object.entries(ROSTERS)) {
      if (roster.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
        teamId = tid; break
      }
    }

    const valid = isValidAnswer(playerName, teamId, grid.rows[row], grid.cols[col])

    setFlashes(f => ({ ...f, [cellIdx]: { ok: valid } }))
    setTimeout(() => setFlashes(f => { const n = { ...f }; delete n[cellIdx]; return n }), 700)

    setCells(prev => {
      const next = [...prev]
      next[cellIdx] = { state: valid ? 'correct' : 'wrong', guess: playerName, teamId: valid ? teamId : undefined }
      return next
    })
    setGuessesLeft(g => g - 1)
    setActiveCell(null)
  }, [grid])

  const score = cells.filter(c => c.state === 'correct').length
  const done  = guessesLeft === 0 || score === 9

  // Grid layout: 4 cols × 4 rows (corner + 3 headers each direction)
  // col widths: [header, cell, cell, cell]
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">
            {getMostRecentFriday().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · Season 2026
          </p>
          <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
            <strong>Immaculate</strong><span className="text-[var(--accent)]"> Grid</span>
          </h1>
          <p className="font-display font-700 text-[var(--muted)] text-sm mt-1 uppercase tracking-wider">
            Name a Hoofdklasse 2026 player matching both criteria
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">Score</p>
            <p className="font-display font-800 text-4xl text-white">{score}<span className="text-[var(--muted)] text-xl">/9</span></p>
          </div>
          <div className="h-12 w-px bg-[var(--border)]" />
          <div className="text-center">
            <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">Guesses left</p>
            <p className={`font-display font-800 text-4xl ${guessesLeft <= 3 ? 'text-[var(--accent)]' : 'text-white'}`}>{guessesLeft}</p>
          </div>
          <div className="h-12 w-px bg-[var(--border)]" />
          <NotifyButton tooltip="Get an email when a new Immaculate Grid drops every Friday." />
        </div>
      </div>

      {done && (
        <div className="mb-6 bg-[var(--card)] border border-[var(--border)] rounded-xl px-5 py-4 text-center">
          <p className="font-display font-800 text-xl uppercase text-white">
            {score === 9 ? 'Perfect — Immaculate!' : score >= 6 ? `${score}/9 — Great game!` : score >= 3 ? `${score}/9 — Good effort!` : `${score}/9 — Better luck next week!`}
          </p>
          <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest mt-1">New grid every Friday</p>
        </div>
      )}

      {/* The 4×4 grid */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: 'auto auto auto auto' }}
      >
        {/* Row 0: corner + 3 column headers */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl flex items-center justify-center" style={{ minHeight: 110 }}>
          <Image
            src="https://res.cloudinary.com/dqld625sq/image/upload/v1778542430/logo_hk_abi5hm.png"
            alt="HK" width={56} height={56} className="object-contain opacity-60"
          />
        </div>
        {grid.cols.map((crit, i) => (
          <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl" style={{ minHeight: 110 }}>
            <HeaderCell crit={crit} axis="col" />
          </div>
        ))}

        {/* Rows 1-3: row header + 3 game cells */}
        {grid.rows.map((rowCrit, row) => (
          <>
            <div key={`h${row}`} className="bg-[var(--card)] border border-[var(--border)] rounded-xl" style={{ minHeight: 110 }}>
              <HeaderCell crit={rowCrit} axis="row" />
            </div>
            {grid.cols.map((_, col) => {
              const idx = row * 3 + col
              return (
                <GameCell
                  key={idx}
                  cell={cells[idx]}
                  canClick={cells[idx].state === 'empty' && guessesLeft > 0 && !done}
                  flash={flashes[idx] ?? null}
                  onClick={() => setActiveCell(idx)}
                />
              )
            })}
          </>
        ))}
      </div>

      {/* Rules */}
      <div className="mt-6 bg-[var(--card)] border border-[var(--border)] rounded-xl px-5 py-4">
        <p className="font-display font-800 text-xs uppercase text-white mb-2">Rules</p>
        <ul className="space-y-1">
          {[
            'Name any Hoofdklasse 2026 player matching the row AND column criteria',
            'Each cell uses 1 guess — whether correct or not — you have 9 total',
            'New grid every week',
          ].map((t, i) => (
            <li key={i} className="font-display font-700 text-xs text-[var(--muted)] flex gap-2">
              <span className="text-[var(--accent)]">·</span>{t}
            </li>
          ))}
        </ul>
      </div>

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
