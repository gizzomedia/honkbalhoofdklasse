'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { ROSTERS, type Player } from '@/lib/rosters-data'
import NotifyButton from '@/components/NotifyButton'

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
const YOB_CLOSE   = 2

type PoolPlayer = Player & { teamId: string }

const ALL_PLAYERS: PoolPlayer[] = Object.entries(ROSTERS)
  .flatMap(([teamId, r]) => r.players.map(p => ({ ...p, teamId })))
  .sort((a, b) => a.name.localeCompare(b.name))

// ── Daily player ──────────────────────────────────────────────────────────────

// Game days: Thursday (4) and Saturday (6)
// On other days, use the most recent game day's puzzle
function getGameDayDate(): Date {
  const now = new Date()
  const dow = now.getDay() // 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
  const daysBack = [1, 2, 3, 4, 0, 1, 0][dow] // Sun→Sat Mon→Sat Tue→Sat Wed→Sat Thu→Thu Fri→Thu Sat→Sat
  const d = new Date(now)
  d.setDate(d.getDate() - daysBack)
  return d
}

function getDailyPlayer(): PoolPlayer {
  const gameDay = getGameDayDate()
  const day     = Math.floor(gameDay.getTime() / 86400000)
  let seed      = day * 1664525 + 1013904223
  const arr     = [...ALL_PLAYERS]
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(seed) % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr[0]
}

function todayKey() {
  const d = getGameDayDate()
  return `pickle_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`
}

// ── Feedback ──────────────────────────────────────────────────────────────────

type Hit = 'correct' | 'close' | 'wrong'
type Dir = 'up' | 'down' | null

type GuessFeedback = {
  player: PoolPlayer
  team: Hit; pos: Hit; bats: Hit; throws: Hit; yob: Hit; yobDir: Dir
}

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
      {/* Name bar */}
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

      {/* 5 attribute cells */}
      <div className="grid grid-cols-5 gap-1">
        {/* Team */}
        <FlipCell hit={fb.team} delay={0}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center p-1 shrink-0"
            style={{ backgroundColor: TEAM_COLORS[fb.player.teamId] }}>
            <Image src={TEAM_LOGOS[fb.player.teamId]} alt="" width={20} height={20} className="object-contain w-full h-full" />
          </div>
          <span className="font-display font-700 text-[9px] uppercase text-white/70 text-center leading-none">{TEAM_NAMES[fb.player.teamId]}</span>
        </FlipCell>

        {/* Position */}
        <FlipCell hit={fb.pos} delay={1}>
          <span className="font-display font-800 text-sm uppercase text-white">{fb.player.pos}</span>
          <span className="font-display font-700 text-[9px] uppercase text-white/60 text-center leading-none">{POS_LABEL[fb.player.pos]?.slice(0,6) ?? fb.player.pos}</span>
        </FlipCell>

        {/* Bats */}
        <FlipCell hit={fb.bats} delay={2}>
          <span className="font-display font-700 text-[9px] uppercase text-white/60">Bats</span>
          <span className="font-display font-800 text-base uppercase text-white">{fb.player.bt[0]}</span>
        </FlipCell>

        {/* Throws */}
        <FlipCell hit={fb.throws} delay={3}>
          <span className="font-display font-700 text-[9px] uppercase text-white/60">Throws</span>
          <span className="font-display font-800 text-base uppercase text-white">{fb.player.bt.at(-1)}</span>
        </FlipCell>

        {/* Born */}
        <FlipCell hit={fb.yob} delay={4} arrow={fb.yobDir ?? undefined}>
          <span className="font-display font-700 text-[9px] uppercase text-white/60">Born</span>
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

function buildShareText(guesses: GuessFeedback[], won: boolean): string {
  const row = (fb: GuessFeedback) => [
    fb.team   === 'correct' ? '🟩' : '🟥',
    fb.pos    === 'correct' ? '🟩' : '🟥',
    fb.bats   === 'correct' ? '🟩' : '🟥',
    fb.throws === 'correct' ? '🟩' : '🟥',
    fb.yob    === 'correct' ? '🟩' : fb.yob === 'close' ? '🟨' : '🟥',
  ].join('')

  return [
    `Hoofdklasse Pickle — ${new Date().toLocaleDateString('nl-NL')}`,
    won ? `✅ ${guesses.length}/${MAX_GUESSES}` : `❌ ${MAX_GUESSES}/${MAX_GUESSES}`,
    '',
    ...guesses.map(row),
    '',
    'honkbalhoofdklasse.com/pickle',
  ].join('\n')
}

// ── Main ──────────────────────────────────────────────────────────────────────

type SavedState = { guesses: GuessFeedback[]; won: boolean; lost: boolean }

export default function PicklePage() {
  const target = getDailyPlayer()
  const [guesses, setGuesses]   = useState<GuessFeedback[]>([])
  const [won,  setWon]          = useState(false)
  const [lost, setLost]         = useState(false)
  const [query, setQuery]       = useState('')
  const [suggestions, setSugg]  = useState<PoolPlayer[]>([])
  const [selIdx, setSelIdx]     = useState(-1)
  const [shared, setShared]     = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const raw = localStorage.getItem(todayKey())
    if (raw) { const s: SavedState = JSON.parse(raw); setGuesses(s.guesses); setWon(s.won); setLost(s.lost) }
  }, [])

  useEffect(() => {
    if (guesses.length > 0) localStorage.setItem(todayKey(), JSON.stringify({ guesses, won, lost }))
  }, [guesses, won, lost])

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
    navigator.clipboard.writeText(buildShareText(guesses, won))
    setShared(true); setTimeout(() => setShared(false), 2000)
  }

  const remaining = MAX_GUESSES - guesses.length

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
      {/* Header */}
      <div className="mb-5">
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">
          {getGameDayDate().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
            <strong>Hoofdklasse</strong><span className="text-[var(--accent)]"> Pickle</span>
          </h1>
          <div className="flex items-end gap-3 shrink-0">
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
        {['Team', 'Pos', 'Bats', 'Throws', 'Born'].map(h => (
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
          <span className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-wider ml-1">Birth year direction</span>
        </div>
      </div>
    </div>
  )
}
