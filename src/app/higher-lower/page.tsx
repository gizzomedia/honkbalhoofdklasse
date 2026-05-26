'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES } from '@/lib/teams'
import type { HLPlayer } from '@/app/api/higher-lower/route'

// ── Stats config ──────────────────────────────────────────────────────────────

type StatKey = 'avg' | 'hr' | 'rbi' | 'ops' | 'sb'

const STATS: { key: StatKey; label: string; desc: string; fmt: (v: number) => string }[] = [
  { key: 'avg', label: 'Batting Average', desc: 'BA',  fmt: v => v.toFixed(3).replace(/^0\./, '.') },
  { key: 'hr',  label: 'Home Runs',       desc: 'HR',  fmt: v => String(v) },
  { key: 'rbi', label: 'RBI',             desc: 'RBI', fmt: v => String(v) },
  { key: 'ops', label: 'OPS',             desc: 'OPS', fmt: v => v.toFixed(3).replace(/^0\./, '.') },
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

function todaySeed(): number {
  return Math.floor(Date.now() / 86400000)
}

// ── Player card ───────────────────────────────────────────────────────────────

function PlayerCard({
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

  const borderCls = result === 'correct'
    ? 'border-green-500'
    : result === 'wrong'
      ? 'border-red-500'
      : 'border-[var(--border)]'

  return (
    <div className={`flex-1 bg-[var(--card)] border-2 ${borderCls} rounded-2xl overflow-hidden transition-colors`}>
      {/* Team color strip */}
      <div className="h-1.5 w-full" style={{ backgroundColor: color }} />

      <div className="p-4 md:p-6 flex flex-col items-center gap-3 text-center">
        {/* Team logo */}
        <div className="w-12 h-12 rounded-xl flex items-center justify-center p-2" style={{ backgroundColor: color }}>
          {logo
            ? <Image src={logo} alt={name} width={36} height={36} className="object-contain w-full h-full" />
            : <span className="font-display font-800 text-xs text-white">{player.teamId.slice(0, 3).toUpperCase()}</span>
          }
        </div>

        {/* Name */}
        <div>
          <p className="font-display font-800 text-sm uppercase tracking-wide text-white leading-tight">{player.name}</p>
          <p className="font-display font-700 text-xs text-[var(--muted)] mt-0.5">{name}</p>
        </div>

        {/* Stat */}
        <div className="mt-1">
          <p className="font-display font-700 text-[10px] uppercase text-[var(--muted)] tracking-wider mb-1">{stat.desc}</p>
          {revealed ? (
            <p className={`font-display font-800 text-4xl md:text-5xl ${
              result === 'correct' ? 'text-green-400' : result === 'wrong' ? 'text-red-400' : 'text-[var(--accent)]'
            }`}>
              {stat.fmt(val)}
            </p>
          ) : (
            <p className="font-display font-800 text-4xl md:text-5xl text-white/20">?</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main game ─────────────────────────────────────────────────────────────────

type Phase = 'loading' | 'playing' | 'reveal' | 'gameover'

export default function HigherLowerPage() {
  const [players,    setPlayers]    = useState<HLPlayer[]>([])
  const [sequence,   setSequence]   = useState<HLPlayer[]>([])
  const [statIdx,    setStatIdx]    = useState(0)
  const [idx,        setIdx]        = useState(0)         // current "left" index
  const [score,      setScore]      = useState(0)
  const [highScore,  setHighScore]  = useState(0)
  const [phase,      setPhase]      = useState<Phase>('loading')
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null)

  const stat = STATS[statIdx % STATS.length]

  // Load players once
  useEffect(() => {
    fetch('/api/higher-lower')
      .then(r => r.json())
      .then((data: HLPlayer[]) => {
        setPlayers(data)
        const seed = todaySeed()
        // Sort: players with more non-zero stats first, then shuffle within groups
        const rich  = data.filter(p => p.hr > 0 || p.sb > 0)
        const sparse = data.filter(p => p.hr === 0 && p.sb === 0)
        const seq = [...seededShuffle(rich, seed), ...seededShuffle(sparse, seed + 1)]
        setSequence(seq)
        setStatIdx(0) // always start with batting average
        setPhase('playing')
      })
      .catch(() => setPhase('gameover'))

    const hs = Number(localStorage.getItem('hl-highscore') ?? 0)
    setHighScore(hs)
  }, [])

  const left  = sequence[idx]
  const right = sequence[idx + 1]

  const guess = useCallback((guessHigher: boolean) => {
    if (phase !== 'playing' || !left || !right) return

    const lv = left[stat.key]  as number
    const rv = right[stat.key] as number
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
        // Rotate stat every 2 correct answers
        const nextStatIdx = newScore % 2 === 0 ? statIdx + 1 : statIdx
        const nextStat = STATS[nextStatIdx % STATS.length]
        if (newScore % 2 === 0) setStatIdx(nextStatIdx)

        // Find next right-player with non-zero value for upcoming stat (skip up to 4)
        let nextIdx = idx + 1
        for (let skip = 0; skip < 4; skip++) {
          const candidate = sequence[nextIdx + 1]
          if (!candidate || (candidate[nextStat.key] as number) > 0) break
          nextIdx++
        }

        if (nextIdx + 1 >= sequence.length) {
          setPhase('gameover')
        } else {
          setIdx(nextIdx)
          setLastResult(null)
          setPhase('playing')
        }
      } else {
        setPhase('gameover')
      }
    }, 1200)
  }, [phase, left, right, stat, score, highScore, idx, sequence])

  function restart() {
    const seed = todaySeed() + Math.floor(Math.random() * 1000)
    const seq  = seededShuffle(players, seed)
    setSequence(seq)
    setIdx(0)
    setScore(0)
    setLastResult(null)
    setStatIdx(todaySeed() % STATS.length)
    setPhase('playing')
  }

  function shareResult() {
    const text = `Honkbal Hoofdklasse Higher/Lower\n${stat.label}\nScore: ${score} 🎯\nhonkbalhoofdklasse.com/higher-lower`
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text).catch(() => {})
    }
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-display font-700 text-sm uppercase text-[var(--muted)] tracking-wider animate-pulse">Loading…</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* Header */}
      <div className="text-center mb-6">
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-xs mb-1">Honkbal Hoofdklasse</p>
        <h1 className="font-display font-800 italic text-4xl uppercase text-white">
          Higher <span className="text-[var(--accent)]">Lower</span>
        </h1>
        <p className="font-display font-700 text-xs text-[var(--muted)] mt-1 uppercase tracking-wider">
          {stat.label}
        </p>
      </div>

      {/* Score bar */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="text-center">
          <p className="font-display font-700 text-[10px] uppercase text-[var(--muted)] tracking-wider">Score</p>
          <p className="font-display font-800 text-2xl text-white">{score}</p>
        </div>
        <div className="text-center">
          <p className="font-display font-700 text-[10px] uppercase text-[var(--muted)] tracking-wider">Best</p>
          <p className="font-display font-800 text-2xl text-[var(--accent)]">{highScore}</p>
        </div>
      </div>

      {/* Game over */}
      {phase === 'gameover' && (
        <div className="flex flex-col items-center gap-6 text-center py-8">
          <div>
            <p className="font-display font-700 text-[var(--muted)] uppercase tracking-widest text-sm mb-2">Game Over</p>
            <p className="font-display font-800 italic text-6xl text-white">{score}</p>
            <p className="font-display font-700 text-[var(--muted)] text-sm mt-1">
              {score > highScore - 1 && score > 0 ? '🎉 New high score!' : `Best: ${highScore}`}
            </p>
          </div>
          {left && right && (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-5 py-4 text-sm text-[var(--muted)] font-display font-700">
              <p>{left.name} — {stat.fmt(left[stat.key] as number)} {stat.desc}</p>
              <p>{right.name} — {stat.fmt(right[stat.key] as number)} {stat.desc}</p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={restart} className="font-display font-800 text-sm uppercase tracking-wider bg-[var(--accent)] text-white px-6 py-3 rounded-xl hover:opacity-90 transition-opacity">
              Play Again
            </button>
            <button onClick={shareResult} className="font-display font-800 text-sm uppercase tracking-wider border border-[var(--border)] text-white/70 px-6 py-3 rounded-xl hover:text-white hover:border-white/40 transition-colors">
              Share
            </button>
          </div>
        </div>
      )}

      {/* Playing */}
      {(phase === 'playing' || phase === 'reveal') && left && right && (
        <div className="flex flex-col gap-4">
          {/* Cards */}
          <div className="flex gap-3 items-stretch">
            <PlayerCard
              player={left}
              statKey={stat.key}
              revealed={true}
              result={phase === 'reveal' ? (lastResult === 'wrong' ? null : null) : null}
            />

            {/* VS */}
            <div className="flex flex-col items-center justify-center shrink-0 gap-1">
              <div className="w-px flex-1 bg-white/10" />
              <span className="font-display font-800 text-xs text-white/30 uppercase tracking-widest">vs</span>
              <div className="w-px flex-1 bg-white/10" />
            </div>

            <PlayerCard
              player={right}
              statKey={stat.key}
              revealed={phase === 'reveal'}
              result={phase === 'reveal' ? lastResult : null}
            />
          </div>

          {/* Question */}
          <p className="text-center font-display font-700 text-sm text-[var(--muted)] uppercase tracking-wider">
            Does <span className="text-white">{right.name.split(' ')[0]}</span> have a higher or lower {stat.label.toLowerCase()}?
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => guess(true)}
              disabled={phase === 'reveal'}
              className="flex-1 font-display font-800 text-lg uppercase tracking-wider bg-[var(--card)] border-2 border-[var(--border)] hover:border-green-500 hover:text-green-400 text-white py-4 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              ↑ Higher
            </button>
            <button
              onClick={() => guess(false)}
              disabled={phase === 'reveal'}
              className="flex-1 font-display font-800 text-lg uppercase tracking-wider bg-[var(--card)] border-2 border-[var(--border)] hover:border-red-500 hover:text-red-400 text-white py-4 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              ↓ Lower
            </button>
          </div>

          {/* Stat changes hint */}
          {score > 0 && score % 2 === 1 && (
            <p className="text-center font-display font-700 text-[10px] text-[var(--accent)] uppercase tracking-wider">
              Next correct answer changes the stat!
            </p>
          )}
        </div>
      )}
    </div>
  )
}
