'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { TEAM_IDS, TEAM_NAMES, TEAM_SHORT, TEAM_LOGOS, TEAM_COLORS, teamAccent } from '@/lib/teams'
import type { HSHitter, HSPitcher } from '@/app/api/win-the-series/route'

// ── Config ────────────────────────────────────────────────────────────────────
const REG_GAMES = 42
const CUTOFF_MIN = 23, CUTOFF_MAX = 26   // playoff line varies per game, fixed within a game
const SEMI_WINS = 3                      // best-of-5
const FINAL_WINS = 4                     // best-of-7
const RA_FLOOR = 3.0
const STAGE_MULT = { reg: 1.0, semi: 1.06, final: 1.12 }

type SlotType = 'field' | 'dh' | 'SP' | 'RP'
type Slot = { key: string; label: string; short: string; type: SlotType; pos?: string }
const SLOTS: Slot[] = [
  { key: 'C', label: 'Catcher', short: 'C', type: 'field', pos: 'C' },
  { key: '1B', label: 'First Base', short: '1B', type: 'field', pos: '1B' },
  { key: '2B', label: 'Second Base', short: '2B', type: 'field', pos: '2B' },
  { key: '3B', label: 'Third Base', short: '3B', type: 'field', pos: '3B' },
  { key: 'SS', label: 'Shortstop', short: 'SS', type: 'field', pos: 'SS' },
  { key: 'LF', label: 'Left Field', short: 'LF', type: 'field', pos: 'LF' },
  { key: 'CF', label: 'Center Field', short: 'CF', type: 'field', pos: 'CF' },
  { key: 'RF', label: 'Right Field', short: 'RF', type: 'field', pos: 'RF' },
  { key: 'DH', label: 'Designated Hitter', short: 'DH', type: 'dh' },
  { key: 'SP1', label: 'Starter 1', short: 'SP', type: 'SP' },
  { key: 'SP2', label: 'Starter 2', short: 'SP', type: 'SP' },
  { key: 'SP3', label: 'Starter 3', short: 'SP', type: 'SP' },
  { key: 'RP1', label: 'Reliever 1', short: 'RP', type: 'RP' },
  { key: 'RP2', label: 'Reliever 2', short: 'RP', type: 'RP' },
]
const LINEUP_KEYS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH']

type Data = { hitters: HSHitter[]; pitchers: HSPitcher[]; leagueOps: number; leagueEra: number }
type Mode = 'free' | 'blind'
type Phase = 'start' | 'draft' | 'result'
type Filled = Record<string, HSHitter | HSPitcher>
type SeriesResult = { a: number; b: number; won: boolean }
type Sim = {
  cutoff: number; wins: number; losses: number; madePlayoffs: boolean
  semi: SeriesResult | null; final: SeriesResult | null; champion: boolean
  rs: number; staffEra: number; lineupOps: number
}

const isPitcher = (x: HSHitter | HSPitcher): x is HSPitcher => 'era' in x
const pkey = (p: { teamId: string; name: string }) => `${p.teamId}|${p.name}`
const fmt3 = (v: number) => v.toFixed(3).replace(/^0\./, '.')
const winP = (rs: number, ra: number) => { const e = 1.83; const a = rs ** e, b = ra ** e; return a / (a + b) }
function simSeries(p: number, need: number): SeriesResult {
  let a = 0, b = 0
  while (a < need && b < need) (Math.random() < p ? a++ : b++)
  return { a, b, won: a >= need }
}
function domColor(pct: number) {
  if (pct >= 0.85) return '#22c55e'
  if (pct >= 0.65) return '#84cc16'
  if (pct >= 0.45) return '#eab308'
  if (pct >= 0.25) return '#f97316'
  return '#ef4444'
}

// ── Roster board ──────────────────────────────────────────────────────────────
function SlotCard({ slot, player, active, blind }: { slot: Slot; player?: HSHitter | HSPitcher; active: boolean; blind: boolean }) {
  const filled = !!player
  const accent = player ? teamAccent(player.teamId) : 'var(--border)'
  return (
    <div
      className={`rounded-xl px-2.5 py-2 border transition-all ${
        filled ? 'bg-[var(--card-hover)] border-transparent' : active ? 'border-[var(--accent)] bg-[var(--accent)]/10 animate-pulse' : 'border-dashed border-[var(--border)] bg-[var(--card)]'
      }`}
      style={filled ? { borderLeft: `3px solid ${accent}` } : undefined}
    >
      <p className="font-display font-800 text-[10px] uppercase tracking-widest" style={{ color: active && !filled ? 'var(--accent)' : 'var(--muted)' }}>{slot.short}</p>
      {filled ? (
        <>
          <p className="font-display font-800 text-white text-xs uppercase leading-tight truncate">{player!.name}</p>
          <p className="font-display font-700 text-[10px] leading-none mt-0.5" style={{ color: accent }}>
            {TEAM_SHORT[player!.teamId]}{!blind && ' · ' + (isPitcher(player!) ? `${player!.era.toFixed(2)} ERA` : `${fmt3((player as HSHitter).ops)} OPS`)}
          </p>
        </>
      ) : (
        <p className="font-display font-700 text-[10px] text-[var(--muted)]/60 uppercase leading-tight mt-0.5 truncate">{slot.label}</p>
      )}
    </div>
  )
}

function RosterBoard({ filled, activeKey, blind }: { filled: Filled; activeKey: string | null; blind: boolean }) {
  const group = (title: string, keys: string[]) => (
    <div>
      <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1.5">{title}</p>
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-1.5">
        {keys.map(k => {
          const slot = SLOTS.find(s => s.key === k)!
          return <SlotCard key={k} slot={slot} player={filled[k]} active={activeKey === k} blind={blind} />
        })}
      </div>
    </div>
  )
  return (
    <div className="space-y-3">
      {group('Lineup', LINEUP_KEYS)}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {group('Rotation', ['SP1', 'SP2', 'SP3'])}
        {group('Bullpen', ['RP1', 'RP2'])}
      </div>
    </div>
  )
}

// ── Pick card ─────────────────────────────────────────────────────────────────
function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-display font-800 text-white text-sm tabular-nums leading-none">{value}</span>
      <span className="font-display font-700 text-[9px] text-[var(--muted)] uppercase tracking-wider">{label}</span>
    </div>
  )
}
function PickCard({ player, pct, blind, onPick }: { player: HSHitter | HSPitcher; pct: number; blind: boolean; onPick?: () => void }) {
  const pit = isPitcher(player)
  return (
    <button onClick={onPick} disabled={!onPick}
      className={`w-full text-left bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 transition-colors ${onPick ? 'hover:border-[var(--accent)] cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="font-display font-800 uppercase text-white text-sm leading-tight truncate">{player.name}</p>
        <span className="font-display font-800 text-[10px] px-1.5 py-0.5 rounded text-white shrink-0" style={{ backgroundColor: TEAM_COLORS[player.teamId] ?? '#1e335a' }}>{TEAM_SHORT[player.teamId]}</span>
      </div>
      {blind ? (
        <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest py-2">Stats hidden</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-1 mb-2">
            {pit ? (<>
              <StatMini label="ERA" value={player.era.toFixed(2)} />
              <StatMini label="WHIP" value={player.whip.toFixed(2)} />
              <StatMini label="K" value={String(player.so)} />
              <StatMini label="IP" value={player.ip.toFixed(0)} />
            </>) : (<>
              <StatMini label="AVG" value={fmt3(player.avg)} />
              <StatMini label="OPS" value={fmt3(player.ops)} />
              <StatMini label="HR" value={String(player.hr)} />
              <StatMini label="RBI" value={String(player.rbi)} />
            </>)}
          </div>
          {!pit && player.positions.length > 0 && (
            <p className="font-display font-700 text-[9px] text-[var(--muted)] uppercase tracking-wider mb-2">Plays: {player.positions.join(' · ')}</p>
          )}
          <div className="h-1.5 rounded-full bg-[var(--card-hover)] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.max(6, pct * 100)}%`, backgroundColor: domColor(pct) }} />
          </div>
        </>
      )}
    </button>
  )
}

// ── Slot machine ──────────────────────────────────────────────────────────────
function TeamReel({ teamId, spinning }: { teamId: string; spinning: boolean }) {
  const color = TEAM_COLORS[teamId] ?? '#1e335a'
  return (
    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-[var(--border)] transition-transform duration-100" style={{ backgroundColor: color, transform: spinning ? 'scale(0.97)' : 'scale(1)' }}>
      <div className="w-10 h-10 flex items-center justify-center">
        {TEAM_LOGOS[teamId] ? <Image src={TEAM_LOGOS[teamId]} alt={teamId} width={40} height={40} className="object-contain w-full h-full" /> : <span className="font-display font-800 text-white">{TEAM_SHORT[teamId]}</span>}
      </div>
      <span className="font-display font-800 italic uppercase text-white text-lg">{TEAM_NAMES[teamId] ?? teamId}</span>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function WinTheSeriesGame() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState(false)
  const [phase, setPhase] = useState<Phase>('start')
  const [mode, setMode] = useState<Mode>('free')

  const [filled, setFilled] = useState<Filled>({})
  const [idx, setIdx] = useState(0)
  const [dealt, setDealt] = useState<string>(TEAM_IDS[0])
  const [spinning, setSpinning] = useState(false)
  const [cutoff, setCutoff] = useState(24)
  const [sim, setSim] = useState<Sim | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/win-the-series').then(r => r.json()).then((d: Data) => {
      if (d?.hitters?.length && d?.pitchers?.length) setData(d); else setError(true)
    }).catch(() => setError(true))
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [])

  const picked = useMemo(() => new Set(Object.values(filled).map(pkey)), [filled])
  const opsSorted = useMemo(() => (data?.hitters ?? []).map(h => h.ops).sort((a, b) => a - b), [data])
  const eraSorted = useMemo(() => (data?.pitchers ?? []).map(p => p.era).sort((a, b) => a - b), [data])
  const hitPct = (ops: number) => opsSorted.length < 2 ? 0.5 : opsSorted.filter(o => o < ops).length / (opsSorted.length - 1)
  const pitPct = (era: number) => eraSorted.length < 2 ? 0.5 : eraSorted.filter(e => e > era).length / (eraSorted.length - 1) // lower ERA = higher dominance

  const eligibleForSlot = useCallback((slot: Slot): (HSHitter | HSPitcher)[] => {
    if (!data) return []
    if (slot.type === 'SP' || slot.type === 'RP') return data.pitchers.filter(p => p.role === slot.type && !picked.has(pkey(p)))
    if (slot.type === 'dh') return data.hitters.filter(h => !picked.has(pkey(h)))
    return data.hitters.filter(h => h.positions.includes(slot.pos!) && !picked.has(pkey(h)))
  }, [data, picked])

  const teamsFor = useCallback((slot: Slot) => {
    const elig = eligibleForSlot(slot)
    return TEAM_IDS.filter(t => elig.some(p => p.teamId === t))
  }, [eligibleForSlot])

  const dealTeam = useCallback((slot: Slot, exclude?: string) => {
    let teams = teamsFor(slot)
    if (teams.length > 1 && exclude) teams = teams.filter(t => t !== exclude)
    if (!teams.length) return
    const final = teams[Math.floor(Math.random() * teams.length)]
    setSpinning(true)
    let delay = 55
    const step = () => {
      setDealt(TEAM_IDS[Math.floor(Math.random() * TEAM_IDS.length)])
      delay *= 1.3
      if (delay < 360) timer.current = setTimeout(step, delay)
      else { setDealt(final); setSpinning(false) }
    }
    step()
  }, [teamsFor])

  // Deal a team whenever the active slot changes — reads fresh picked/eligibility.
  useEffect(() => {
    if (phase !== 'draft') return
    dealTeam(SLOTS[idx])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, phase])

  const start = (m: Mode) => {
    setMode(m); setFilled({}); setIdx(0); setSim(null)
    setCutoff(CUTOFF_MIN + Math.floor(Math.random() * (CUTOFF_MAX - CUTOFF_MIN + 1)))
    setPhase('draft')
  }

  const runSim = (f: Filled, cut: number) => {
    const hitters = LINEUP_KEYS.map(k => f[k] as HSHitter)
    const sp = ['SP1', 'SP2', 'SP3'].map(k => f[k] as HSPitcher)
    const rp = ['RP1', 'RP2'].map(k => f[k] as HSPitcher)
    const lineupOps = hitters.reduce((s, h) => s + h.ops, 0) / hitters.length
    const rs = data!.leagueEra * (lineupOps / data!.leagueOps) ** 2
    const spEra = sp.reduce((s, p) => s + p.era, 0) / sp.length
    const rpEra = rp.reduce((s, p) => s + p.era, 0) / rp.length
    const staffEra = Math.max(RA_FLOOR, 0.7 * spEra + 0.3 * rpEra)

    let wins = 0
    const pReg = winP(rs, staffEra * STAGE_MULT.reg)
    for (let i = 0; i < REG_GAMES; i++) if (Math.random() < pReg) wins++
    const madePlayoffs = wins >= cut
    let semi: SeriesResult | null = null, fin: SeriesResult | null = null, champion = false
    if (madePlayoffs) {
      semi = simSeries(winP(rs, staffEra * STAGE_MULT.semi), SEMI_WINS)
      if (semi.won) { fin = simSeries(winP(rs, staffEra * STAGE_MULT.final), FINAL_WINS); champion = fin.won }
    }
    setSim({ cutoff: cut, wins, losses: REG_GAMES - wins, madePlayoffs, semi, final: fin, champion, rs, staffEra, lineupOps })
    setPhase('result')
  }

  const pick = (player: HSHitter | HSPitcher) => {
    if (spinning) return
    const slot = SLOTS[idx]
    const next = { ...filled, [slot.key]: player }
    setFilled(next)
    if (idx + 1 >= SLOTS.length) { runSim(next, cutoff); return }
    setIdx(idx + 1) // the deal effect fires on the index change
  }

  if (error) return <Shell><p className="text-center font-display font-700 text-[var(--muted)] uppercase py-20">Kon spelersdata niet laden. Probeer later opnieuw.</p></Shell>
  if (!data) return <Shell><p className="text-center font-display font-700 text-[var(--muted)] uppercase py-20 animate-pulse">Loading players…</p></Shell>

  // ── Start ──
  if (phase === 'start') {
    return (
      <Shell>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 md:p-8 max-w-xl mx-auto text-center">
          <p className="font-display font-700 text-[var(--muted)] text-sm leading-relaxed mb-6">
            The slot machine deals you a team for every roster spot. Pick a player from that team who actually played the position this season — build a full lineup (9 fielders), a rotation (3 starters) and a bullpen (2 relievers) from real regular-season stats. Then your team plays a season: reach the playoffs, take the semifinal and win the Holland Series.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-8 text-left">
            <Info n="9 + 5" l="Fielders + pitchers" />
            <Info n="Semifinal" l="Best of 5" />
            <Info n="Holland Series" l="Best of 7" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => start('free')} className="font-display font-800 uppercase tracking-wider bg-[var(--accent)] text-white px-6 py-3 rounded-xl hover:opacity-90 transition-opacity">Play — Free</button>
            <button onClick={() => start('blind')} className="font-display font-800 uppercase tracking-wider bg-[var(--card-hover)] border border-[var(--border)] text-white px-6 py-3 rounded-xl hover:border-[var(--accent)] transition-colors">Play — Blind Mode</button>
          </div>
          <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mt-4">Blind mode hides all stats while you draft · the playoff line shifts each game</p>
        </div>
      </Shell>
    )
  }

  // ── Draft ──
  if (phase === 'draft') {
    const slot = SLOTS[idx]
    const available = eligibleForSlot(slot).filter(p => p.teamId === dealt)
    return (
      <Shell>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <p className="font-display font-800 text-[10px] uppercase tracking-widest text-[var(--muted)]">Pick {idx + 1}/{SLOTS.length} · {cutoff} wins for the playoffs</p>
          {mode === 'blind' && <span className="font-display font-800 text-[10px] uppercase tracking-widest text-[var(--accent)] border border-[var(--accent)]/40 rounded-lg px-2 py-1">Blind</span>}
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 mb-6"><RosterBoard filled={filled} activeKey={slot.key} blind={mode === 'blind'} /></div>

        <div className="flex flex-col items-center gap-3 mb-5">
          <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest">Now drafting</p>
          <p className="font-display font-800 italic text-3xl uppercase text-white -mt-1"><strong>{slot.label}</strong></p>
          <TeamReel teamId={dealt} spinning={spinning} />
          <button onClick={() => dealTeam(slot, dealt)} disabled={spinning || teamsFor(slot).length <= 1}
            className="font-display font-800 text-xs uppercase tracking-wider bg-[var(--card)] border border-[var(--border)] text-white px-3 py-2 rounded-lg hover:border-[var(--accent)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            ↻ Deal another team
          </button>
        </div>

        {!spinning && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {available.map(p => (
              <PickCard key={pkey(p)} player={p} pct={isPitcher(p) ? pitPct(p.era) : hitPct(p.ops)} blind={mode === 'blind'} onPick={() => pick(p)} />
            ))}
          </div>
        )}
      </Shell>
    )
  }

  // ── Result ──
  const s = sim!
  const outcome = s.champion ? '🏆 Holland Series Champions!'
    : s.final ? `Runner-up — lost the Holland Series ${s.final.a}-${s.final.b}`
    : s.semi ? `Eliminated in the playoffs ${s.semi.a}-${s.semi.b}`
    : `Missed the playoffs — ${s.wins}-${s.losses}`
  return (
    <Shell>
      <div className={`rounded-2xl p-6 md:p-8 mb-6 text-center border ${s.champion ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] bg-[var(--card)]'}`}>
        <p className="font-display font-800 italic text-3xl md:text-4xl uppercase text-white leading-tight"><strong>{outcome}</strong></p>
        <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest mt-3">
          {s.rs.toFixed(1)} runs scored/game · {s.staffEra.toFixed(2)} staff ERA · lineup OPS {fmt3(s.lineupOps)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        <Stage title="Regular Season" score={`${s.wins}-${s.losses}`} ok={s.madePlayoffs} note={s.madePlayoffs ? 'Clinched a playoff spot' : `Needed ${s.cutoff} wins`} />
        <Stage title="Playoffs · Semifinal" score={s.semi ? `${s.semi.a}-${s.semi.b}` : '—'} ok={!!s.semi?.won} dim={!s.madePlayoffs} note={!s.madePlayoffs ? 'Did not qualify' : s.semi?.won ? 'Advanced' : 'Eliminated'} />
        <Stage title="Holland Series" score={s.final ? `${s.final.a}-${s.final.b}` : '—'} ok={s.champion} dim={!s.semi?.won} note={!s.semi?.won ? 'Did not reach' : s.champion ? 'Champions!' : 'Lost the final'} />
      </div>

      <p className="font-display font-700 text-[var(--muted)] text-xs uppercase tracking-widest mb-3">Your team</p>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 mb-8"><RosterBoard filled={filled} activeKey={null} blind={false} /></div>

      <div className="flex justify-center">
        <button onClick={() => setPhase('start')} className="font-display font-800 uppercase tracking-wider bg-[var(--accent)] text-white px-8 py-3 rounded-xl hover:opacity-90 transition-opacity">Play again</button>
      </div>
    </Shell>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
      <div className="mb-6">
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">Postseason Game</p>
        <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white"><strong>Win the</strong><span className="text-[var(--accent)]"> Holland Series</span></h1>
      </div>
      {children}
    </div>
  )
}
function Info({ n, l }: { n: string; l: string }) {
  return <div className="bg-[var(--card-hover)] rounded-xl px-3 py-2"><p className="font-display font-800 text-white text-sm uppercase leading-none">{n}</p><p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-wider mt-1">{l}</p></div>
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
