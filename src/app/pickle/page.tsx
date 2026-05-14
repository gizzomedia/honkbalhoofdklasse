'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { ROSTERS, type Player } from '@/lib/rosters-data'

// ── Constants ─────────────────────────────────────────────────────────────────

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
  neptunus: 'Neptunus', pirates: 'Pirates', kinheim: 'Kinheim',
  hcaw: 'HCAW', twins: 'Twins', pioniers: 'Pioniers', uvv: 'UVV',
}
const POS_LABEL: Record<string, string> = {
  P: 'Pitcher', C: 'Catcher', IF: 'Infielder', OF: 'Outfielder',
  'C/IF': 'C/IF', UTL: 'Utility', DH: 'DH',
}

const MAX_GUESSES = 8
const YOB_CLOSE = 2 // within 2 years = yellow

// ── All players pool ──────────────────────────────────────────────────────────

type PoolPlayer = Player & { teamId: string }

const ALL_PLAYERS: PoolPlayer[] = Object.entries(ROSTERS)
  .flatMap(([teamId, r]) => r.players.map(p => ({ ...p, teamId })))
  .sort((a, b) => a.name.localeCompare(b.name))

// ── Daily seed ────────────────────────────────────────────────────────────────

function getDailyPlayer(): PoolPlayer {
  const now = new Date()
  const day = Math.floor((now.getTime() - new Date('2026-01-01').getTime()) / 86400000)
  // Deterministic shuffle via LCG
  let seed = day * 1664525 + 1013904223
  const shuffled = [...ALL_PLAYERS]
  for (let i = shuffled.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(seed) % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled[0]
}

function todayKey() {
  const d = new Date()
  return `pickle_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`
}

// ── Feedback types ────────────────────────────────────────────────────────────

type Hit = 'correct' | 'close' | 'wrong'
type Dir = 'up' | 'down' | null

type GuessFeedback = {
  player: PoolPlayer
  team:    Hit
  pos:     Hit
  bats:    Hit
  throws:  Hit
  yob:     Hit
  yobDir:  Dir
}

function evaluate(guess: PoolPlayer, target: PoolPlayer): GuessFeedback {
  const yobDiff = target.yob - guess.yob
  const yobHit: Hit = guess.yob === target.yob ? 'correct' : Math.abs(yobDiff) <= YOB_CLOSE ? 'close' : 'wrong'
  const yobDir: Dir = guess.yob === target.yob ? null : yobDiff > 0 ? 'up' : 'down'

  const gBats = guess.bt.split('/')[0]
  const tBats = target.bt.split('/')[0]
  const gThrows = guess.bt.split('/')[1]
  const tThrows = target.bt.split('/')[1]

  return {
    player: guess,
    team:   guess.teamId === target.teamId ? 'correct' : 'wrong',
    pos:    guess.pos === target.pos ? 'correct' : 'wrong',
    bats:   gBats === tBats ? 'correct' : 'wrong',
    throws: gThrows === tThrows ? 'correct' : 'wrong',
    yob:    yobHit,
    yobDir,
  }
}

// ── Cell component ────────────────────────────────────────────────────────────

function Cell({ hit, children, arrow }: { hit: Hit; children: React.ReactNode; arrow?: Dir }) {
  const bg =
    hit === 'correct' ? 'bg-green-700/80 border-green-600'  :
    hit === 'close'   ? 'bg-yellow-700/70 border-yellow-600' :
    'bg-[#0d1b2e] border-[var(--border)]'

  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border px-2 py-2.5 gap-1 ${bg} transition-colors`}
      style={{ minHeight: 64 }}>
      {children}
      {arrow && (
        <span className={`text-sm font-bold leading-none ${arrow === 'up' ? 'text-blue-300' : 'text-orange-300'}`}>
          {arrow === 'up' ? '↑' : '↓'}
        </span>
      )}
    </div>
  )
}

// ── Guess row ─────────────────────────────────────────────────────────────────

function GuessRow({ fb, target }: { fb: GuessFeedback; target: PoolPlayer }) {
  const isCorrect = fb.player.name.toLowerCase() === target.name.toLowerCase()
  return (
    <div className={`grid gap-1.5 ${isCorrect ? 'ring-2 ring-green-500/50 rounded-xl' : ''}`}
      style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1fr' }}>
      {/* Player name — green when correct */}
      <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border ${
        isCorrect
          ? 'bg-green-700/80 border-green-600'
          : 'bg-[#0d1b2e] border-[var(--border)]'
      }`}>
        <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 p-0.5"
          style={{ backgroundColor: TEAM_COLORS[fb.player.teamId] }}>
          <Image src={TEAM_LOGOS[fb.player.teamId]} alt="" width={18} height={18} className="object-contain w-full h-full" />
        </div>
        <span className="font-display font-800 text-xs uppercase text-white truncate leading-tight">{fb.player.name}</span>
        {isCorrect && <span className="ml-auto text-green-300 text-sm shrink-0">✓</span>}
      </div>

      {/* Team */}
      <Cell hit={fb.team}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center p-1"
          style={{ backgroundColor: TEAM_COLORS[fb.player.teamId] }}>
          <Image src={TEAM_LOGOS[fb.player.teamId]} alt="" width={22} height={22} className="object-contain w-full h-full" />
        </div>
        <span className="font-display font-700 text-[10px] uppercase text-white/80">{TEAM_NAMES[fb.player.teamId]}</span>
      </Cell>

      {/* Position */}
      <Cell hit={fb.pos}>
        <span className="font-display font-800 text-sm uppercase text-white">{fb.player.pos}</span>
        <span className="font-display font-700 text-[9px] uppercase text-white/60 text-center leading-none">{POS_LABEL[fb.player.pos] ?? fb.player.pos}</span>
      </Cell>

      {/* Bats */}
      <Cell hit={fb.bats}>
        <span className="font-display font-700 text-[9px] uppercase text-white/60">Bats</span>
        <span className="font-display font-800 text-base uppercase text-white">{fb.player.bt.split('/')[0]}</span>
      </Cell>

      {/* Throws */}
      <Cell hit={fb.throws}>
        <span className="font-display font-700 text-[9px] uppercase text-white/60">Throws</span>
        <span className="font-display font-800 text-base uppercase text-white">{fb.player.bt.split('/')[1]}</span>
      </Cell>

      {/* YOB */}
      <Cell hit={fb.yob} arrow={fb.yobDir ?? undefined}>
        <span className="font-display font-700 text-[9px] uppercase text-white/60">Born</span>
        <span className="font-display font-800 text-sm uppercase text-white">{fb.player.yob}</span>
      </Cell>
    </div>
  )
}

// ── Empty row placeholder ─────────────────────────────────────────────────────

function EmptyRow({ dim }: { dim?: boolean }) {
  return (
    <div className={`grid gap-1.5 ${dim ? 'opacity-30' : 'opacity-60'}`}
      style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1fr' }}>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-[#080f1a] border border-[var(--border)] rounded-xl" style={{ minHeight: 64 }} />
      ))}
    </div>
  )
}

// ── Column headers ────────────────────────────────────────────────────────────

function ColumnHeaders() {
  return (
    <div className="grid gap-1.5 mb-1" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1fr' }}>
      {['Player', 'Team', 'Position', 'Bats', 'Throws', 'Born'].map(h => (
        <p key={h} className="font-display font-700 text-[10px] uppercase tracking-widest text-[var(--muted)] text-center">{h}</p>
      ))}
    </div>
  )
}

// ── Share result ──────────────────────────────────────────────────────────────

function buildShareText(guesses: GuessFeedback[], won: boolean, targetName: string): string {
  const emojiRow = (fb: GuessFeedback) => [
    fb.team   === 'correct' ? '🟩' : '🟥',
    fb.pos    === 'correct' ? '🟩' : '🟥',
    fb.bats   === 'correct' ? '🟩' : '🟥',
    fb.throws === 'correct' ? '🟩' : '🟥',
    fb.yob    === 'correct' ? '🟩' : fb.yob === 'close' ? '🟨' : '🟥',
  ].join('')

  const lines = [
    `Honkbal Pickle — ${new Date().toLocaleDateString('nl-NL')}`,
    won ? `✅ ${guesses.length}/${MAX_GUESSES}` : `❌ ${MAX_GUESSES}/${MAX_GUESSES}`,
    '',
    ...guesses.map(emojiRow),
    '',
    'honkbalhoofdklasse.com/pickle',
  ]
  return lines.join('\n')
}

// ── Main page ─────────────────────────────────────────────────────────────────

type SavedState = { guesses: GuessFeedback[]; won: boolean; lost: boolean }

export default function PicklePage() {
  const target = getDailyPlayer()
  const [guesses, setGuesses]   = useState<GuessFeedback[]>([])
  const [won,  setWon]          = useState(false)
  const [lost, setLost]         = useState(false)
  const [query, setQuery]       = useState('')
  const [suggestions, setSugg]  = useState<PoolPlayer[]>([])
  const [selected, setSelected] = useState(-1)
  const [shared, setShared]     = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load saved
  useEffect(() => {
    const raw = localStorage.getItem(todayKey())
    if (raw) {
      const s: SavedState = JSON.parse(raw)
      setGuesses(s.guesses)
      setWon(s.won)
      setLost(s.lost)
    }
  }, [])

  // Save on change
  useEffect(() => {
    if (guesses.length > 0) {
      localStorage.setItem(todayKey(), JSON.stringify({ guesses, won, lost }))
    }
  }, [guesses, won, lost])

  // Autocomplete
  useEffect(() => {
    if (query.length < 2) { setSugg([]); return }
    const q = query.toLowerCase()
    const already = new Set(guesses.map(g => g.player.name))
    setSugg(ALL_PLAYERS.filter(p => p.name.toLowerCase().includes(q) && !already.has(p.name)).slice(0, 8))
    setSelected(-1)
  }, [query, guesses])

  const submitGuess = useCallback((player: PoolPlayer) => {
    if (won || lost) return
    const fb = evaluate(player, target)
    const newGuesses = [...guesses, fb]
    const didWin  = player.name.toLowerCase() === target.name.toLowerCase()
    const didLose = !didWin && newGuesses.length >= MAX_GUESSES
    setGuesses(newGuesses)
    setWon(didWin)
    setLost(didLose)
    setQuery('')
    setSugg([])
  }, [guesses, won, lost, target])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, -1)) }
    if (e.key === 'Enter') {
      if (selected >= 0 && suggestions[selected]) submitGuess(suggestions[selected])
      else {
        const exact = ALL_PLAYERS.find(p => p.name.toLowerCase() === query.toLowerCase())
        if (exact) submitGuess(exact)
      }
    }
  }

  const share = () => {
    navigator.clipboard.writeText(buildShareText(guesses, won, target.name))
    setShared(true)
    setTimeout(() => setShared(false), 2000)
  }

  const remaining = MAX_GUESSES - guesses.length

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">
          Daily · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
          <strong>Hoofdklasse</strong>
          <span className="text-[var(--accent)]"> Pickle</span>
        </h1>
        <p className="font-display font-700 text-[var(--muted)] text-sm mt-1 uppercase tracking-wider">
          Guess the mystery Hoofdklasse 2026 player
        </p>
      </div>

      {/* Win / Lose banner */}
      {(won || lost) && (
        <div className={`mb-6 rounded-2xl border overflow-hidden ${
          won ? 'border-green-600/60' : 'border-red-800/40'
        }`}>
          {/* Top accent bar */}
          <div className={`h-1.5 ${won ? 'bg-green-500' : 'bg-red-600'}`} />
          <div className={`px-6 py-5 flex items-center justify-between gap-4 flex-wrap ${
            won ? 'bg-green-900/25' : 'bg-red-900/15'
          }`}>
            <div>
              <p className={`font-display font-800 text-3xl uppercase ${won ? 'text-green-400' : 'text-red-400'}`}>
                {won ? `You got it!` : 'Game Over'}
              </p>
              <p className="font-display font-800 text-lg uppercase text-white mt-0.5">
                {won ? `${guesses.length} out of ${MAX_GUESSES} guesses` : `The answer was ${target.name}`}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-6 h-6 rounded flex items-center justify-center p-0.5"
                  style={{ backgroundColor: TEAM_COLORS[target.teamId] }}>
                  <Image src={TEAM_LOGOS[target.teamId]} alt="" width={18} height={18} className="object-contain w-full h-full" />
                </div>
                <p className="font-display font-700 text-sm text-white/70 uppercase">
                  {TEAM_NAMES[target.teamId]} · {POS_LABEL[target.pos] ?? target.pos} · Born {target.yob}
                </p>
              </div>
            </div>
            <button onClick={share}
              className="shrink-0 bg-[var(--accent)] px-6 py-3 rounded-xl font-display font-800 text-sm uppercase tracking-wider text-white hover:bg-[var(--accent)]/80 transition-colors">
              {shared ? '✓ Copied!' : 'Share result'}
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      {!won && !lost && (
        <div className="relative mb-6">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={onKey}
              placeholder="Type a player name…"
              className="flex-1 bg-[#0d1b2e] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-4 py-3.5 text-white placeholder:text-white/30 outline-none font-display font-700 text-sm [color-scheme:dark]"
            />
            <div className="shrink-0 bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 flex items-center gap-1">
              <span className={`font-display font-800 text-xl ${remaining <= 3 ? 'text-[var(--accent)]' : 'text-white'}`}>{remaining}</span>
              <span className="font-display font-700 text-xs text-[var(--muted)] uppercase">left</span>
            </div>
          </div>

          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-[#0a1220] border border-[var(--border)] rounded-xl overflow-hidden shadow-xl">
              {suggestions.map((p, i) => (
                <button key={p.name} onClick={() => submitGuess(p)} onMouseEnter={() => setSelected(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-[var(--border)] last:border-0 ${
                    i === selected ? 'bg-[var(--accent)]' : 'hover:bg-[var(--card-hover)]'
                  }`}>
                  <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 p-0.5"
                    style={{ backgroundColor: TEAM_COLORS[p.teamId] }}>
                    <Image src={TEAM_LOGOS[p.teamId]} alt="" width={18} height={18} className="object-contain w-full h-full" />
                  </div>
                  <span className="font-display font-800 text-sm uppercase text-white">{p.name}</span>
                  <span className="font-display font-700 text-xs text-white/50 uppercase ml-auto">{TEAM_NAMES[p.teamId]} · {p.pos}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        {[
          { color: 'bg-green-700/80 border-green-600', label: 'Correct' },
          { color: 'bg-yellow-700/70 border-yellow-600', label: `Close (Born ±${YOB_CLOSE})` },
          { color: 'bg-[#0d1b2e] border-[var(--border)]', label: 'Wrong' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-4 h-4 rounded border ${l.color}`} />
            <span className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-wider">{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="text-blue-300 text-sm font-bold">↑</span>
          <span className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-wider">Born later</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-orange-300 text-sm font-bold">↓</span>
          <span className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-wider">Born earlier</span>
        </div>
      </div>

      {/* Guess grid */}
      <div className="overflow-x-auto -mx-4 px-4">
      <div style={{ minWidth: 520 }}>
      <ColumnHeaders />
      <div className="space-y-1.5">
        {guesses.map((fb, i) => <GuessRow key={i} fb={fb} target={target} />)}
        {Array.from({ length: Math.max(0, MAX_GUESSES - guesses.length) }, (_, i) => (
          <EmptyRow key={i} dim={i > 0} />
        ))}
      </div>
      </div>
      </div>
    </div>
  )
}
