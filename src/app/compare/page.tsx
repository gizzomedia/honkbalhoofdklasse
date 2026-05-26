'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES } from '@/lib/teams'
import type { CmpPlayer } from '@/app/api/compare/route'

// ── Radar chart config ────────────────────────────────────────────────────────

const RADAR_AXES: { key: keyof CmpPlayer; label: string }[] = [
  { key: 'avg', label: 'AVG'  },
  { key: 'ops', label: 'OPS'  },
  { key: 'hr',  label: 'HR'   },
  { key: 'rbi', label: 'RBI'  },
  { key: 'sb',  label: 'SB'   },
]

function percentile(player: CmpPlayer, key: keyof CmpPlayer, all: CmpPlayer[]): number {
  const val = player[key] as number
  const below = all.filter(p => (p[key] as number) < val).length
  return all.length > 1 ? below / (all.length - 1) : 0
}

function radarPoints(player: CmpPlayer, all: CmpPlayer[], cx: number, cy: number, R: number): string {
  return RADAR_AXES.map(({ key }, i) => {
    const pct = percentile(player, key, all)
    const angle = (2 * Math.PI * i) / RADAR_AXES.length - Math.PI / 2
    const r = Math.max(pct * R, 4)
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
  }).join(' ')
}

function gridPoints(level: number, cx: number, cy: number, R: number): string {
  return RADAR_AXES.map((_, i) => {
    const angle = (2 * Math.PI * i) / RADAR_AXES.length - Math.PI / 2
    return `${cx + level * R * Math.cos(angle)},${cy + level * R * Math.sin(angle)}`
  }).join(' ')
}

function RadarChart({ p1, p2, all }: { p1: CmpPlayer; p2: CmpPlayer; all: CmpPlayer[] }) {
  const SIZE = 280
  const cx   = SIZE / 2
  const cy   = SIZE / 2
  const R    = 100
  const c1   = TEAM_COLORS[p1.teamId] ?? '#fe3d00'
  const c2   = TEAM_COLORS[p2.teamId] ?? '#3b82f6'

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="overflow-visible">
      {/* Grid polygons */}
      {[0.25, 0.5, 0.75, 1].map(lvl => (
        <polygon key={lvl} points={gridPoints(lvl, cx, cy, R)}
          fill="none" stroke="white" strokeOpacity={0.08} strokeWidth={1} />
      ))}

      {/* Axis lines */}
      {RADAR_AXES.map((_, i) => {
        const angle = (2 * Math.PI * i) / RADAR_AXES.length - Math.PI / 2
        return (
          <line key={i}
            x1={cx} y1={cy}
            x2={cx + R * Math.cos(angle)}
            y2={cy + R * Math.sin(angle)}
            stroke="white" strokeOpacity={0.12} strokeWidth={1} />
        )
      })}

      {/* Player 2 polygon (behind) */}
      <polygon points={radarPoints(p2, all, cx, cy, R)}
        fill={c2} fillOpacity={0.18} stroke={c2} strokeWidth={2} strokeOpacity={0.8} />

      {/* Player 1 polygon (front) */}
      <polygon points={radarPoints(p1, all, cx, cy, R)}
        fill={c1} fillOpacity={0.22} stroke={c1} strokeWidth={2.5} strokeOpacity={0.9} />

      {/* Axis labels */}
      {RADAR_AXES.map(({ label }, i) => {
        const angle = (2 * Math.PI * i) / RADAR_AXES.length - Math.PI / 2
        const lx = cx + (R + 20) * Math.cos(angle)
        const ly = cy + (R + 20) * Math.sin(angle)
        return (
          <text key={i} x={lx} y={ly}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={11} fontWeight="800" fill="white" fillOpacity={0.7}
            fontFamily="var(--font-display, monospace)"
            style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}

// ── Stats table ───────────────────────────────────────────────────────────────

type StatRow = {
  label: string
  key: keyof CmpPlayer
  fmt?: (v: number) => string
  lowerBetter?: boolean
}

const STAT_ROWS: StatRow[] = [
  { label: 'AVG',  key: 'avg',    fmt: v => v.toFixed(3).replace(/^0\./, '.') },
  { label: 'OBP',  key: 'obp',    fmt: v => v.toFixed(3).replace(/^0\./, '.') },
  { label: 'SLG',  key: 'slg',    fmt: v => v.toFixed(3).replace(/^0\./, '.') },
  { label: 'OPS',  key: 'ops',    fmt: v => v.toFixed(3).replace(/^0\./, '.') },
  { label: 'AB',   key: 'ab' },
  { label: 'H',    key: 'h' },
  { label: '2B',   key: 'double' },
  { label: '3B',   key: 'triple' },
  { label: 'HR',   key: 'hr' },
  { label: 'RBI',  key: 'rbi' },
  { label: 'R',    key: 'r' },
  { label: 'BB',   key: 'bb' },
  { label: 'SO',   key: 'so',   lowerBetter: true },
  { label: 'SB',   key: 'sb' },
  { label: 'CS',   key: 'cs',   lowerBetter: true },
]

function fmtStat(row: StatRow, val: number): string {
  if (row.fmt) return row.fmt(val)
  return String(val)
}

// ── Player selector ───────────────────────────────────────────────────────────

function PlayerSelector({
  players, selected, other, onSelect, label,
}: {
  players: CmpPlayer[]
  selected: CmpPlayer | null
  other: CmpPlayer | null
  onSelect: (p: CmpPlayer | null) => void
  label: string
}) {
  const [query,   setQuery]   = useState('')
  const [open,    setOpen]    = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = players
    .filter(p => other ? p.name !== other.name : true)
    .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 12)

  const color = selected ? (TEAM_COLORS[selected.teamId] ?? '#1e335a') : undefined
  const logo  = selected ? TEAM_LOGOS[selected.teamId] : undefined
  const team  = selected ? (TEAM_NAMES[selected.teamId] ?? selected.teamId) : undefined

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      {/* Trigger */}
      {selected ? (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 cursor-pointer transition-colors hover:opacity-90"
          style={{ borderColor: color, backgroundColor: `${color}18` }}
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        >
          {logo && (
            <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center p-1.5" style={{ backgroundColor: color }}>
              <Image src={logo} alt={team!} width={28} height={28} className="object-contain w-full h-full" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display font-800 text-sm text-white truncate">{selected.name}</p>
            <p className="font-display font-700 text-xs text-white/50 uppercase tracking-wider">{team}</p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onSelect(null); setQuery('') }}
            className="text-white/30 hover:text-white/70 transition-colors shrink-0 text-lg leading-none"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-[var(--border)] hover:border-white/30 text-[var(--muted)] hover:text-white transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          <span className="font-display font-700 text-sm uppercase tracking-wider">{label}</span>
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl z-50">
          <div className="p-2 border-b border-[var(--border)]">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Zoek speler…"
              className="w-full bg-transparent px-3 py-2 font-display font-700 text-sm text-white placeholder:text-white/30 outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-4 py-3 font-display font-700 text-xs text-[var(--muted)] uppercase tracking-wider">Geen spelers gevonden</p>
            )}
            {filtered.map(p => {
              const c = TEAM_COLORS[p.teamId] ?? '#1e335a'
              const l = TEAM_LOGOS[p.teamId]
              const t = TEAM_NAMES[p.teamId] ?? p.teamId
              return (
                <button
                  key={p.name}
                  onClick={() => { onSelect(p); setQuery(''); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--card-hover)] transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center p-1" style={{ backgroundColor: c }}>
                    {l
                      ? <Image src={l} alt={t} width={20} height={20} className="object-contain w-full h-full" />
                      : <span className="text-[8px] font-display font-800 text-white">{p.teamId.slice(0, 3).toUpperCase()}</span>
                    }
                  </div>
                  <div>
                    <p className="font-display font-800 text-sm text-white">{p.name}</p>
                    <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-wider">{t}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const router       = useSearchParams()
  const nav          = useRouter()
  const [players, setPlayers] = useState<CmpPlayer[]>([])
  const [p1,      setP1]      = useState<CmpPlayer | null>(null)
  const [p2,      setP2]      = useState<CmpPlayer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/compare')
      .then(r => r.json())
      .then((data: CmpPlayer[]) => {
        setPlayers(data)
        const a = router.get('a')
        const b = router.get('b')
        if (a) setP1(data.find(p => p.name === a) ?? null)
        if (b) setP2(data.find(p => p.name === b) ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [router])

  const updateUrl = useCallback((np1: CmpPlayer | null, np2: CmpPlayer | null) => {
    const params = new URLSearchParams()
    if (np1) params.set('a', np1.name)
    if (np2) params.set('b', np2.name)
    nav.replace(`/compare${params.size ? '?' + params.toString() : ''}`, { scroll: false })
  }, [nav])

  function selectP1(p: CmpPlayer | null) { setP1(p); updateUrl(p, p2) }
  function selectP2(p: CmpPlayer | null) { setP2(p); updateUrl(p1, p) }

  const both = p1 && p2

  const c1 = p1 ? (TEAM_COLORS[p1.teamId] ?? '#fe3d00') : '#fe3d00'
  const c2 = p2 ? (TEAM_COLORS[p2.teamId] ?? '#3b82f6') : '#3b82f6'

  return (
    <div className="max-w-3xl mx-auto px-4 pt-28 pb-16">

      {/* Header */}
      <div className="text-center mb-8">
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-xs mb-1">Honkbal Hoofdklasse</p>
        <h1 className="font-display font-800 italic text-4xl uppercase text-white">
          Player <span className="text-[var(--accent)]">Comparison</span>
        </h1>
      </div>

      {/* Selectors */}
      <div className="flex gap-3 items-center mb-8">
        <PlayerSelector players={players} selected={p1} other={p2} onSelect={selectP1} label="Speler 1" />
        <div className="shrink-0 font-display font-800 text-xs text-white/20 uppercase tracking-widest">vs</div>
        <PlayerSelector players={players} selected={p2} other={p1} onSelect={selectP2} label="Speler 2" />
      </div>

      {/* Empty state */}
      {!both && !loading && (
        <div className="text-center py-20 text-[var(--muted)]">
          <p className="font-display font-700 text-sm uppercase tracking-wider">Selecteer twee spelers om te vergelijken</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-20">
          <p className="font-display font-700 text-sm uppercase text-[var(--muted)] tracking-wider animate-pulse">Laden…</p>
        </div>
      )}

      {/* Comparison */}
      {both && (
        <div className="flex flex-col gap-8">

          {/* Radar chart */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 flex flex-col items-center gap-5">
            <RadarChart p1={p1} p2={p2} all={players} />

            {/* Legend */}
            <div className="flex gap-6">
              {[{ p: p1, c: c1 }, { p: p2, c: c2 }].map(({ p, c }) => (
                <div key={p.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c }} />
                  <span className="font-display font-700 text-xs text-white/70 uppercase tracking-wider">{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats table */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_1fr] border-b border-[var(--border)]">
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderLeft: `3px solid ${c1}` }}>
                {TEAM_LOGOS[p1.teamId] && (
                  <div className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center p-1" style={{ backgroundColor: c1 }}>
                    <Image src={TEAM_LOGOS[p1.teamId]!} alt="" width={16} height={16} className="object-contain w-full h-full" />
                  </div>
                )}
                <p className="font-display font-800 text-sm text-white truncate">{p1.name}</p>
              </div>
              <div className="px-4 py-3 flex items-center justify-center">
                <span className="font-display font-700 text-[10px] uppercase tracking-widest text-[var(--muted)]">Stat</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-end gap-2" style={{ borderRight: `3px solid ${c2}` }}>
                <p className="font-display font-800 text-sm text-white truncate">{p2.name}</p>
                {TEAM_LOGOS[p2.teamId] && (
                  <div className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center p-1" style={{ backgroundColor: c2 }}>
                    <Image src={TEAM_LOGOS[p2.teamId]!} alt="" width={16} height={16} className="object-contain w-full h-full" />
                  </div>
                )}
              </div>
            </div>

            {/* Rows */}
            {STAT_ROWS.map((row, i) => {
              const v1 = p1[row.key] as number
              const v2 = p2[row.key] as number
              const p1Better = row.lowerBetter ? v1 < v2 : v1 > v2
              const p2Better = row.lowerBetter ? v2 < v1 : v2 > v1
              const tie = v1 === v2

              return (
                <div
                  key={row.key}
                  className={`grid grid-cols-[1fr_auto_1fr] ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}
                >
                  <div className="px-4 py-2.5 flex items-center">
                    <span className={`font-display font-800 text-sm tabular-nums ${
                      !tie && p1Better ? 'text-white' : 'text-white/40'
                    }`}>
                      {fmtStat(row, v1)}
                    </span>
                    {!tie && p1Better && (
                      <div className="ml-2 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c1 }} />
                    )}
                  </div>
                  <div className="px-4 py-2.5 flex items-center justify-center min-w-[52px]">
                    <span className="font-display font-700 text-[10px] uppercase tracking-widest text-[var(--muted)]">
                      {row.label}
                    </span>
                  </div>
                  <div className="px-4 py-2.5 flex items-center justify-end">
                    {!tie && p2Better && (
                      <div className="mr-2 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c2 }} />
                    )}
                    <span className={`font-display font-800 text-sm tabular-nums ${
                      !tie && p2Better ? 'text-white' : 'text-white/40'
                    }`}>
                      {fmtStat(row, v2)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Share */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                const url = window.location.href
                if (navigator.share) navigator.share({ title: `${p1.name} vs ${p2.name}`, url }).catch(() => {})
                else navigator.clipboard.writeText(url).catch(() => {})
              }}
              className="font-display font-800 text-sm uppercase tracking-wider border border-[var(--border)] text-white/60 px-6 py-3 rounded-xl hover:text-white hover:border-white/40 transition-colors"
            >
              Vergelijking delen
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
