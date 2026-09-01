'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { TEAM_IDS, TEAM_NAMES, TEAM_SHORT, TEAM_LOGOS, TEAM_COLORS, teamAccent } from '@/lib/teams'
import type { HSHitter, HSPitcher } from '@/app/api/win-the-series/route'

// ── Config ────────────────────────────────────────────────────────────────────
const REG_GAMES = 42
const CUTOFF_MIN = 28, CUTOFF_MAX = 31   // playoff line varies per game, fixed within a game
const SEMI_WINS = 3                      // best-of-5
const FINAL_WINS = 4                     // best-of-7
const RA_FLOOR = 3.6                      // a 5-man staff regresses over a full season
const OFF_EXP = 1.55                      // run scaling vs offense (kept realistic, not explosive)
const OPP_SEMI = 0.72                     // semifinal opponent — a top playoff team
const OPP_FINAL = 0.84                    // Holland Series opponent — the league's best
const SKIPS = 3

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
const SP_KEYS = ['SP1', 'SP2', 'SP3']
const RP_KEYS = ['RP1', 'RP2']
const FIELD_SECTIONS = [
  { pos: 'C', title: 'Catchers' }, { pos: '1B', title: 'First Base' }, { pos: '2B', title: 'Second Base' },
  { pos: '3B', title: 'Third Base' }, { pos: 'SS', title: 'Shortstop' }, { pos: 'LF', title: 'Left Field' },
  { pos: 'CF', title: 'Center Field' }, { pos: 'RF', title: 'Right Field' },
]

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
// log5: probability team A (win% a) beats team B (win% b) head-to-head.
const log5 = (a: number, b: number) => { const d = a + b - 2 * a * b; return d <= 0 ? 0.5 : (a - a * b) / d }
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
const firstOpen = (keys: string[], filled: Filled) => keys.find(k => !filled[k]) ?? null
// Open positions a hitter can still be assigned to (their field spots + DH).
const openHitterSlots = (h: HSHitter, filled: Filled) =>
  [...h.positions.filter(p => !filled[p]), ...(!filled['DH'] ? ['DH'] : [])]

// ── Roster board ──────────────────────────────────────────────────────────────
function SlotCard({ slot, player, blind }: { slot: Slot; player?: HSHitter | HSPitcher; blind: boolean }) {
  const filled = !!player
  const accent = player ? teamAccent(player.teamId) : 'var(--border)'
  return (
    <div className={`rounded-xl px-2.5 py-2 border transition-all ${filled ? 'bg-[var(--card-hover)] border-transparent' : 'border-dashed border-[var(--border)] bg-[var(--card)]'}`}
      style={filled ? { borderLeft: `3px solid ${accent}` } : undefined}>
      <p className="font-display font-800 text-[10px] uppercase tracking-widest text-[var(--muted)]">{slot.short}</p>
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
function RosterBoard({ filled, blind }: { filled: Filled; blind: boolean }) {
  const group = (title: string, keys: string[]) => (
    <div>
      <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1.5">{title}</p>
      <div className="grid grid-cols-3 gap-1.5">{keys.map(k => <SlotCard key={k} slot={SLOTS.find(s => s.key === k)!} player={filled[k]} blind={blind} />)}</div>
    </div>
  )
  return (
    <div className="space-y-3">
      {group('Lineup', LINEUP_KEYS)}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{group('Rotation', SP_KEYS)}{group('Bullpen', RP_KEYS)}</div>
    </div>
  )
}

// ── Player row (in a position section) ────────────────────────────────────────
function PlayerRow({ player, pct, blind, disabled, onClick }: { player: HSHitter | HSPitcher; pct: number; blind: boolean; disabled: boolean; onClick: () => void }) {
  const pit = isPitcher(player)
  const head = pit ? player.era.toFixed(2) : fmt3(player.ops)
  const headLabel = pit ? 'ERA' : 'OPS'
  const strip: [string, string | number][] = pit
    ? [['W', player.w], ['SV', player.sv], ['WHIP', player.whip.toFixed(2)], ['K', player.so]]
    : [['AVG', fmt3(player.avg)], ['HR', player.hr], ['RBI', player.rbi], ['SB', player.sb]]
  return (
    <button onClick={onClick} disabled={disabled}
      className={`group w-full text-left rounded-lg border px-3 py-2.5 transition-all ${disabled ? 'opacity-40 cursor-not-allowed border-[var(--border)]' : 'bg-[var(--card)] border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--card-hover)]'}`}
      style={!disabled ? { borderLeft: `3px solid ${teamAccent(player.teamId)}` } : undefined}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-display font-800 text-[10px] px-1.5 py-0.5 rounded text-white shrink-0" style={{ backgroundColor: TEAM_COLORS[player.teamId] ?? '#1e335a' }}>{TEAM_SHORT[player.teamId]}</span>
          <span className="font-display font-800 uppercase text-white text-sm truncate">{player.name}</span>
        </div>
        {!blind && (
          <div className="flex items-baseline gap-1 shrink-0">
            <span className="font-display font-800 text-white text-base tabular-nums leading-none">{head}</span>
            <span className="font-display font-700 text-[9px] text-[var(--muted)] uppercase">{headLabel}</span>
          </div>
        )}
      </div>
      {!blind && (
        <div className="flex items-center gap-3 mt-2">
          {strip.map(([l, v]) => (
            <span key={l} className="flex items-baseline gap-1">
              <span className="font-display font-800 text-white/90 text-xs tabular-nums leading-none">{v}</span>
              <span className="font-display font-700 text-[8px] text-[var(--muted)] uppercase tracking-wider">{l}</span>
            </span>
          ))}
          <span className="ml-auto w-12 h-1 rounded-full bg-[var(--card-hover)] overflow-hidden hidden sm:block"><span className="block h-full rounded-full" style={{ width: `${Math.max(8, pct * 100)}%`, backgroundColor: domColor(pct) }} /></span>
        </div>
      )}
    </button>
  )
}

// ── Slot machine ──────────────────────────────────────────────────────────────
function TeamReel({ teamId, spinning }: { teamId: string; spinning: boolean }) {
  const color = TEAM_COLORS[teamId] ?? '#1e335a'
  return (
    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-[var(--border)] transition-transform duration-100" style={{ backgroundColor: color, transform: spinning ? 'scale(0.97)' : 'scale(1)' }}>
      <div className="w-10 h-10 flex items-center justify-center">{TEAM_LOGOS[teamId] ? <Image src={TEAM_LOGOS[teamId]} alt={teamId} width={40} height={40} className="object-contain w-full h-full" /> : <span className="font-display font-800 text-white">{TEAM_SHORT[teamId]}</span>}</div>
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
  const [dealt, setDealt] = useState<string>(TEAM_IDS[0])
  const [spinning, setSpinning] = useState(false)
  const [cutoff, setCutoff] = useState(24)
  const [skips, setSkips] = useState(SKIPS)
  const [dealNonce, setDealNonce] = useState(0)
  const [choosing, setChoosing] = useState<HSHitter | null>(null)
  const [sim, setSim] = useState<Sim | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/win-the-series').then(r => r.json()).then((d: Data) => {
      if (d?.hitters?.length && d?.pitchers?.length) setData(d); else setError(true)
    }).catch(() => setError(true))
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [])

  const picked = useMemo(() => new Set(Object.values(filled).map(pkey)), [filled])
  const pickCount = Object.keys(filled).length
  const opsSorted = useMemo(() => (data?.hitters ?? []).map(h => h.ops).sort((a, b) => a - b), [data])
  const eraSorted = useMemo(() => (data?.pitchers ?? []).map(p => p.era).sort((a, b) => a - b), [data])
  const hitPct = (ops: number) => opsSorted.length < 2 ? 0.5 : opsSorted.filter(o => o < ops).length / (opsSorted.length - 1)
  const pitPct = (era: number) => eraSorted.length < 2 ? 0.5 : eraSorted.filter(e => e > era).length / (eraSorted.length - 1)

  const teamPlayers = useCallback((t: string): (HSHitter | HSPitcher)[] => {
    if (!data) return []
    return [...data.hitters, ...data.pitchers].filter(p => p.teamId === t && !picked.has(pkey(p)))
  }, [data, picked])

  const canPick = useCallback((p: HSHitter | HSPitcher) => {
    if (isPitcher(p)) return (p.role === 'SP' ? SP_KEYS : RP_KEYS).some(k => !filled[k])
    return openHitterSlots(p, filled).length > 0
  }, [filled])

  const teamsWithPick = useCallback(() => {
    if (!data) return [] as string[]
    return TEAM_IDS.filter(t => teamPlayers(t).some(canPick))
  }, [data, teamPlayers, canPick])

  const dealTeam = useCallback((exclude?: string) => {
    let teams = teamsWithPick()
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
  }, [teamsWithPick])

  useEffect(() => {
    if (phase !== 'draft' || pickCount >= SLOTS.length) return
    dealTeam()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealNonce, phase])

  const runSim = (f: Filled, cut: number) => {
    const hitters = LINEUP_KEYS.map(k => f[k] as HSHitter)
    const sp = SP_KEYS.map(k => f[k] as HSPitcher)
    const rp = RP_KEYS.map(k => f[k] as HSPitcher)
    const lineupOps = hitters.reduce((s, h) => s + h.ops, 0) / hitters.length
    const rs = data!.leagueEra * (lineupOps / data!.leagueOps) ** OFF_EXP
    const spEra = sp.reduce((s, p) => s + p.era, 0) / sp.length
    const rpEra = rp.reduce((s, p) => s + p.era, 0) / rp.length
    const staffEra = Math.max(RA_FLOOR, 0.7 * spEra + 0.3 * rpEra)
    const talent = winP(rs, staffEra)               // your win% vs a league-average team
    let wins = 0
    for (let i = 0; i < REG_GAMES; i++) if (Math.random() < talent) wins++
    const madePlayoffs = wins >= cut
    let semi: SeriesResult | null = null, fin: SeriesResult | null = null, champion = false
    if (madePlayoffs) {
      semi = simSeries(log5(talent, OPP_SEMI), SEMI_WINS)
      if (semi.won) { fin = simSeries(log5(talent, OPP_FINAL), FINAL_WINS); champion = fin.won }
    }
    setSim({ cutoff: cut, wins, losses: REG_GAMES - wins, madePlayoffs, semi, final: fin, champion, rs, staffEra, lineupOps })
    setPhase('result')
  }

  const assign = (player: HSHitter | HSPitcher, slotKey: string) => {
    if (filled[slotKey]) return
    const next = { ...filled, [slotKey]: player }
    setFilled(next); setChoosing(null)
    if (Object.keys(next).length >= SLOTS.length) runSim(next, cutoff)
    else setDealNonce(n => n + 1)
  }

  const clickPlayer = (p: HSHitter | HSPitcher) => {
    if (spinning || !canPick(p)) return
    if (isPitcher(p)) { const k = firstOpen(p.role === 'SP' ? SP_KEYS : RP_KEYS, filled); if (k) assign(p, k); return }
    const opts = openHitterSlots(p, filled)
    if (opts.length === 1) assign(p, opts[0])
    else setChoosing(p) // multi-position → let the user pick where
  }

  const reroll = () => {
    if (skips <= 0 || spinning || teamsWithPick().length <= 1) return
    setSkips(s => s - 1); dealTeam(dealt)
  }

  const start = (m: Mode) => {
    setMode(m); setFilled({}); setSim(null); setChoosing(null); setSkips(SKIPS)
    setCutoff(CUTOFF_MIN + Math.floor(Math.random() * (CUTOFF_MAX - CUTOFF_MIN + 1)))
    setPhase('draft'); setDealNonce(n => n + 1)
  }

  if (error) return <Shell><p className="text-center font-display font-700 text-[var(--muted)] uppercase py-20">Kon spelersdata niet laden. Probeer later opnieuw.</p></Shell>
  if (!data) return <Shell><p className="text-center font-display font-700 text-[var(--muted)] uppercase py-20 animate-pulse">Loading players…</p></Shell>

  // ── Start ──
  if (phase === 'start') {
    return (
      <Shell>
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 mb-8">
            {['Draft', 'Playoffs', 'Title'].map((step, i) => (
              <span key={step} className="flex items-center gap-2">
                <span className={`font-display font-800 uppercase text-sm tracking-wider ${i === 2 ? 'text-[var(--accent)]' : 'text-white'}`}>{step}</span>
                {i < 2 && <span className="text-[var(--muted)]">→</span>}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mb-8">
            <Info n="9 + 5" l="Roster" /><Info n="Bo5" l="Semifinal" /><Info n="Bo7" l="Holland Series" />
          </div>
          <div className="flex flex-col gap-2.5">
            <button onClick={() => start('free')} className="font-display font-800 uppercase tracking-widest bg-[var(--accent)] text-white px-6 py-4 rounded-xl hover:opacity-90 transition-opacity text-lg">Play</button>
            <button onClick={() => start('blind')} className="font-display font-800 uppercase tracking-widest bg-[var(--card)] border border-[var(--border)] text-white px-6 py-3 rounded-xl hover:border-[var(--accent)] transition-colors">Blind Mode</button>
          </div>
          <p className="text-center font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mt-5">{SKIPS} skips · playoff line shifts each game</p>
        </div>
      </Shell>
    )
  }

  // ── Draft ──
  if (phase === 'draft') {
    const roster = teamPlayers(dealt)
    const pctOf = (p: HSHitter | HSPitcher) => isPitcher(p) ? pitPct(p.era) : hitPct(p.ops)
    const sortH = (a: HSHitter, b: HSHitter) => b.ops - a.ops

    const sections: { title: string; slotFilled: boolean; players: (HSHitter | HSPitcher)[]; directSlot?: string }[] = []
    for (const sec of FIELD_SECTIONS) {
      const players = roster.filter(p => !isPitcher(p) && (p as HSHitter).positions.includes(sec.pos)).sort((a, b) => sortH(a as HSHitter, b as HSHitter))
      if (players.length) sections.push({ title: sec.title, slotFilled: !!filled[sec.pos], players })
    }
    // DH is a wildcard: while it's open, every available batter can be slotted there.
    if (!filled['DH']) {
      const dh = roster.filter(p => !isPitcher(p)).sort((a, b) => sortH(a as HSHitter, b as HSHitter))
      if (dh.length) sections.push({ title: 'Designated Hitter', slotFilled: false, players: dh, directSlot: 'DH' })
    }
    const sp = roster.filter(isPitcher).filter(p => p.role === 'SP').sort((a, b) => a.era - b.era)
    const rp = roster.filter(isPitcher).filter(p => p.role === 'RP').sort((a, b) => a.era - b.era)
    if (sp.length) sections.push({ title: 'Starting Pitchers', slotFilled: SP_KEYS.every(k => filled[k]), players: sp })
    if (rp.length) sections.push({ title: 'Relievers', slotFilled: RP_KEYS.every(k => filled[k]), players: rp })

    return (
      <Shell>
        {choosing && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setChoosing(null)}>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <p className="font-display font-800 uppercase text-white text-lg mb-1">{choosing.name}</p>
              <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest mb-4">Choose a position</p>
              <div className="flex flex-wrap gap-2">
                {[...choosing.positions, 'DH'].map(pos => {
                  const open = !filled[pos]
                  return open ? (
                    <button key={pos} onClick={() => assign(choosing, pos)} className="font-display font-800 text-sm uppercase tracking-wider px-4 py-2 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 transition-opacity">{pos}</button>
                  ) : (
                    <span key={pos} className="font-display font-800 text-sm uppercase tracking-wider px-4 py-2 rounded-xl bg-[var(--card-hover)] text-[var(--muted)]/50 line-through">{pos}</span>
                  )
                })}
              </div>
              <button onClick={() => setChoosing(null)} className="mt-4 font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)] hover:text-white">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <p className="font-display font-800 text-[10px] uppercase tracking-widest text-[var(--muted)]">{pickCount}/{SLOTS.length} filled · {cutoff} wins for the playoffs</p>
          {mode === 'blind' && <span className="font-display font-800 text-[10px] uppercase tracking-widest text-[var(--accent)] border border-[var(--accent)]/40 rounded-lg px-2 py-1">Blind</span>}
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 mb-6"><RosterBoard filled={filled} blind={mode === 'blind'} /></div>

        <div className="flex flex-col items-center gap-3 mb-6">
          <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest">Pick a player from</p>
          <TeamReel teamId={dealt} spinning={spinning} />
          <button onClick={reroll} disabled={spinning || skips <= 0 || teamsWithPick().length <= 1}
            className="font-display font-800 text-xs uppercase tracking-wider bg-[var(--card)] border border-[var(--border)] text-white px-3 py-2 rounded-lg hover:border-[var(--accent)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            ↻ Skip team ({skips} left)
          </button>
        </div>

        {!spinning && (
          <div className="space-y-5">
            {sections.map(sec => (
              <div key={sec.title}>
                <div className="flex items-center gap-2 mb-2">
                  <p className={`font-display font-800 text-xs uppercase tracking-widest ${sec.slotFilled ? 'text-[var(--muted)]/50' : 'text-white'}`}>{sec.title}</p>
                  {sec.slotFilled && <span className="font-display font-700 text-[9px] uppercase tracking-widest text-[var(--muted)]/50 border border-[var(--border)] rounded px-1.5 py-0.5">Filled</span>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sec.players.map(p => (
                    <PlayerRow key={pkey(p)} player={p} pct={pctOf(p)} blind={mode === 'blind'} disabled={sec.slotFilled} onClick={() => sec.directSlot ? assign(p, sec.directSlot!) : clickPlayer(p)} />
                  ))}
                </div>
              </div>
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
        <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest mt-3">{s.rs.toFixed(1)} runs scored/game · {s.staffEra.toFixed(2)} staff ERA · lineup OPS {fmt3(s.lineupOps)}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        <Stage title="Regular Season" score={`${s.wins}-${s.losses}`} ok={s.madePlayoffs} note={s.madePlayoffs ? 'Clinched a playoff spot' : `Needed ${s.cutoff} wins`} />
        <Stage title="Playoffs · Semifinal" score={s.semi ? `${s.semi.a}-${s.semi.b}` : '—'} ok={!!s.semi?.won} dim={!s.madePlayoffs} note={!s.madePlayoffs ? 'Did not qualify' : s.semi?.won ? 'Advanced' : 'Eliminated'} />
        <Stage title="Holland Series" score={s.final ? `${s.final.a}-${s.final.b}` : '—'} ok={s.champion} dim={!s.semi?.won} note={!s.semi?.won ? 'Did not reach' : s.champion ? 'Champions!' : 'Lost the final'} />
      </div>
      <p className="font-display font-700 text-[var(--muted)] text-xs uppercase tracking-widest mb-3">Your team</p>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 mb-8"><RosterBoard filled={filled} blind={false} /></div>
      <div className="flex justify-center"><button onClick={() => setPhase('start')} className="font-display font-800 uppercase tracking-wider bg-[var(--accent)] text-white px-8 py-3 rounded-xl hover:opacity-90 transition-opacity">Play again</button></div>
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
