'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES } from '@/lib/teams'
import type { HLPlayer } from '@/app/api/higher-lower/route'

// ── Stats config ──────────────────────────────────────────────────────────────

type StatKey = 'avg' | 'hr' | 'rbi' | 'ops' | 'sb'

const STATS: { key: StatKey; label: string; fmt: (v: number) => string }[] = [
  { key: 'avg', label: 'batting average', fmt: v => v.toFixed(3).replace(/^0\./, '.') },
  { key: 'ops', label: 'OPS',             fmt: v => v.toFixed(3).replace(/^0\./, '.') },
  { key: 'rbi', label: 'RBIs',            fmt: v => String(v) },
  { key: 'hr',  label: 'home runs',       fmt: v => String(v) },
  { key: 'sb',  label: 'stolen bases',    fmt: v => String(v) },
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

// ── Panel background ──────────────────────────────────────────────────────────

function PanelBg({ player, flash }: { player: HLPlayer; flash?: 'correct' | 'wrong' | null }) {
  const color = TEAM_COLORS[player.teamId] ?? '#1e335a'
  const logo  = TEAM_LOGOS[player.teamId]
  const name  = TEAM_NAMES[player.teamId] ?? player.teamId

  return (
    <>
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(160deg, ${color}d0 0%, ${color}60 50%, #06101e 100%)` }}
      />
      <div className="absolute inset-0 bg-[#06101e]/60" />
      {logo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <Image src={logo} alt={name} width={400} height={400}
            className="object-contain opacity-[0.07] w-48 h-48 md:w-64 md:h-64" />
        </div>
      )}
      {flash && (
        <div className={`absolute inset-0 transition-colors duration-500 ${
          flash === 'correct' ? 'bg-green-500/20' : 'bg-red-500/20'
        }`} />
      )}
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: color }} />
    </>
  )
}

// ── Team badge ────────────────────────────────────────────────────────────────

function TeamBadge({ player }: { player: HLPlayer }) {
  const color = TEAM_COLORS[player.teamId] ?? '#1e335a'
  const logo  = TEAM_LOGOS[player.teamId]
  const name  = TEAM_NAMES[player.teamId] ?? player.teamId
  return (
    <div className="flex items-center gap-2 opacity-70">
      <div className="w-6 h-6 rounded-md flex items-center justify-center p-1 shrink-0" style={{ backgroundColor: color }}>
        {logo
          ? <Image src={logo} alt={name} width={20} height={20} className="object-contain w-full h-full" />
          : <span className="font-display font-800 text-[8px] text-white">{player.teamId.slice(0,3).toUpperCase()}</span>
        }
      </div>
      <span className="font-display font-700 text-xs uppercase tracking-wider text-white/60">{name}</span>
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
    }, 1500)
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

  // ── Loading ────────────────────────────────────────────────────────────────

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
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-6 py-4 max-w-sm w-full">
            <p className="font-display font-700 text-[9px] uppercase tracking-widest text-[var(--muted)]/60 mb-3">{stat.label}</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-display font-700 text-sm text-white/80">{left.name}</span>
                <span className="font-display font-800 text-sm text-[var(--accent)]">{stat.fmt(left[statKey] as number)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-display font-700 text-sm text-white/80">{right.name}</span>
                <span className="font-display font-800 text-sm text-[var(--accent)]">{stat.fmt(right[statKey] as number)}</span>
              </div>
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

  const leftVal  = left  ? (left[statKey]  as number) : 0
  const rightVal = right ? (right[statKey] as number) : 0

  return (
    <div
      className="relative flex flex-col md:flex-row pt-20"
      style={{ minHeight: '100dvh' }}
    >
      {/* ── Left panel — revealed ── */}
      {left && (
        <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden px-8 py-12 md:py-0 min-h-[45dvh] md:min-h-0">
          <PanelBg player={left} />

          {/* Score — top-left overlay */}
          <div className="absolute top-4 left-5 z-10 text-left">
            <p className="font-display font-700 text-[9px] uppercase tracking-widest text-white/40">Score</p>
            <p className="font-display font-800 text-xl text-white leading-none">{score}</p>
          </div>

          <div className="relative z-10 flex flex-col items-center text-center gap-3 max-w-xs">
            <TeamBadge player={left} />
            <p className="font-display font-800 text-3xl md:text-4xl text-white leading-tight drop-shadow-md">
              &ldquo;{left.name}&rdquo;
            </p>
            <p className="font-display font-700 text-sm text-white/70 uppercase tracking-wider">has</p>
            <p className="font-display font-800 text-8xl md:text-9xl text-white leading-none tabular-nums drop-shadow-xl">
              {stat.fmt(leftVal)}
            </p>
            <p className="font-display font-800 text-base text-white/80 uppercase tracking-widest">{stat.label}</p>
          </div>
        </div>
      )}

      {/* ── VS circle — absolutely centered ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
        <div className="w-14 h-14 rounded-full bg-[#06101e] border-2 border-white/20 flex items-center justify-center shadow-xl">
          <span className="font-display font-800 text-xs uppercase tracking-widest text-white/60">vs</span>
        </div>
      </div>

      {/* ── Right panel — question / reveal ── */}
      {right && (
        <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden px-8 py-12 md:py-0 min-h-[45dvh] md:min-h-0">
          <PanelBg player={right} flash={phase === 'reveal' ? lastResult : null} />

          {/* High score — top-right overlay */}
          <div className="absolute top-4 right-5 z-10 text-right">
            <p className="font-display font-700 text-[9px] uppercase tracking-widest text-white/40">Best</p>
            <p className="font-display font-800 text-xl text-[var(--accent)] leading-none">{highScore}</p>
          </div>

          <div className="relative z-10 flex flex-col items-center text-center gap-4 max-w-xs w-full">
            <TeamBadge player={right} />
            <p className="font-display font-800 text-3xl md:text-4xl text-white leading-tight drop-shadow-md">
              &ldquo;{right.name}&rdquo;
            </p>
            <p className="font-display font-700 text-sm text-white/70 uppercase tracking-wider">has</p>

            {phase === 'reveal' ? (
              /* Revealed value */
              <p className={`font-display font-800 text-8xl md:text-9xl leading-none tabular-nums drop-shadow-xl ${
                lastResult === 'correct' ? 'text-green-400' : 'text-red-400'
              }`}>
                {stat.fmt(rightVal)}
              </p>
            ) : (
              /* Higher / Lower buttons */
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={() => guess(true)}
                  className="w-full font-display font-800 text-base uppercase tracking-wider
                             border-2 border-white/30 bg-white/5 hover:bg-white/15 hover:border-white/60
                             text-white rounded-full px-6 py-3.5
                             transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <span>Higher</span>
                  <span className="text-[var(--accent)]">▲</span>
                </button>
                <button
                  onClick={() => guess(false)}
                  className="w-full font-display font-800 text-base uppercase tracking-wider
                             border-2 border-white/30 bg-white/5 hover:bg-white/15 hover:border-white/60
                             text-white rounded-full px-6 py-3.5
                             transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <span>Lower</span>
                  <span className="text-[var(--accent)]">▼</span>
                </button>
              </div>
            )}

            <p className="font-display font-800 text-sm text-white/70 uppercase tracking-widest">
              {stat.label} than {left?.name.split(' ')[0]}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
