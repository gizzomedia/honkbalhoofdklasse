'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { ROSTERS, type Player } from '@/lib/rosters-data'
import NotifyButton from '@/components/NotifyButton'
import { TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES } from '@/lib/teams'

const POS_LABEL: Record<string, string> = {
  P: 'Pitcher', C: 'Catcher', IF: 'Infielder', OF: 'Outfielder',
  'C/IF': 'C/IF', UTL: 'Utility', DH: 'DH',
}

const MAX_GUESSES = 8
const YOB_CLOSE   = 2

type PoolPlayer = Player & { teamId: string }

const ALL_PLAYERS: PoolPlayer[] = Object.entries(ROSTERS)
  .flatMap(([teamId, r]) => r.players.map(p => ({ ...p, teamId })))
  .sort((a, b) => a.name.localeCompare(b.name))

// ── Day numbering ─────────────────────────────────────────────────────────────

// Game days: Thursday (4) and Saturday (6), alternating each week.
// Day 0 = Thursday April 2, 2026 (day 1 = Sat Apr 4, day 2 = Thu Apr 9, …)
const START_PICKLE_THU = new Date('2026-04-02')

function getGameDayDate(): Date {
  const now = new Date()
  const dow = now.getDay() // 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
  const daysBack = [1, 2, 3, 4, 0, 1, 0][dow]
  const d = new Date(now)
  d.setDate(d.getDate() - daysBack)
  return d
}

function getDayDate(n: number): Date {
  const weekIdx = Math.floor(n / 2)
  const dayInWeek = n % 2 // 0=Thu, 1=Sat
  const d = new Date(START_PICKLE_THU)
  d.setDate(d.getDate() + weekIdx * 7 + (dayInWeek === 1 ? 2 : 0))
  return d
}

function dateToDayNum(date: Date): number {
  const daysSinceStart = Math.floor((date.getTime() - START_PICKLE_THU.getTime()) / 86400000)
  if (daysSinceStart < 0) return 0
  const weekIdx = Math.floor(daysSinceStart / 7)
  const dayInWeek = date.getDay() === 6 ? 1 : 0
  return weekIdx * 2 + dayInWeek
}

function getCurrentDayNum(): number {
  return Math.max(0, dateToDayNum(getGameDayDate()))
}

function getPlayerForDayNum(n: number): PoolPlayer {
  const date = getDayDate(n)
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  // Simple seeded hash from date string
  let seed = 0
  for (let i = 0; i < dateStr.length; i++) {
    seed = ((seed << 5) - seed) + dateStr.charCodeAt(i)
    seed = seed & seed // Convert to 32-bit integer
  }

  const arr = [...ALL_PLAYERS]
  // Fisher-Yates shuffle with seeded RNG
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(seed) % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr[0]
}

// ── Feedback types ────────────────────────────────────────────────────────────

type Hit = 'correct' | 'close' | 'wrong'
type Dir = 'up' | 'down' | null

type GuessFeedback = {
  player: PoolPlayer
  team: Hit; pos: Hit; bats: Hit; throws: Hit; yob: Hit; yobDir: Dir
}

// ── Save / load ───────────────────────────────────────────────────────────────

type SavedState = { guesses: GuessFeedback[]; won: boolean; lost: boolean }

function dayKey(n: number) { return `pickle_d${n}` }

function loadDay(n: number): SavedState {
  try {
    const raw = localStorage.getItem(dayKey(n))
    if (raw) return JSON.parse(raw)
  } catch { /* corrupted */ }
  return { guesses: [], won: false, lost: false }
}

function saveDayState(n: number, state: SavedState) {
  try { localStorage.setItem(dayKey(n), JSON.stringify(state)) } catch { /* quota */ }
}

function migrateOldSave(currentDayNum: number) {
  const gameDayDate = getGameDayDate()
  const oldKey = `pickle_${gameDayDate.getFullYear()}_${gameDayDate.getMonth()}_${gameDayDate.getDate()}`
  const newKey = dayKey(currentDayNum)
  if (localStorage.getItem(newKey)) return
  const old = localStorage.getItem(oldKey)
  if (old) { localStorage.setItem(newKey, old); localStorage.removeItem(oldKey) }
}

// ── Evaluate ──────────────────────────────────────────────────────────────────

function evaluate(guess: PoolPlayer, target: PoolPlayer): GuessFeedback {
  const yobDiff = target.yob - guess.yob
  return {
    player: guess,
    team:   guess.teamId === target.teamId ? 'correct' : 'wrong',
    pos:    guess.pos    === target.pos    ? 'correct' : 'wrong',
    bats:   guess.bt[0]  === target.bt[0]  ? 'correct' : 'wrong',
    throws: guess.bt.at(-1) === target.bt.at(-1) ? 'correct' : 'wrong',
    yob:    guess.yob === target.yob ? 'correct' : Math.abs(yobDiff) <= YOB_CLOSE ? 'close' : 'wrong',
    yobDir: guess.yob === target.yob ? null : yobDiff > 0 ? 'up' : 'down',
  }
}

// ── Flip cell ─────────────────────────────────────────────────────────────────

function FlipCell({ hit, delay, children, arrow }: {
  hit: Hit; delay: number; children: React.ReactNode; arrow?: Dir
}) {
  const [flipped, setFlipped] = useState(false)
  const [showColor, setShowColor] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFlipped(true),  delay * 250)
    const t2 = setTimeout(() => { setShowColor(true); setFlipped(false) }, delay * 250 + 300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [delay])

  const bg =
    !showColor       ? 'bg-[#0d1b2e] border-[var(--border)]' :
    hit === 'correct'? 'bg-green-700 border-green-600' :
    hit === 'close'  ? 'bg-yellow-700 border-yellow-600' :
    'bg-[#1a0808] border-red-900/60'

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border px-1 py-2 gap-0.5 transition-colors ${bg} ${flipped ? 'cell-flip' : ''}`}
      style={{ minHeight: 60 }}
    >
      {children}
      {showColor && arrow && (
        <span className={`text-sm font-bold leading-none ${arrow === 'up' ? 'text-blue-200' : 'text-orange-200'}`}>
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
    <div className="space-y-1">
      <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
        isCorrect ? 'bg-green-700 border-green-600' : 'bg-[#0d1b2e] border-[var(--border)]'
      }`}>
        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 p-0.5"
          style={{ backgroundColor: TEAM_COLORS[fb.player.teamId] }}>
          <Image src={TEAM_LOGOS[fb.player.teamId]} alt="" width={14} height={14} className="object-contain w-full h-full" />
        </div>
        <span className="font-display font-800 text-sm uppercase text-white flex-1 leading-tight">{fb.player.name}</span>
        {isCorrect && <span className="text-green-300 font-bold shrink-0">✓</span>}
      </div>

      <div className="grid grid-cols-5 gap-1">
        <FlipCell hit={fb.team} delay={0}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center p-1 shrink-0"
            style={{ backgroundColor: TEAM_COLORS[fb.player.teamId] }}>
            <Image src={TEAM_LOGOS[fb.player.teamId]} alt="" width={20} height={20} className="object-contain w-full h-full" />
          </div>
          <span className="font-display font-700 text-[9px] uppercase text-white/70 text-center leading-none">{TEAM_NAMES[fb.player.teamId]}</span>
        </FlipCell>

        <FlipCell hit={fb.pos} delay={1}>
          <span className="font-display font-800 text-sm uppercase text-white">{fb.player.pos}</span>
          <span className="font-display font-700 text-[9px] uppercase text-white/60 text-center leading-none">{POS_LABEL[fb.player.pos]?.slice(0,6) ?? fb.player.pos}</span>
        </FlipCell>

        <FlipCell hit={fb.bats} delay={2}>
          <span className="font-display font-700 text-[9px] uppercase text-white/60">Bats</span>
          <span className="font-display font-800 text-base uppercase text-white">{fb.player.bt[0]}</span>
        </FlipCell>

        <FlipCell hit={fb.throws} delay={3}>
          <span className="font-display font-700 text-[9px] uppercase text-white/60">Throws</span>
          <span className="font-display font-800 text-base uppercase text-white">{fb.player.bt.at(-1)}</span>
        </FlipCell>

        <FlipCell hit={fb.yob} delay={4} arrow={fb.yobDir ?? undefined}>
          <span className="font-display font-700 text-[9px] uppercase text-white/60">YOB</span>
          <span className="font-display font-800 text-sm uppercase text-white">{fb.player.yob}</span>
        </FlipCell>
      </div>
    </div>
  )
}

// ── Empty rows ────────────────────────────────────────────────────────────────

function EmptyRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-1" style={{ opacity: i === 0 ? 0.5 : 0.2 }}>
          <div className="bg-[#080f1a] border border-[var(--border)] rounded-xl" style={{ height: 36 }} />
          <div className="grid grid-cols-5 gap-1">
            {[...Array(5)].map((_, j) => (
              <div key={j} className="bg-[#060c14] border border-[var(--border)] rounded-xl" style={{ height: 60 }} />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

// ── Share ─────────────────────────────────────────────────────────────────────

function buildShareText(guesses: GuessFeedback[], won: boolean, dateStr: string): string {
  const row = (fb: GuessFeedback) => [
    fb.team   === 'correct' ? '🟩' : '🟥',
    fb.pos    === 'correct' ? '🟩' : '🟥',
    fb.bats   === 'correct' ? '🟩' : '🟥',
    fb.throws === 'correct' ? '🟩' : '🟥',
    fb.yob    === 'correct' ? '🟩' : fb.yob === 'close' ? '🟨' : '🟥',
  ].join('')

  return [
    `Hoofdklasse Pickle — ${dateStr}`,
    won ? `✅ ${guesses.length}/${MAX_GUESSES}` : `❌ ${MAX_GUESSES}/${MAX_GUESSES}`,
    '',
    ...guesses.map(row),
    '',
    'honkbalhoofdklasse.com/pickle',
  ].join('\n')
}

// ── Archive Modal ─────────────────────────────────────────────────────────────

function ArchiveModal({ currentDayNum, activeDayNum, onSelect, onClose }: {
  currentDayNum: number
  activeDayNum: number
  onSelect: (n: number) => void
  onClose: () => void
}) {
  const entries: Array<{ n: number; save: SavedState; label: string; dow: string; num: number }> = []
  for (let n = currentDayNum; n >= 0; n--) {
    const date = getDayDate(n)
    const save = loadDay(n)
    entries.push({
      n,
      save,
      dow: date.getDay() === 4 ? 'Thursday' : 'Saturday',
      label: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      num: n + 1,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl mt-24 mx-4 w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-display font-800 text-lg uppercase tracking-wide text-white">Previous Puzzles</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="overflow-y-auto max-h-[60vh]">
          {entries.map(({ n, save, label, dow, num }) => {
            const played = save.guesses.length > 0
            const isActive = n === activeDayNum
            return (
              <button
                key={n}
                onClick={() => { onSelect(n); onClose() }}
                className={`w-full flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] last:border-0 transition-colors text-left ${isActive ? 'bg-[var(--accent)]/15' : 'hover:bg-[var(--card-hover)]'}`}
              >
                <div>
                  <p className={`font-display font-800 text-sm uppercase tracking-wide ${isActive ? 'text-[var(--accent)]' : 'text-white'}`}>
                    Pickle #{num}{n === currentDayNum ? ' (Today)' : ''}
                  </p>
                  <p className="font-display font-700 text-[11px] text-white/40 uppercase tracking-wider mt-0.5">
                    {dow}, {label}
                  </p>
                  {played && (
                    <p className={`font-display font-700 text-xs uppercase tracking-wider mt-0.5 ${save.won ? 'text-green-400' : save.lost ? 'text-red-400' : 'text-yellow-400'}`}>
                      {save.won
                        ? `Won · ${save.guesses.length}/${MAX_GUESSES}`
                        : save.lost
                          ? 'Lost'
                          : `In progress · ${save.guesses.length}/${MAX_GUESSES}`}
                    </p>
                  )}
                </div>
                <span className={`font-display font-700 text-xs uppercase tracking-widest shrink-0 ml-4 ${
                  played
                    ? (save.won ? 'text-green-400' : save.lost ? 'text-red-400' : 'text-yellow-400')
                    : 'text-[var(--accent)]'
                }`}>
                  {played ? (save.won ? '✓' : save.lost ? '✗' : '…') : 'Play →'}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PicklePage() {
  const currentDayNum = getCurrentDayNum()
  const [activeDayNum, setActiveDayNum] = useState(currentDayNum)
  const [guesses, setGuesses]   = useState<GuessFeedback[]>([])
  const [won,  setWon]          = useState(false)
  const [lost, setLost]         = useState(false)
  const [query, setQuery]       = useState('')
  const [suggestions, setSugg]  = useState<PoolPlayer[]>([])
  const [selIdx, setSelIdx]     = useState(-1)
  const [shared, setShared]     = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const skipNextSaveRef = useRef(false)

  const target = getPlayerForDayNum(activeDayNum)

  // Load save on mount + migrate old date-based key
  useEffect(() => {
    migrateOldSave(currentDayNum)
    const s = loadDay(currentDayNum)
    setGuesses(s.guesses); setWon(s.won); setLost(s.lost)
  }, [currentDayNum])

  // Persist state after any guess, skip once after a day switch
  useEffect(() => {
    if (skipNextSaveRef.current) { skipNextSaveRef.current = false; return }
    if (guesses.length > 0 || won || lost)
      saveDayState(activeDayNum, { guesses, won, lost })
  }, [guesses, won, lost, activeDayNum])

  const handleDayChange = useCallback((n: number) => {
    skipNextSaveRef.current = true
    const s = loadDay(n)
    setActiveDayNum(n)
    setGuesses(s.guesses)
    setWon(s.won)
    setLost(s.lost)
    setQuery('')
    setSugg([])
    setSelIdx(-1)
  }, [])

  useEffect(() => {
    if (query.length < 2) { setSugg([]); return }
    const q = query.toLowerCase()
    const already = new Set(guesses.map(g => g.player.name))
    setSugg(ALL_PLAYERS.filter(p => p.name.toLowerCase().includes(q) && !already.has(p.name)).slice(0, 7))
    setSelIdx(-1)
  }, [query, guesses])

  const submitGuess = useCallback((player: PoolPlayer) => {
    if (won || lost) return
    const fb = evaluate(player, target)
    const next = [...guesses, fb]
    const didWin  = player.name.toLowerCase() === target.name.toLowerCase()
    const didLose = !didWin && next.length >= MAX_GUESSES
    setGuesses(next); setWon(didWin); setLost(didLose)
    setQuery(''); setSugg([])
  }, [guesses, won, lost, target])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelIdx(s => Math.min(s + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelIdx(s => Math.max(s - 1, -1)) }
    if (e.key === 'Enter') {
      const pick = selIdx >= 0 ? suggestions[selIdx] : ALL_PLAYERS.find(p => p.name.toLowerCase() === query.toLowerCase())
      if (pick) submitGuess(pick)
    }
  }

  const share = () => {
    const dateStr = getDayDate(activeDayNum).toLocaleDateString('nl-NL')
    navigator.clipboard.writeText(buildShareText(guesses, won, dateStr))
    setShared(true); setTimeout(() => setShared(false), 2000)
  }

  const remaining = MAX_GUESSES - guesses.length
  const isViewingArchive = activeDayNum < currentDayNum

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
      {showArchive && (
        <ArchiveModal
          currentDayNum={currentDayNum}
          activeDayNum={activeDayNum}
          onSelect={handleDayChange}
          onClose={() => setShowArchive(false)}
        />
      )}

      {/* Header */}
      <div className="mb-5">
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-xs mb-2">
          Pickle #{activeDayNum + 1} · {getDayDate(activeDayNum).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <h1 className="font-display font-800 italic text-4xl md:text-5xl uppercase tracking-tight text-white mb-3">
          <strong>Hoofdklasse</strong><span className="text-[var(--accent)]"> Pickle</span>
        </h1>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowArchive(true)}
              className="font-display font-700 text-xs text-white/60 hover:text-white uppercase tracking-wider transition-colors border border-white/20 hover:border-white/40 rounded-lg px-2.5 py-1.5"
            >
              Archive ▾
            </button>
            {isViewingArchive && (
              <button
                onClick={() => handleDayChange(currentDayNum)}
                className="font-display font-700 text-xs text-white/60 hover:text-white uppercase tracking-wider transition-colors"
              >
                ← Today&apos;s Puzzle
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">Guesses left</p>
              <p className={`font-display font-800 text-3xl ${remaining <= 3 ? 'text-[var(--accent)]' : 'text-white'}`}>{remaining}</p>
            </div>
            <NotifyButton tooltip="Get an email when a new Pickle drops (Thu & Sat)." />
          </div>
        </div>
      </div>

      {/* Win / Lose banner */}
      {(won || lost) && (
        <div className={`mb-5 rounded-2xl border overflow-hidden ${won ? 'border-green-600/60' : 'border-red-800/40'}`}>
          <div className={`h-1.5 ${won ? 'bg-green-500' : 'bg-red-600'}`} />
          <div className={`px-5 py-4 flex items-center justify-between gap-3 flex-wrap ${won ? 'bg-green-900/25' : 'bg-red-900/15'}`}>
            <div>
              <p className={`font-display font-800 text-2xl uppercase ${won ? 'text-green-400' : 'text-red-400'}`}>
                {won ? 'You got it!' : 'Game Over'}
              </p>
              <p className="font-display font-800 text-base uppercase text-white mt-0.5">
                {won ? `${guesses.length}/${MAX_GUESSES} guesses` : target.name}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-5 h-5 rounded flex items-center justify-center p-0.5"
                  style={{ backgroundColor: TEAM_COLORS[target.teamId] }}>
                  <Image src={TEAM_LOGOS[target.teamId]} alt="" width={14} height={14} className="object-contain w-full h-full" />
                </div>
                <p className="font-display font-700 text-xs text-white/60 uppercase">
                  {TEAM_NAMES[target.teamId]} · {target.pos} · {target.bt} · {target.yob}
                </p>
              </div>
            </div>
            <button onClick={share} className="shrink-0 bg-[var(--accent)] px-5 py-2.5 rounded-xl font-display font-800 text-sm uppercase tracking-wider text-white hover:bg-[var(--accent)]/80 transition-colors">
              {shared ? '✓ Copied!' : 'Share'}
            </button>
          </div>
        </div>
      )}

      {/* Search input */}
      {!won && !lost && (
        <div className="relative mb-5">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Type a player name…"
            aria-label="Search for a player name"
            className="w-full bg-[#0d1b2e] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-4 py-3.5 text-white placeholder:text-white/30 outline-none font-display font-700 text-sm [color-scheme:dark]"
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-[#0a1220] border border-[var(--border)] rounded-xl overflow-hidden shadow-xl">
              {suggestions.map((p, i) => (
                <button key={p.name} onClick={() => submitGuess(p)} onMouseEnter={() => setSelIdx(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-[var(--border)] last:border-0 transition-colors ${i === selIdx ? 'bg-[var(--accent)]' : 'hover:bg-[var(--card-hover)]'}`}>
                  <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 p-0.5"
                    style={{ backgroundColor: TEAM_COLORS[p.teamId] }}>
                    <Image src={TEAM_LOGOS[p.teamId]} alt="" width={14} height={14} className="object-contain w-full h-full" />
                  </div>
                  <span className="font-display font-800 text-sm uppercase text-white">{p.name}</span>
                  <span className="font-display font-700 text-xs text-white/40 uppercase ml-auto">{TEAM_NAMES[p.teamId]} · {p.pos}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Column headers */}
      <div className="grid grid-cols-5 gap-1 mb-1 px-0">
        {['Team', 'Pos', 'Bats', 'Throws', 'YOB'].map(h => (
          <p key={h} className="font-display font-700 text-[10px] uppercase tracking-widest text-[var(--muted)] text-center">{h}</p>
        ))}
      </div>

      {/* Guesses */}
      <div className="space-y-2">
        {guesses.map((fb, i) => <GuessRow key={i} fb={fb} target={target} />)}
        <EmptyRows count={MAX_GUESSES - guesses.length} />
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center gap-4 flex-wrap">
        {[
          { color: 'bg-green-700', label: 'Correct' },
          { color: 'bg-yellow-700', label: `±${YOB_CLOSE} years` },
          { color: 'bg-[#1a0808]', label: 'Wrong' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${l.color}`} />
            <span className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-wider">{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <span className="text-blue-300 text-xs font-bold">↑</span><span className="text-orange-300 text-xs font-bold ml-1">↓</span>
          <span className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-wider ml-1">YOB direction</span>
        </div>
      </div>
    </div>
  )
}
