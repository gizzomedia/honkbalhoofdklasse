'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES } from '@/lib/teams'
import type { HLPlayer } from '@/app/api/higher-lower/route'

// ── Stats config ──────────────────────────────────────────────────────────────

type StatKey = 'avg' | 'hr' | 'rbi' | 'ops' | 'sb'

const STATS: { key: StatKey; label: string; desc: string; fmt: (v: number) => string }[] = [
  { key: 'avg', label: 'Batting Average', desc: 'BA',  fmt: v => v.toFixed(3).replace(/^0\./, '.') },
  { key: 'ops', label: 'OPS',             desc: 'OPS', fmt: v => v.toFixed(3).replace(/^0\./, '.') },
  { key: 'rbi', label: 'RBI',             desc: 'RBI', fmt: v => String(v) },
  { key: 'hr',  label: 'Home Runs',       desc: 'HR',  fmt: v => String(v) },
  { key: 'sb',  label: 'Stolen Bases',    desc: 'SB',  fmt: v => String(v) },
]

// ── Seeded shuffle ────────────────────────────────────────────────────────────

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed >>> 0
  for (let i = a.length - 1; i > 0; i--) {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildStatSequence(seed: number, length: number): StatKey[] {
  const result: StatKey[] = []
  let s = seed
  while (result.length < length) {
    const shuffled = seededShuffle(STATS.map(st => st.key), s++)
    result.push(...shuffled)
  }
  return result
}

function randomSeed(): number {
  return Math.floor(Math.random() * 999983)
}

function buildSequence(data: HLPlayer[], seed: number) {
  const rich   = data.filter(p => p.hr > 0 || p.sb > 0)
  const sparse = data.filter(p => p.hr === 0 && p.sb === 0)
  return [...seededShuffle(rich, seed), ...seededShuffle(sparse, seed + 1)]
}

// ── Full-bleed player panel ───────────────────────────────────────────────────

function PlayerPanel({
  player, statKey, revealed, result,
}: {
  player: HLPlayer
  statKey: StatKey
  revealed: boolean
  result?: 'correct' | 'wrong' | null
}) {
  const stat  = STATS.find(s => s.key === statKey)!
  const color = TEAM_COLORS[player.teamId] ?? '#1e335a'
  const logo  = TEAM_LOGOS[player.teamId]
  const name  = TEAM_NAMES[player.teamId] ?? player.teamId
  const val   = player[statKey] as number

  const flashCls = result === 'correct'
    ? 'bg-green-500/15'
    : result === 'wrong'
      ? 'bg-red-500/15'
      : 'bg-transparent'

  const valCls = result === 'correct'
    ? 'text-green-400'
    : result === 'wrong'
      ? 'text-red-400'
      : 'text-white'

  return (
    <div
      className="relative flex-1 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${color}e0 0%, ${color}80 60%, #06101e 100%)`,
      }}
    >
      {/* Dark base */}
      <div className="absolute inset-0 bg-[#06101e]/40" />

      {/* Team color flash on result */}
      <div className={`absolute inset-0 transition-colors duration-300 ${flashCls}`} />

      {/* Big logo watermark */}
      {logo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <Image
            src={logo}
            alt=""
            width={400}
            height={400}
            className="object-contain opacity-[0.06] w-56 h-56 md:w-72 md:h-72"
          />
        </div>
      )}

      {/* Subtle top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: color }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 py-6 gap-4 w-full max-w-xs">
        {/* Team badge */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center p-2 shadow-lg"
          style={{ backgroundColor: `${color}cc` }}
        >
          {logo
            ? <Image src={logo} alt={name} width={36} height={36} className="object-contain w-full h-full" />
            : <span className="font-display font-800 text-xs text-white">{player.teamId.slice(0, 3).toUpperCase()}</span>
          }
        </div>

        {/* Player name */}
        <div>
          <p className="font-display font-800 text-2xl md:text-3xl uppercase tracking-wide text-white leading-tight drop-shadow-lg">
            {player.name}
          </p>
          <p className="font-display font-700 text-xs uppercase tracking-widest text-white/50 mt-1">{name}</p>
        </div>

        {/* Stat value */}
        <div className="flex flex-col items-center gap-1">
          {revealed ? (
            <>
              <p className={`font-display font-800 text-6xl md:text-7xl leading-none drop-shadow-xl tabular-nums ${valCls}`}>
                {stat.fmt(val)}
              </p>
              <p className="font-display font-700 text-xs uppercase tracking-widest text-white/40">{stat.desc}</p>
            </>
          ) : (
            <p className="font-display font-800 text-7xl md:text-8xl leading-none text-white/15 select-none">?</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main game ─────────────────────────────────────────────────────────────────

type Phase = 'loading' | 'playing' | 'reveal' | 'gameover'

export default function HigherLowerPage() {
  const [players,      setPlayers]      = useState<HLPlayer[]>([])
  const [sequence,     setSequence]     = useState<HLPlayer[]>([])
  const [statSequence, setStatSequence] = useState<StatKey[]>([])
  const [statStep,     setStatStep]     = useState(0)
  const [leftIdx,      setLeftIdx]      = useState(0)
  const [rightIdx,     setRightIdx]     = useState(1)
  const [score,        setScore]        = useState(0)
  const [highScore,    setHighScore]    = useState(0)
  const [phase,        setPhase]        = useState<Phase>('loading')
  const [lastResult,   setLastResult]   = useState<'correct' | 'wrong' | null>(null)

  const statKey = statSequence[statStep] ?? 'avg'
  const stat    = STATS.find(s => s.key === statKey)!

  useEffect(() => {
    fetch('/api/higher-lower')
      .then(r => r.json())
      .then((data: HLPlayer[]) => {
        setPlayers(data)
        const seed    = randomSeed()
        const seq     = buildSequence(data, seed)
        const statSeq = buildStatSequence(seed + 42, 200)
        setSequence(seq)
        setStatSequence(statSeq)
        setStatStep(0)
        setPhase('playing')
      })
      .catch(() => setPhase('gameover'))

    setHighScore(Number(localStorage.getItem('hl-highscore') ?? 0))
  }, [])

  const left  = sequence[leftIdx]
  const right = sequence[rightIdx]

  const guess = useCallback((guessHigher: boolean) => {
    if (phase !== 'playing' || !left || !right) return

    const lv = left[statKey]  as number
    const rv = right[statKey] as number
    const correct = guessHigher ? rv >= lv : rv <= lv

    setLastResult(correct ? 'correct' : 'wrong')
    setPhase('reveal')

    setTimeout(() => {
      if (correct) {
        const newScore = score + 1
        setScore(newScore)
        if (newScore > highScore) {
          setHighScore(newScore)
          localStorage.setItem('hl-highscore', String(newScore))
        }

        const newStatStep = newScore % 2 === 0 ? statStep + 1 : statStep
        if (newScore % 2 === 0) setStatStep(newStatStep)
        const upcomingStat = statSequence[newStatStep] ?? 'avg'

        // Old right always becomes new left — skip zero-value right candidates only
        const newLeftIdx = rightIdx
        let newRightIdx  = rightIdx + 1
        for (let skip = 0; skip < 4; skip++) {
          const candidate = sequence[newRightIdx]
          if (!candidate || (candidate[upcomingStat] as number) > 0) break
          newRightIdx++
        }

        if (newRightIdx >= sequence.length) {
          setPhase('gameover')
        } else {
          setLeftIdx(newLeftIdx)
          setRightIdx(newRightIdx)
          setLastResult(null)
          setPhase('playing')
        }
      } else {
        setPhase('gameover')
      }
    }, 1400)
  }, [phase, left, right, statKey, statSequence, score, highScore, leftIdx, rightIdx, statStep, sequence])

  function restart() {
    const seed    = randomSeed()
    const seq     = buildSequence(players, seed)
    const statSeq = buildStatSequence(seed + 42, 200)
    setSequence(seq)
    setStatSequence(statSeq)
    setStatStep(0)
    setLeftIdx(0)
    setRightIdx(1)
    setScore(0)
    setLastResult(null)
    setPhase('playing')
  }

  function shareResult() {
    const text = `Honkbal Hoofdklasse Higher/Lower\nScore: ${score} 🎯\nhonkbalhoofdklasse.com/higher-lower`
    if (navigator.share) navigator.share({ text }).catch(() => {})
    else navigator.clipboard.writeText(text).catch(() => {})
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-display font-700 text-sm uppercase text-[var(--muted)] tracking-wider animate-pulse">Loading…</p>
      </div>
    )
  }

  // ── Game over ──────────────────────────────────────────────────────────────

  if (phase === 'gameover') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 text-center px-4 pt-20">
        <div>
          <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-xs mb-3">Honkbal Hoofdklasse</p>
          <h1 className="font-display font-800 italic text-4xl uppercase text-white mb-1">
            Higher <span className="text-[var(--accent)]">Lower</span>
          </h1>
          <p className="font-display font-700 text-[var(--muted)] uppercase tracking-widest text-xs">Game Over</p>
        </div>

        <div>
          <p className="font-display font-800 italic text-8xl text-white leading-none">{score}</p>
          <p className="font-display font-700 text-[var(--muted)] text-sm mt-2">
            {score > 0 && score >= highScore ? '🎉 New high score!' : `Best: ${highScore}`}
          </p>
        </div>

        {left && right && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-6 py-4 text-sm text-[var(--muted)] font-display font-700 space-y-2 max-w-sm w-full">
            <p className="text-[10px] uppercase tracking-widest text-[var(--muted)]/60 mb-3">{stat.label}</p>
            <div className="flex justify-between items-center">
              <span className="text-white/80">{left.name}</span>
              <span className="text-[var(--accent)]">{stat.fmt(left[statKey] as number)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/80">{right.name}</span>
              <span className="text-[var(--accent)]">{stat.fmt(right[statKey] as number)}</span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={restart}
            className="font-display font-800 text-sm uppercase tracking-wider bg-[var(--accent)] text-white px-8 py-4 rounded-2xl hover:opacity-90 transition-opacity">
            Play Again
          </button>
          <button onClick={shareResult}
            className="font-display font-800 text-sm uppercase tracking-wider border border-[var(--border)] text-white/70 px-8 py-4 rounded-2xl hover:text-white hover:border-white/40 transition-colors">
            Share
          </button>
        </div>
      </div>
    )
  }

  // ── Playing ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col pt-20" style={{ minHeight: '100dvh' }}>

      {/* Score bar */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-sm shrink-0">
        <div className="text-center min-w-[48px]">
          <p className="font-display font-700 text-[9px] uppercase text-[var(--muted)] tracking-wider">Score</p>
          <p className="font-display font-800 text-lg text-white leading-none mt-0.5">{score}</p>
        </div>

        <div className="text-center">
          <h1 className="font-display font-800 italic text-base uppercase text-white leading-none">
            Higher <span className="text-[var(--accent)]">Lower</span>
          </h1>
          <p className="font-display font-700 text-[8px] uppercase tracking-widest text-[var(--muted)] mt-0.5">Honkbal Hoofdklasse</p>
        </div>

        <div className="text-center min-w-[48px]">
          <p className="font-display font-700 text-[9px] uppercase text-[var(--muted)] tracking-wider">Best</p>
          <p className="font-display font-800 text-lg text-[var(--accent)] leading-none mt-0.5">{highScore}</p>
        </div>
      </div>

      {/* Split screen */}
      {left && right && (
        <div className="flex-1 flex flex-col md:flex-row">

          {/* Left panel — revealed */}
          <PlayerPanel player={left} statKey={statKey} revealed={true} result={null} />

          {/* Center divider — VS + stat label + buttons */}
          <div className="flex flex-row md:flex-col items-center justify-between md:justify-center shrink-0 md:w-48
                          bg-[#06101e] border-t border-b md:border-t-0 md:border-b-0 md:border-l md:border-r border-[var(--border)]/60
                          px-4 py-3 md:py-8 gap-3 md:gap-5">

            {/* Stat badge */}
            <div className="bg-[var(--accent)] px-3 md:px-4 py-1.5 md:py-2 rounded-full">
              <p className="font-display font-800 text-[10px] md:text-xs uppercase tracking-widest text-white">
                {stat.label}
              </p>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center gap-1 hidden md:flex">
              <div className="w-px h-8 bg-white/10" />
              <p className="font-display font-800 text-xs text-white/20 uppercase tracking-widest">vs</p>
              <div className="w-px h-8 bg-white/10" />
            </div>

            {/* Question */}
            <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-wider text-center leading-relaxed hidden md:block">
              Does <span className="text-white">{right.name.split(' ')[0]}</span> have a higher or lower {stat.label.toLowerCase()}?
            </p>

            {/* Buttons */}
            <div className="flex md:flex-col gap-2 md:w-full">
              <button
                onClick={() => guess(true)}
                disabled={phase === 'reveal'}
                className="font-display font-800 text-xs md:text-sm uppercase tracking-wider
                           border-2 border-green-500/40 bg-green-500/10 hover:bg-green-500/20 hover:border-green-400
                           text-green-400 px-3 md:px-4 py-2.5 md:py-3.5 rounded-xl
                           transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 md:w-full"
              >
                ↑ Higher
              </button>
              <button
                onClick={() => guess(false)}
                disabled={phase === 'reveal'}
                className="font-display font-800 text-xs md:text-sm uppercase tracking-wider
                           border-2 border-red-500/40 bg-red-500/10 hover:bg-red-500/20 hover:border-red-400
                           text-red-400 px-3 md:px-4 py-2.5 md:py-3.5 rounded-xl
                           transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 md:w-full"
              >
                ↓ Lower
              </button>
            </div>
          </div>

          {/* Right panel — hidden until reveal */}
          <PlayerPanel
            player={right}
            statKey={statKey}
            revealed={phase === 'reveal'}
            result={phase === 'reveal' ? lastResult : null}
          />
        </div>
      )}

      {/* Mobile question strip */}
      {(phase === 'playing' || phase === 'reveal') && right && (
        <div className="md:hidden shrink-0 px-4 py-2 text-center bg-[#06101e] border-t border-[var(--border)]/40">
          <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-wider">
            Does <span className="text-white">{right.name.split(' ')[0]}</span> have a higher or lower {stat.label.toLowerCase()}?
          </p>
        </div>
      )}
    </div>
  )
}
