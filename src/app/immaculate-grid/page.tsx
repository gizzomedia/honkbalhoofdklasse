'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import {
  getCurrentFridayNum, getGridForFridayNum, getFridayDate,
  fridayDateKey, isValidAnswer, type Criterion, type GridConfig,
} from '@/lib/grid-data'
import NotifyButton from '@/components/NotifyButton'
import { ROSTERS } from '@/lib/rosters-data'
import { TEAM_COLORS, TEAM_LOGOS } from '@/lib/teams'

const ALL_PLAYERS = Object.entries(ROSTERS).flatMap(([teamId, r]) =>
  r.players.map(p => ({ name: p.name, teamId }))
).sort((a, b) => a.name.localeCompare(b.name))

const CURRENT_FRIDAY_NUM = getCurrentFridayNum()

// ── localStorage helpers ───────────────────────────────────────────────────
type SavedState = { cells: CellData[]; guessesLeft: number }

function saveKey(weekNum: number) { return `hk_grid_w${weekNum}` }

function loadWeek(weekNum: number): SavedState {
  try {
    const raw = localStorage.getItem(saveKey(weekNum))
    if (raw) return JSON.parse(raw) as SavedState
  } catch { /* ignore */ }
  return { cells: Array(9).fill(null).map(() => ({ state: 'empty' as CellState, guess: '' })), guessesLeft: 9 }
}

function saveWeekState(weekNum: number, cells: CellData[], guessesLeft: number) {
  try { localStorage.setItem(saveKey(weekNum), JSON.stringify({ cells, guessesLeft })) } catch { /* ignore */ }
}

function migrateOldSave() {
  // Move date-based save (old format) to week-based save for current week
  try {
    const newKey = saveKey(CURRENT_FRIDAY_NUM)
    if (!localStorage.getItem(newKey)) {
      const old = localStorage.getItem(`hk_grid_${fridayDateKey()}`)
      if (old) localStorage.setItem(newKey, old)
    }
  } catch { /* ignore */ }
}

// ── Header cell ────────────────────────────────────────────────────────────
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
            aria-label="Search for a player name"
            className="w-full bg-[#0d1b2e] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg px-4 py-3 text-white placeholder:text-white/30 outline-none font-display font-700 text-sm [color-scheme:dark]"
          />

          {suggestions.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              {suggestions.map((p, i) => (
                <button key={p.name} onClick={() => submit(p.name)} onMouseEnter={() => setSelected(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-[var(--border)] last:border-0 ${
                    i === selected ? 'bg-[var(--accent)]' : 'bg-[var(--card)] hover:bg-[var(--card-hover)]'
                  }`}>
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

// ── Archive modal ──────────────────────────────────────────────────────────
function ArchiveModal({ currentWeek, selectedWeek, onSelect, onClose }: {
  currentWeek: number; selectedWeek: number
  onSelect: (week: number) => void; onClose: () => void
}) {
  // Build list of all past weeks (newest first, excluding current)
  const weeks = Array.from({ length: currentWeek }, (_, i) => currentWeek - 1 - i)

  function getScore(week: number): number | null {
    try {
      const raw = localStorage.getItem(saveKey(week))
      if (!raw) return null
      const s = JSON.parse(raw) as SavedState
      return s.cells.filter(c => c.state === 'correct').length
    } catch { return null }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xs bg-[#0a1220] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <p className="font-display font-800 text-sm uppercase text-white tracking-widest">Grid Archive</p>
          <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-2">
          {weeks.length === 0 && (
            <p className="px-4 py-8 text-center font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest">
              No previous grids yet
            </p>
          )}
          {weeks.map(week => {
            const score = getScore(week)
            const date  = getFridayDate(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            const isActive = week === selectedWeek

            return (
              <button
                key={week}
                onClick={() => { onSelect(week); onClose() }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${isActive ? 'bg-[var(--accent)]/20 border border-[var(--accent)]/30' : 'hover:bg-[var(--card-hover)]'}`}
              >
                <div className="text-left">
                  <p className="font-display font-800 text-sm uppercase text-white">Grid #{week + 1}</p>
                  <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">{date}</p>
                </div>
                {score !== null ? (
                  <span className="font-display font-800 text-sm" style={{
                    color: score === 9 ? '#22c55e' : score >= 6 ? '#f59e0b' : 'rgba(255,255,255,0.45)',
                  }}>
                    {score}/9
                  </span>
                ) : (
                  <span className="font-display font-700 text-[10px] text-[var(--accent)] uppercase tracking-widest">Play →</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Game cell ──────────────────────────────────────────────────────────────
type CellState = 'empty' | 'correct' | 'wrong'
type CellData  = { state: CellState; guess: string; teamId?: string; photoUrl?: string | null; focalX?: number | null; focalY?: number | null }

function GameCell({ cell, canClick, flash, onClick }: {
  cell: CellData; canClick: boolean
  flash: { ok: boolean } | null; onClick: () => void
}) {
  const bg =
    flash?.ok  ? 'border-green-500 bg-green-500/20' :
    flash && !flash.ok ? 'border-red-500 bg-red-500/20' :
    cell.state === 'correct' ? 'border-green-700/50 bg-green-900/20' :
    cell.state === 'wrong'   ? 'border-red-900/40 bg-[#0f0a0a] cursor-pointer hover:border-red-600/60' :
    canClick ? 'border-[#1e2e42] bg-[#080f1a] hover:border-[var(--accent)]/50 hover:bg-[#0c1620] cursor-pointer' :
    'border-[#1a2535] bg-[#080f1a] cursor-not-allowed'

  return (
    <div
      onClick={canClick ? onClick : undefined}
      className={`rounded-xl border flex flex-col items-center justify-center transition-all select-none relative overflow-hidden ${bg} ${flash ? 'scale-95' : ''}`}
      style={{ minHeight: 110 }}
    >
      {cell.state === 'correct' && cell.photoUrl && (
        <Image
          src={cell.photoUrl} alt={cell.guess} fill
          className="object-cover opacity-40"
          style={{ objectPosition: `${cell.focalX ?? 50}% ${cell.focalY ?? 50}%` }}
          sizes="200px"
        />
      )}

      <div className="relative z-10 flex flex-col items-center justify-center p-3 w-full h-full">
        {cell.state === 'correct' && cell.teamId && (
          <>
            {!cell.photoUrl && (
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-2 p-1.5 shrink-0"
                style={{ backgroundColor: TEAM_COLORS[cell.teamId] ?? '#1e335a' }}>
                <Image src={TEAM_LOGOS[cell.teamId]} alt={cell.teamId} width={28} height={28} className="object-contain w-full h-full" />
              </div>
            )}
            <p className="font-display font-800 text-xs uppercase text-white text-center leading-tight drop-shadow">{cell.guess}</p>
            {cell.photoUrl && cell.teamId && (
              <div className="mt-1.5 w-6 h-6 rounded flex items-center justify-center p-0.5 shrink-0"
                style={{ backgroundColor: TEAM_COLORS[cell.teamId] ?? '#1e335a' }}>
                <Image src={TEAM_LOGOS[cell.teamId]} alt="" width={16} height={16} className="object-contain w-full h-full" />
              </div>
            )}
          </>
        )}
        {cell.state === 'wrong' && (
          <>
            <p className="font-display font-700 text-[11px] text-red-400/60 uppercase text-center line-through leading-tight px-1">{cell.guess}</p>
            <p className="font-display font-700 text-[9px] text-red-400/40 uppercase tracking-widest mt-1">tap to retry</p>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ImmaculateGridPage() {
  const [selectedWeek, setSelectedWeek] = useState(CURRENT_FRIDAY_NUM)
  const [cells, setCells] = useState<CellData[]>(() => {
    migrateOldSave()
    return loadWeek(CURRENT_FRIDAY_NUM).cells
  })
  const [guessesLeft, setGuessesLeft] = useState(() => loadWeek(CURRENT_FRIDAY_NUM).guessesLeft)
  const [activeCell, setActiveCell]   = useState<number | null>(null)
  const [flashes, setFlashes]         = useState<Record<number, { ok: boolean }>>({})
  const [showArchive, setShowArchive] = useState(false)

  // Prevent the save effect from firing right after a week switch
  const skipNextSaveRef = useRef(false)

  const grid: GridConfig = getGridForFridayNum(selectedWeek)

  // When selectedWeek changes, load that week's state
  function handleWeekChange(week: number) {
    skipNextSaveRef.current = true
    setSelectedWeek(week)
    const saved = loadWeek(week)
    setCells(saved.cells)
    setGuessesLeft(saved.guessesLeft)
    setActiveCell(null)
    setFlashes({})
  }

  // Save whenever cells or guessesLeft change (but skip right after a week switch)
  useEffect(() => {
    if (skipNextSaveRef.current) { skipNextSaveRef.current = false; return }
    saveWeekState(selectedWeek, cells, guessesLeft)
  }, [cells, guessesLeft]) // eslint-disable-line react-hooks/exhaustive-deps

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

    if (valid) {
      fetch(`/api/player-stats?name=${encodeURIComponent(playerName)}`)
        .then(r => r.json())
        .then(data => {
          const photoUrl = (data.photos?.banner_url ?? null) as string | null
          const focalX   = (data.photos?.banner_focal_x ?? 50) as number
          const focalY   = (data.photos?.banner_focal_y ?? 50) as number
          setCells(prev => {
            const next = [...prev]
            if (next[cellIdx]?.state === 'correct') {
              next[cellIdx] = { ...next[cellIdx], photoUrl, focalX, focalY }
            }
            return next
          })
        })
        .catch(() => {})
    }
  }, [grid])

  const score = cells.filter(c => c.state === 'correct').length
  const done  = guessesLeft === 0 || score === 9
  const isArchive = selectedWeek < CURRENT_FRIDAY_NUM
  const gridDate  = getFridayDate(selectedWeek)

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">

      {/* Header */}
      <div className="flex items-end justify-between mb-4 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm">
              {gridDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · Season 2026
            </p>
            <span className="text-white/20 text-sm">·</span>
            <button
              onClick={() => setShowArchive(true)}
              className="font-display font-700 text-xs text-white/50 hover:text-white uppercase tracking-widest transition-colors"
            >
              Previous Grids ▾
            </button>
            {isArchive && (
              <>
                <span className="text-white/20 text-sm">·</span>
                <button
                  onClick={() => handleWeekChange(CURRENT_FRIDAY_NUM)}
                  className="font-display font-700 text-xs text-[var(--accent)] hover:text-white uppercase tracking-widest transition-colors"
                >
                  ← Current Grid
                </button>
              </>
            )}
          </div>
          <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
            {isArchive
              ? <><strong>Grid</strong><span className="text-[var(--accent)]"> #{selectedWeek + 1}</span></>
              : <><strong>Immaculate</strong><span className="text-[var(--accent)]"> Grid</span></>
            }
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
            {score === 9 ? 'Perfect — Immaculate!' : score >= 6 ? `${score}/9 — Great game!` : score >= 3 ? `${score}/9 — Good effort!` : `${score}/9 — Better luck next time!`}
          </p>
          <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest mt-1">
            {isArchive ? 'Select another grid from the archive →' : 'New grid every Friday'}
          </p>
        </div>
      )}

      {/* The 4×4 grid */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: 'auto auto auto auto' }}
      >
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl flex items-center justify-center" style={{ minHeight: 110 }}>
          <Image
            src="https://res.cloudinary.com/dn8c5398m/image/upload/q_auto/f_auto/v1781607525/hk_logo_iets_groter_tumykq.png"
            alt="HK" width={56} height={56} className="object-contain opacity-60"
          />
        </div>
        {grid.cols.map((crit, i) => (
          <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-xl" style={{ minHeight: 110 }}>
            <HeaderCell crit={crit} axis="col" />
          </div>
        ))}

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
                  canClick={cells[idx].state !== 'correct' && guessesLeft > 0 && !done}
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
            'New grid every Friday · play old grids anytime via Previous Grids',
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

      {showArchive && (
        <ArchiveModal
          currentWeek={CURRENT_FRIDAY_NUM}
          selectedWeek={selectedWeek}
          onSelect={handleWeekChange}
          onClose={() => setShowArchive(false)}
        />
      )}
    </div>
  )
}
