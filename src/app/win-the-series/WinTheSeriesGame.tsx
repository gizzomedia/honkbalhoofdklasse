'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { TEAM_IDS, TEAM_NAMES, TEAM_SHORT, TEAM_LOGOS, TEAM_COLORS, teamAccent } from '@/lib/teams'

// ── Config ────────────────────────────────────────────────────────────────────
const ROUNDS = 9
const SKIPS = 3
const REG_GAMES = 42
const PLAYOFF_CUTOFF = 24          // wins needed to reach the playoffs
const SEMI_WINS = 3                // best-of-5
const FINAL_WINS = 4               // best-of-7
const RA_REG = 4.8, RA_SEMI = 5.3, RA_FINAL = 5.9  // opponent runs/game per stage

// ── Types ─────────────────────────────────────────────────────────────────────
type Player = {
  name: string; teamId: string
  ab: number; r: number; h: number; hr: number; rbi: number; sb: number
  avg: number; obp: number; slg: number; ops: number
}
type Mode = 'free' | 'blind'
type Phase = 'start' | 'draft' | 'result'

type SeriesResult = { a: number; b: number; won: boolean; games: boolean[] }
type SimResult = {
  wins: number; losses: number; madePlayoffs: boolean
  semi: SeriesResult | null
  final: SeriesResult | null
  champion: boolean
  rs: number; lineupOps: number; leagueOps: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt3 = (v: number) => v.toFixed(3).replace(/^0\./, '.')

function winP(rs: number, ra: number): number {
  const e = 1.83
  const a = Math.pow(rs, e), b = Math.pow(ra, e)
  return a / (a + b)
}

function simSeries(p: number, winsNeeded: number): SeriesResult {
  let a = 0, b = 0
  const games: boolean[] = []
  while (a < winsNeeded && b < winsNeeded) {
    const w = Math.random() < p
    games.push(w)
    if (w) a++; else b++
  }
  return { a, b, won: a >= winsNeeded, games }
}

function opsColor(pct: number): string {
  if (pct >= 0.85) return '#22c55e'
  if (pct >= 0.65) return '#84cc16'
  if (pct >= 0.45) return '#eab308'
  if (pct >= 0.25) return '#f97316'
  return '#ef4444'
}

// ── Player card ───────────────────────────────────────────────────────────────
function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-display font-800 text-white text-sm tabular-nums leading-none">{value}</span>
      <span className="font-display font-700 text-[9px] text-[var(--muted)] uppercase tracking-wider">{label}</span>
    </div>
  )
}

function PlayerCard({ p, pct, blind, onPick }: { p: Player; pct: number; blind: boolean; onPick?: () => void }) {
  const accent = teamAccent(p.teamId)
  return (
    <button
      onClick={onPick}
      disabled={!onPick}
      className={`w-full text-left bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 transition-colors ${onPick ? 'hover:border-[var(--accent)] cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="font-display font-800 uppercase text-white text-sm leading-tight truncate">{p.name}</p>
        <span className="font-display font-800 text-[10px] px-1.5 py-0.5 rounded text-white shrink-0" style={{ backgroundColor: TEAM_COLORS[p.teamId] ?? '#1e335a' }}>
          {TEAM_SHORT[p.teamId]}
        </span>
      </div>
      {blind ? (
        <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest py-2">Stats hidden</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-1 mb-2">
            <StatMini label="AVG" value={fmt3(p.avg)} />
            <StatMini label="OPS" value={fmt3(p.ops)} />
            <StatMini label="HR" value={String(p.hr)} />
            <StatMini label="RBI" value={String(p.rbi)} />
          </div>
          <div className="h-1.5 rounded-full bg-[var(--card-hover)] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.max(6, pct * 100)}%`, backgroundColor: opsColor(pct) }} />
          </div>
        </>
      )}
    </button>
  )
}

// ── Slot machine (team deal) ──────────────────────────────────────────────────
function TeamDisplay({ teamId, spinning }: { teamId: string; spinning: boolean }) {
  const color = TEAM_COLORS[teamId] ?? '#1e335a'
  return (
    <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border border-[var(--border)] transition-transform ${spinning ? 'scale-95 opacity-80' : ''}`} style={{ backgroundColor: color }}>
      <div className="w-10 h-10 flex items-center justify-center">
        {TEAM_LOGOS[teamId]
          ? <Image src={TEAM_LOGOS[teamId]} alt={teamId} width={40} height={40} className="object-contain w-full h-full" />
          : <span className="font-display font-800 text-white">{TEAM_SHORT[teamId]}</span>}
      </div>
      <span className="font-display font-800 italic uppercase text-white text-lg">{TEAM_NAMES[teamId] ?? teamId}</span>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function WinTheSeriesGame() {
  const [pool, setPool] = useState<Player[] | null>(null)
  const [error, setError] = useState(false)

  const [phase, setPhase] = useState<Phase>('start')
  const [mode, setMode] = useState<Mode>('free')

  const [lineup, setLineup] = useState<Player[]>([])
  const [team, setTeam] = useState<string>(TEAM_IDS[0])
  const [spinning, setSpinning] = useState(false)
  const [skips, setSkips] = useState(SKIPS)
  const [sim, setSim] = useState<SimResult | null>(null)
  const spinTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/compare')
      .then(r => r.json())
      .then((d: Player[]) => setPool(Array.isArray(d) && d.length ? d : null))
      .catch(() => setError(true))
  }, [])

  const byTeam = useMemo(() => {
    const m: Record<string, Player[]> = {}
    for (const p of pool ?? []) (m[p.teamId] ??= []).push(p)
    for (const t of Object.keys(m)) m[t].sort((a, b) => b.ops - a.ops)
    return m
  }, [pool])

  const opsSorted = useMemo(() => (pool ?? []).map(p => p.ops).sort((a, b) => a - b), [pool])
  const leagueOps = useMemo(() => {
    const qualified = (pool ?? []).filter(p => p.ab >= 30)
    const arr = qualified.length ? qualified : (pool ?? [])
    return arr.length ? arr.reduce((s, p) => s + p.ops, 0) / arr.length : 0.75
  }, [pool])

  const pctOf = (ops: number) => {
    if (opsSorted.length < 2) return 0.5
    let below = 0
    for (const o of opsSorted) if (o < ops) below++
    return below / (opsSorted.length - 1)
  }

  const pickedNames = useMemo(() => new Set(lineup.map(p => p.name)), [lineup])
  const teamsWithPlayers = useMemo(
    () => TEAM_IDS.filter(t => (byTeam[t] ?? []).some(p => !pickedNames.has(p.name))),
    [byTeam, pickedNames]
  )

  const dealTeam = (exclude?: string) => {
    const options = teamsWithPlayers.filter(t => t !== exclude)
    const pickList = options.length ? options : teamsWithPlayers
    if (pickList.length === 0) return
    // Slot-machine spin, then settle.
    setSpinning(true)
    if (spinTimer.current) clearInterval(spinTimer.current)
    let ticks = 0
    spinTimer.current = setInterval(() => {
      setTeam(TEAM_IDS[Math.floor(Math.random() * TEAM_IDS.length)])
      ticks++
      if (ticks >= 8) {
        if (spinTimer.current) clearInterval(spinTimer.current)
        setTeam(pickList[Math.floor(Math.random() * pickList.length)])
        setSpinning(false)
      }
    }, 80)
  }

  useEffect(() => () => { if (spinTimer.current) clearInterval(spinTimer.current) }, [])

  const startGame = (m: Mode) => {
    setMode(m)
    setLineup([])
    setSkips(SKIPS)
    setSim(null)
    setPhase('draft')
    setTimeout(() => dealTeam(), 50)
  }

  const pickPlayer = (p: Player) => {
    if (spinning) return
    const next = [...lineup, p]
    setLineup(next)
    if (next.length >= ROUNDS) {
      runSim(next)
    } else {
      setTimeout(() => dealTeam(p.teamId), 150)
    }
  }

  const reroll = () => {
    if (skips <= 0 || spinning) return
    setSkips(s => s - 1)
    dealTeam(team)
  }

  const runSim = (final9: Player[]) => {
    const lineupOps = final9.reduce((s, p) => s + p.ops, 0) / final9.length
    const ratio = leagueOps > 0 ? lineupOps / leagueOps : 1
    const rs = 4.8 * ratio * ratio

    let wins = 0
    const pReg = winP(rs, RA_REG)
    for (let i = 0; i < REG_GAMES; i++) if (Math.random() < pReg) wins++
    const losses = REG_GAMES - wins
    const madePlayoffs = wins >= PLAYOFF_CUTOFF

    let semi: SeriesResult | null = null
    let fin: SeriesResult | null = null
    let champion = false
    if (madePlayoffs) {
      semi = simSeries(winP(rs, RA_SEMI), SEMI_WINS)
      if (semi.won) {
        fin = simSeries(winP(rs, RA_FINAL), FINAL_WINS)
        champion = fin.won
      }
    }
    setSim({ wins, losses, madePlayoffs, semi, final: fin, champion, rs, lineupOps, leagueOps })
    setPhase('result')
  }

  // ── Loading / error ──
  if (error) return <Shell><p className="text-center font-display font-700 text-[var(--muted)] uppercase py-20">Kon spelersdata niet laden. Probeer later opnieuw.</p></Shell>
  if (!pool) return <Shell><p className="text-center font-display font-700 text-[var(--muted)] uppercase py-20 animate-pulse">Loading players…</p></Shell>

  // ── Start screen ──
  if (phase === 'start') {
    return (
      <Shell>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 md:p-8 max-w-xl mx-auto text-center">
          <p className="font-display font-700 text-[var(--muted)] text-sm leading-relaxed mb-6">
            The slot machine deals you a random team each round. Pick one batter from that team to fill your 9-man lineup — using their real {new Date().getFullYear()} regular-season stats. Then your lineup plays a full season: win enough games to reach the playoffs, take the semifinal, and win the Holland Series.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-8 text-left">
            <Info n={`${REG_GAMES} games`} l={`${PLAYOFF_CUTOFF} wins for playoffs`} />
            <Info n="Semifinal" l="Best of 5" />
            <Info n="Holland Series" l="Best of 7" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => startGame('free')} className="font-display font-800 uppercase tracking-wider bg-[var(--accent)] text-white px-6 py-3 rounded-xl hover:opacity-90 transition-opacity">
              Play — Free
            </button>
            <button onClick={() => startGame('blind')} className="font-display font-800 uppercase tracking-wider bg-[var(--card-hover)] border border-[var(--border)] text-white px-6 py-3 rounded-xl hover:border-[var(--accent)] transition-colors">
              Play — Blind Mode
            </button>
          </div>
          <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mt-4">Blind mode hides all stats while you draft</p>
        </div>
      </Shell>
    )
  }

  // ── Draft screen ──
  if (phase === 'draft') {
    const available = (byTeam[team] ?? []).filter(p => !pickedNames.has(p.name))
    return (
      <Shell>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <p className="font-display font-800 italic text-2xl uppercase text-white"><strong>Pick {lineup.length + 1}</strong><span className="text-[var(--muted)]"> / {ROUNDS}</span></p>
          <div className="flex items-center gap-2">
            {mode === 'blind' && <span className="font-display font-800 text-[10px] uppercase tracking-widest text-[var(--accent)] border border-[var(--accent)]/40 rounded-lg px-2 py-1">Blind</span>}
            <button onClick={reroll} disabled={skips <= 0 || spinning}
              className="font-display font-800 text-xs uppercase tracking-wider bg-[var(--card)] border border-[var(--border)] text-white px-3 py-2 rounded-lg hover:border-[var(--accent)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Reroll team ({skips})
            </button>
          </div>
        </div>

        <div className="flex justify-center mb-6"><TeamDisplay teamId={team} spinning={spinning} /></div>

        {!spinning && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {available.map(p => (
              <PlayerCard key={p.name} p={p} pct={pctOf(p.ops)} blind={mode === 'blind'} onPick={() => pickPlayer(p)} />
            ))}
          </div>
        )}

        {lineup.length > 0 && (
          <div>
            <p className="font-display font-700 text-[var(--muted)] text-xs uppercase tracking-widest mb-2">Your lineup</p>
            <div className="flex flex-wrap gap-2">
              {lineup.map((p, i) => (
                <span key={p.name} className="font-display font-800 text-xs uppercase text-white bg-[var(--card)] border border-[var(--border)] rounded-lg px-2.5 py-1.5">
                  <span className="text-[var(--muted)]">{i + 1}.</span> {p.name} <span style={{ color: teamAccent(p.teamId) }}>{TEAM_SHORT[p.teamId]}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </Shell>
    )
  }

  // ── Result screen ──
  const s = sim!
  const outcome = s.champion
    ? '🏆 Holland Series Champions!'
    : s.final
      ? `Runner-up — lost the Holland Series ${s.final.a}-${s.final.b}`
      : s.semi
        ? `Eliminated in the playoffs ${s.semi.a}-${s.semi.b}`
        : `Missed the playoffs — ${s.wins}-${s.losses}`

  return (
    <Shell>
      <div className={`rounded-2xl p-6 md:p-8 mb-6 text-center border ${s.champion ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] bg-[var(--card)]'}`}>
        <p className="font-display font-800 italic text-3xl md:text-4xl uppercase text-white leading-tight"><strong>{outcome}</strong></p>
        <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest mt-3">
          Team offense ≈ {s.rs.toFixed(1)} runs/game · Lineup OPS {fmt3(s.lineupOps)} vs league {fmt3(s.leagueOps)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        <Stage title="Regular Season" score={`${s.wins}-${s.losses}`} ok={s.madePlayoffs}
          note={s.madePlayoffs ? 'Clinched a playoff spot' : `Needed ${PLAYOFF_CUTOFF} wins`} />
        <Stage title="Playoffs · Semifinal" score={s.semi ? `${s.semi.a}-${s.semi.b}` : '—'} ok={!!s.semi?.won}
          note={!s.madePlayoffs ? 'Did not qualify' : s.semi?.won ? 'Advanced to the final' : 'Eliminated'} dim={!s.madePlayoffs} />
        <Stage title="Holland Series" score={s.final ? `${s.final.a}-${s.final.b}` : '—'} ok={s.champion}
          note={!s.semi?.won ? 'Did not reach' : s.champion ? 'Champions!' : 'Lost the final'} dim={!s.semi?.won} />
      </div>

      <p className="font-display font-700 text-[var(--muted)] text-xs uppercase tracking-widest mb-3">Your lineup</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {lineup.map(p => <PlayerCard key={p.name} p={p} pct={pctOf(p.ops)} blind={false} />)}
      </div>

      <div className="flex justify-center">
        <button onClick={() => setPhase('start')} className="font-display font-800 uppercase tracking-wider bg-[var(--accent)] text-white px-8 py-3 rounded-xl hover:opacity-90 transition-opacity">
          Play again
        </button>
      </div>
    </Shell>
  )
}

// ── Layout bits ───────────────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      <div className="mb-6">
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">Postseason Game</p>
        <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
          <strong>Win the</strong><span className="text-[var(--accent)]"> Holland Series</span>
        </h1>
      </div>
      {children}
    </div>
  )
}

function Info({ n, l }: { n: string; l: string }) {
  return (
    <div className="bg-[var(--card-hover)] rounded-xl px-3 py-2">
      <p className="font-display font-800 text-white text-sm uppercase leading-none">{n}</p>
      <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-wider mt-1">{l}</p>
    </div>
  )
}

function Stage({ title, score, note, ok, dim }: { title: string; score: string; note: string; ok: boolean; dim?: boolean }) {
  return (
    <div className={`bg-[var(--card)] border rounded-2xl p-5 ${ok ? 'border-[var(--accent)]/50' : 'border-[var(--border)]'} ${dim ? 'opacity-50' : ''}`}>
      <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">{title}</p>
      <p className="font-display font-800 text-4xl text-white tabular-nums my-1">{score}</p>
      <p className={`font-display font-700 text-xs uppercase tracking-wide ${ok ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>{note}</p>
    </div>
  )
}
