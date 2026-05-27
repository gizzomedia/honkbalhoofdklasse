'use client'

import { useState } from 'react'
import Image from 'next/image'
import { TEAM_COLORS, TEAM_SHORT, TEAM_NAMES, TEAM_LOGOS, KNBSB_TEAM_MAP } from '@/lib/teams'
import type { Standing, KnbsbCategory, KnbsbRow } from './page'

type Props = {
  standings: Standing[]
  batting: KnbsbCategory[]
  pitching: KnbsbCategory[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const TUSSENVOEGSELS = new Set(['van', 'de', 'den', 'der', 'het', 'op', 'ten', 'ter', 't', 'vd', 'la', 'le'])

function formatDutchLast(raw: string): string {
  return raw.split(' ').map((w, i, arr) => {
    const lo = w.toLowerCase()
    if (i < arr.length - 1 && TUSSENVOEGSELS.has(lo)) return lo
    return lo.charAt(0).toUpperCase() + lo.slice(1)
  }).join(' ')
}

function parseKnbsbName(p: KnbsbRow): string {
  const html = String(p.name ?? '')
  if (html) {
    const parts = html.replace(/<[^>]+>/g, '|').split('|').map(s => s.trim()).filter(Boolean)
    if (parts.length >= 2) return `${parts[1]} ${formatDutchLast(parts[0])}`
  }
  const first = String(p.firstname ?? '').split(' ')[0]
  const last = formatDutchLast(String(p.lastname ?? ''))
  return `${first} ${last}`.trim() || 'Unknown'
}

function parseTeamId(p: KnbsbRow): string {
  const code = String(p.team_code ?? p.teamcode ?? p.team ?? '').toUpperCase()
  return KNBSB_TEAM_MAP[code] ?? code.toLowerCase()
}

function fmtPct(v: number): string {
  return v === 1 ? '1.000' : v.toFixed(3).slice(1)
}

// ── Scatter: Runs Scored vs Runs Allowed ──────────────────────────────────────

const PAD = { l: 52, r: 24, t: 24, b: 48 }
const W = 600
const H = 380

type Dot = Standing & { cx: number; cy: number }

function ScatterChart({ standings }: { standings: Standing[] }) {
  const [hovered, setHovered] = useState<string | null>(null)

  if (standings.length === 0) return <EmptyChart label="No data yet" />

  const maxR = Math.max(...standings.map(s => Math.max(s.runs_scored, s.runs_allowed)), 1)
  const domainMax = Math.ceil((maxR + 15) / 10) * 10

  const plotW = W - PAD.l - PAD.r
  const plotH = H - PAD.t - PAD.b

  function toX(v: number) { return PAD.l + (v / domainMax) * plotW }
  function toY(v: number) { return PAD.t + plotH - (v / domainMax) * plotH }

  const dots: Dot[] = standings.map(s => ({
    ...s,
    cx: toX(s.runs_scored),
    cy: toY(s.runs_allowed),
  }))

  const ticks = Array.from({ length: 5 }, (_, i) => Math.round((domainMax / 4) * i))
  const refX1 = toX(0), refY1 = toY(0)
  const refX2 = toX(domainMax), refY2 = toY(domainMax)

  const hoveredDot = dots.find(d => d.team_id === hovered)

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: 420 }}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Subtle grid */}
        {ticks.slice(1).map(t => (
          <g key={t}>
            <line x1={toX(t)} y1={PAD.t} x2={toX(t)} y2={PAD.t + plotH}
              stroke="#1e2e42" strokeWidth="1" strokeDasharray="4 4" />
            <line x1={PAD.l} y1={toY(t)} x2={PAD.l + plotW} y2={toY(t)}
              stroke="#1e2e42" strokeWidth="1" strokeDasharray="4 4" />
          </g>
        ))}

        {/* Axis lines */}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + plotH} stroke="#2a3f5a" strokeWidth="1.5" />
        <line x1={PAD.l} y1={PAD.t + plotH} x2={PAD.l + plotW} y2={PAD.t + plotH} stroke="#2a3f5a" strokeWidth="1.5" />

        {/* Axis ticks + labels */}
        {ticks.map(t => (
          <g key={`xt-${t}`}>
            <line x1={toX(t)} y1={PAD.t + plotH} x2={toX(t)} y2={PAD.t + plotH + 5} stroke="#2a3f5a" strokeWidth="1.5" />
            <text x={toX(t)} y={PAD.t + plotH + 18} textAnchor="middle"
              fontSize="11" fill="#8BA0B8" fontFamily="'Barlow Condensed', sans-serif" fontWeight="700">
              {t}
            </text>
          </g>
        ))}
        {ticks.map(t => (
          <g key={`yt-${t}`}>
            <line x1={PAD.l - 5} y1={toY(t)} x2={PAD.l} y2={toY(t)} stroke="#2a3f5a" strokeWidth="1.5" />
            <text x={PAD.l - 10} y={toY(t) + 4} textAnchor="end"
              fontSize="11" fill="#8BA0B8" fontFamily="'Barlow Condensed', sans-serif" fontWeight="700">
              {t}
            </text>
          </g>
        ))}

        {/* Axis labels */}
        <text x={PAD.l + plotW / 2} y={H - 4} textAnchor="middle"
          fontSize="11" fill="#8BA0B8" fontFamily="'Barlow Condensed', sans-serif" fontWeight="700" letterSpacing="2">
          RUNS SCORED →
        </text>
        <text x={12} y={PAD.t + plotH / 2} textAnchor="middle"
          fontSize="11" fill="#8BA0B8" fontFamily="'Barlow Condensed', sans-serif" fontWeight="700" letterSpacing="2"
          transform={`rotate(-90, 12, ${PAD.t + plotH / 2})`}>
          RUNS ALLOWED →
        </text>

        {/* Reference line RS = RA */}
        <line x1={refX1} y1={refY1} x2={refX2} y2={refY2}
          stroke="#fe3d00" strokeWidth="1" strokeDasharray="6 4" opacity="0.3" />
        <text x={toX(domainMax * 0.72)} y={toY(domainMax * 0.72) - 8}
          fontSize="10" fill="#fe3d00" opacity="0.5"
          fontFamily="'Barlow Condensed', sans-serif" fontWeight="700" letterSpacing="1">
          RS = RA
        </text>

        {/* Quadrant labels */}
        <text x={PAD.l + plotW * 0.78} y={PAD.t + plotH * 0.12}
          fontSize="10" fill="#8BA0B8" opacity="0.4"
          fontFamily="'Barlow Condensed', sans-serif" fontWeight="700" letterSpacing="1" textAnchor="middle">
          HIGH RA
        </text>
        <text x={PAD.l + plotW * 0.78} y={PAD.t + plotH * 0.88}
          fontSize="10" fill="#4ade80" opacity="0.5"
          fontFamily="'Barlow Condensed', sans-serif" fontWeight="700" letterSpacing="1" textAnchor="middle">
          BEST ZONE
        </text>

        {/* Team dots */}
        {dots.map(d => {
          const color = TEAM_COLORS[d.team_id] ?? '#fe3d00'
          const isHovered = hovered === d.team_id
          const r = isHovered ? 16 : 13
          return (
            <g key={d.team_id}
              onMouseEnter={() => setHovered(d.team_id)}
              style={{ cursor: 'pointer' }}
            >
              {isHovered && (
                <circle cx={d.cx} cy={d.cy} r={22} fill={color} opacity="0.15" />
              )}
              <circle cx={d.cx} cy={d.cy} r={r}
                fill={color}
                stroke={isHovered ? '#ffffff' : 'rgba(255,255,255,0.15)'}
                strokeWidth={isHovered ? 2 : 1}
                style={{ transition: 'r 0.15s ease' }}
              />
              <text x={d.cx} y={d.cy + 4}
                textAnchor="middle" fontSize="10"
                fill={d.team_id === 'hcaw' ? '#000000' : '#ffffff'}
                fontFamily="'Barlow Condensed', sans-serif"
                fontWeight="800"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {TEAM_SHORT[d.team_id]}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {hoveredDot && (
        <div className="absolute top-4 right-4 bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 pointer-events-none shadow-xl min-w-[160px]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: TEAM_COLORS[hoveredDot.team_id] }} />
            <p className="font-display font-800 text-sm uppercase text-white">{TEAM_SHORT[hoveredDot.team_id]}</p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between gap-6">
              <span className="font-display font-700 text-xs text-[var(--muted)] uppercase">RS</span>
              <span className="font-display font-800 text-xs text-white">{hoveredDot.runs_scored}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="font-display font-700 text-xs text-[var(--muted)] uppercase">RA</span>
              <span className="font-display font-800 text-xs text-white">{hoveredDot.runs_allowed}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="font-display font-700 text-xs text-[var(--muted)] uppercase">Diff</span>
              <span className={`font-display font-800 text-xs ${hoveredDot.runs_scored >= hoveredDot.runs_allowed ? 'text-green-400' : 'text-red-400'}`}>
                {hoveredDot.runs_scored - hoveredDot.runs_allowed > 0 ? '+' : ''}{hoveredDot.runs_scored - hoveredDot.runs_allowed}
              </span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="font-display font-700 text-xs text-[var(--muted)] uppercase">W-L</span>
              <span className="font-display font-800 text-xs text-white">{hoveredDot.wins}-{hoveredDot.losses}</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend dots */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-1">
        {standings.map(s => (
          <button key={s.team_id}
            onMouseEnter={() => setHovered(s.team_id)}
            onMouseLeave={() => setHovered(null)}
            className="flex items-center gap-1.5 group"
          >
            <div className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover:scale-125"
              style={{ backgroundColor: TEAM_COLORS[s.team_id] }} />
            <span className={`font-display font-700 text-xs uppercase tracking-wider transition-colors ${hovered === s.team_id ? 'text-white' : 'text-[var(--muted)]'}`}>
              {TEAM_SHORT[s.team_id]}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Win Percentage Bars ───────────────────────────────────────────────────────

function WinPctBars({ standings }: { standings: Standing[] }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const sorted = [...standings].sort((a, b) => b.win_pct - a.win_pct)
  const maxPct = Math.max(...sorted.map(s => s.win_pct), 0.001)

  return (
    <div className="space-y-2.5">
      {sorted.map((s, i) => {
        const color = TEAM_COLORS[s.team_id] ?? '#fe3d00'
        const pct = s.win_pct ?? 0
        const barW = (pct / maxPct) * 100
        const isHov = hovered === s.team_id

        return (
          <div key={s.team_id}
            onMouseEnter={() => setHovered(s.team_id)}
            onMouseLeave={() => setHovered(null)}
            className="group cursor-default"
          >
            <div className="flex items-center gap-3 mb-1">
              <span className="font-display font-700 text-xs text-[var(--muted)] w-4 text-right">{i + 1}</span>
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 overflow-hidden"
                style={{ backgroundColor: color }}>
                {TEAM_LOGOS[s.team_id] ? (
                  <Image src={TEAM_LOGOS[s.team_id]} alt={TEAM_SHORT[s.team_id]} width={20} height={20} className="object-contain" />
                ) : (
                  <span className="font-display font-800 text-[9px] text-white">{TEAM_SHORT[s.team_id]}</span>
                )}
              </div>
              <span className="font-display font-800 text-sm uppercase text-white w-24 shrink-0">{TEAM_SHORT[s.team_id]}</span>
              <div className="flex-1 relative h-5 rounded-full overflow-hidden bg-[#0a1220]">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${barW}%`,
                    backgroundColor: color,
                    opacity: isHov ? 1 : 0.8,
                  }}
                />
              </div>
              <span className="font-display font-800 text-sm text-white w-14 text-right shrink-0">
                {fmtPct(pct)}
              </span>
              <span className="font-display font-700 text-xs text-[var(--muted)] w-12 text-right shrink-0">
                {s.wins}–{s.losses}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Run Differential Bars ─────────────────────────────────────────────────────

function RunDiffBars({ standings }: { standings: Standing[] }) {
  const sorted = [...standings].sort((a, b) => (b.runs_scored - b.runs_allowed) - (a.runs_scored - a.runs_allowed))
  const maxAbs = Math.max(...sorted.map(s => Math.abs(s.runs_scored - s.runs_allowed)), 1)

  return (
    <div className="space-y-3">
      {sorted.map(s => {
        const diff = s.runs_scored - s.runs_allowed
        const color = TEAM_COLORS[s.team_id] ?? '#fe3d00'
        const barPct = Math.abs(diff) / maxAbs * 45

        return (
          <div key={s.team_id} className="flex items-center gap-2">
            <span className="font-display font-800 text-xs uppercase text-[var(--muted)] w-8 shrink-0 text-right">
              {TEAM_SHORT[s.team_id]}
            </span>
            <div className="flex-1 flex items-center h-5 relative">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#2a3f5a]" />
              {diff >= 0 ? (
                <div className="absolute left-1/2 top-1 bottom-1 rounded-r-full transition-all duration-700"
                  style={{ width: `${barPct}%`, backgroundColor: color, opacity: 0.85 }} />
              ) : (
                <div className="absolute right-1/2 top-1 bottom-1 rounded-l-full transition-all duration-700"
                  style={{ width: `${barPct}%`, backgroundColor: '#ef4444', opacity: 0.75 }} />
              )}
            </div>
            <span className={`font-display font-800 text-sm w-10 shrink-0 ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-[var(--muted)]'}`}>
              {diff > 0 ? '+' : ''}{diff}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Scoring Breakdown (RS vs RA per team) ─────────────────────────────────────

function ScoringBars({ standings }: { standings: Standing[] }) {
  const sorted = [...standings].sort((a, b) => b.runs_scored - a.runs_scored)
  const maxRuns = Math.max(...standings.flatMap(s => [s.runs_scored, s.runs_allowed]), 1)

  return (
    <div className="space-y-3">
      {sorted.map(s => {
        const rsW = (s.runs_scored / maxRuns) * 100
        const raW = (s.runs_allowed / maxRuns) * 100
        const color = TEAM_COLORS[s.team_id] ?? '#fe3d00'

        return (
          <div key={s.team_id}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-display font-800 text-xs uppercase text-white w-8 text-right shrink-0">
                {TEAM_SHORT[s.team_id]}
              </span>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 h-3">
                  <div className="flex-1 bg-[#0a1220] rounded-full overflow-hidden h-full">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${rsW}%`, backgroundColor: color }} />
                  </div>
                  <span className="font-display font-700 text-xs text-[var(--muted)] w-7 text-right shrink-0">{s.runs_scored}</span>
                </div>
                <div className="flex items-center gap-2 h-3">
                  <div className="flex-1 bg-[#0a1220] rounded-full overflow-hidden h-full">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${raW}%`, backgroundColor: '#8BA0B8', opacity: 0.5 }} />
                  </div>
                  <span className="font-display font-700 text-xs text-[var(--muted)] w-7 text-right shrink-0">{s.runs_allowed}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
      <div className="flex items-center gap-4 pt-1 pl-10">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full bg-[var(--accent)]" />
          <span className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-wider">Runs Scored</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full bg-[#8BA0B8] opacity-50" />
          <span className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-wider">Runs Allowed</span>
        </div>
      </div>
    </div>
  )
}

// ── Leaders Bar List ──────────────────────────────────────────────────────────

function LeaderBars({
  category,
  statKey,
  statLabel,
  format,
}: {
  category: KnbsbCategory | undefined
  statKey: string
  statLabel: string
  format?: (v: unknown) => string
}) {
  if (!category || category.data.length === 0) return <EmptyChart label="No data" />

  const top = category.data.slice(0, 8)
  const vals = top.map(p => Number(p[statKey] ?? 0)).filter(v => !isNaN(v))
  const maxVal = Math.max(...vals, 0.001)
  const fmt = format ?? ((v: unknown) => String(v ?? '-'))

  return (
    <div className="space-y-2">
      {top.map((p, i) => {
        const name = parseKnbsbName(p)
        const teamId = parseTeamId(p)
        const val = Number(p[statKey] ?? 0)
        const barW = (val / maxVal) * 100
        const color = TEAM_COLORS[teamId] ?? '#fe3d00'

        return (
          <div key={i} className="flex items-center gap-2">
            <span className="font-display font-700 text-xs text-[var(--muted)] w-4 text-right shrink-0">{i + 1}</span>
            <div className="flex-1 relative">
              <div className="absolute inset-0 rounded-lg bg-[#0a1220]" />
              <div className="absolute inset-y-0 left-0 rounded-lg transition-all duration-700"
                style={{ width: `${barW}%`, backgroundColor: color, opacity: 0.2 }} />
              <div className="relative flex items-center justify-between px-3 py-2">
                <span className="font-display font-800 text-xs text-white truncate">{name}</span>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="font-display font-800 text-xs text-[var(--accent)]">{fmt(val)}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-32">
      <p className="font-display font-700 text-[var(--muted)] uppercase text-sm tracking-wider">{label}</p>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 md:p-6">
      <div className="mb-5">
        <h2 className="font-display font-800 italic text-2xl uppercase text-white">
          <strong>{title}</strong>
        </h2>
        {sub && <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-wider mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StatsCharts({ standings, batting, pitching }: Props) {
  const avgCategory = batting.find(c => c.type === 'avg')
  const eraCategory = pitching.find(c => c.type === 'era')
  const hrCategory  = batting.find(c => c.type === 'hr')
  const kCategory   = pitching.find(c => c.type === 'pitch_so')

  return (
    <div className="space-y-6">

      {/* Row 1: scatter full width */}
      <Section
        title="Run Differential"
        sub="Runs scored (x) vs runs allowed (y) · hover a team for details"
      >
        <ScatterChart standings={standings} />
      </Section>

      {/* Row 2: win pct + run diff side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Win Percentage" sub="Season 2026 · sorted by PCT">
          <WinPctBars standings={standings} />
        </Section>

        <Section title="Run Differential" sub="RS minus RA · green = positive">
          <RunDiffBars standings={standings} />
        </Section>
      </div>

      {/* Row 3: scoring breakdown */}
      <Section title="Scoring" sub="Runs scored (color) vs runs allowed (grey) · sorted by RS">
        <ScoringBars standings={standings} />
      </Section>

      {/* Row 4: leaders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Batting Average" sub="Season leaders · top 8">
          <LeaderBars
            category={avgCategory}
            statKey="avg"
            statLabel="AVG"
            format={v => Number(v).toFixed(3).replace('0.', '.')}
          />
        </Section>

        <Section title="ERA" sub="Season leaders · top 8">
          <LeaderBars
            category={eraCategory}
            statKey="era"
            statLabel="ERA"
            format={v => Number(v).toFixed(2)}
          />
        </Section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Home Runs" sub="Season leaders · top 8">
          <LeaderBars category={hrCategory} statKey="hr" statLabel="HR" />
        </Section>

        <Section title="Strikeouts" sub="Season pitching leaders · top 8">
          <LeaderBars category={kCategory} statKey="pitch_so" statLabel="K" />
        </Section>
      </div>

    </div>
  )
}
