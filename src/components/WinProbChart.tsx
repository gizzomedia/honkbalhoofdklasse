'use client'

import type { WinProbPoint } from '@/app/api/win-probability/[gameId]/route'

const W = 480
const H = 140
const PAD = { top: 12, right: 8, bottom: 24, left: 36 }
const INNER_W = W - PAD.left - PAD.right
const INNER_H = H - PAD.top - PAD.bottom

function xPos(i: number, total: number) {
  return PAD.left + (i / Math.max(total - 1, 1)) * INNER_W
}
function yPos(prob: number) {
  return PAD.top + (1 - prob) * INNER_H
}

export default function WinProbChart({
  points,
  homeId,
  awayId,
  homeColor,
  awayColor,
}: {
  points: WinProbPoint[]
  homeId: string
  awayId: string
  homeColor: string
  awayColor: string
}) {
  if (points.length < 2) return null

  const n = points.length
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i, n)} ${yPos(p.homeProb)}`)
    .join(' ')

  const areaPath = [
    `M ${xPos(0, n)} ${yPos(0.5)}`,
    ...points.map((p, i) => `L ${xPos(i, n)} ${yPos(p.homeProb)}`),
    `L ${xPos(n - 1, n)} ${yPos(0.5)}`,
    'Z',
  ].join(' ')

  // Show every other label on X axis if many points
  const showLabel = (i: number) => {
    if (n <= 10) return true
    return i === 0 || i === n - 1 || points[i].label.startsWith('B')
  }

  const homeProb = Math.round(points[points.length - 1].homeProb * 100)
  const awayProb = 100 - homeProb

  return (
    <div className="px-5 pb-5 pt-1 border-t border-[var(--border)]">
      <div className="flex items-center justify-between mb-2">
        <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">Win Probability</p>
        <div className="flex items-center gap-4">
          <span className="font-display font-800 text-xs uppercase" style={{ color: awayColor }}>
            {awayId.toUpperCase()} {awayProb}%
          </span>
          <span className="font-display font-800 text-xs uppercase" style={{ color: homeColor }}>
            {homeId.toUpperCase()} {homeProb}%
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }}>
        <defs>
          <linearGradient id="homeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={homeColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={homeColor} stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="awayGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={awayColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={awayColor} stopOpacity="0.05" />
          </linearGradient>
          <clipPath id="above50">
            <rect x={PAD.left} y={PAD.top} width={INNER_W} height={INNER_H / 2} />
          </clipPath>
          <clipPath id="below50">
            <rect x={PAD.left} y={PAD.top + INNER_H / 2} width={INNER_W} height={INNER_H / 2} />
          </clipPath>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(p => (
          <line
            key={p}
            x1={PAD.left} y1={yPos(p)}
            x2={W - PAD.right} y2={yPos(p)}
            stroke={p === 0.5 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}
            strokeWidth={p === 0.5 ? 1.5 : 1}
            strokeDasharray={p === 0.5 ? '4 3' : '2 4'}
          />
        ))}

        {/* Y axis labels */}
        {[75, 50, 25].map(pct => (
          <text
            key={pct}
            x={PAD.left - 4}
            y={yPos(pct / 100) + 4}
            textAnchor="end"
            fontSize={8}
            fill="rgba(255,255,255,0.35)"
            fontFamily="system-ui"
          >
            {pct}%
          </text>
        ))}

        {/* Area fill — home above 50% */}
        <path d={areaPath} fill="url(#homeGrad)" clipPath="url(#above50)" />
        {/* Area fill — away below 50% */}
        <path d={areaPath} fill="url(#awayGrad)" clipPath="url(#below50)" />

        {/* Win probability line */}
        <path d={linePath} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />

        {/* X axis labels */}
        {points.map((p, i) =>
          showLabel(i) ? (
            <text
              key={i}
              x={xPos(i, n)}
              y={H - 4}
              textAnchor="middle"
              fontSize={7.5}
              fill="rgba(255,255,255,0.35)"
              fontFamily="system-ui"
            >
              {p.label === 'Start' ? 'S' : p.label}
            </text>
          ) : null
        )}

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={xPos(i, n)}
            cy={yPos(p.homeProb)}
            r={i === 0 || i === n - 1 ? 2.5 : 1.5}
            fill={p.homeProb > 0.5 ? homeColor : p.homeProb < 0.5 ? awayColor : 'white'}
            opacity={i === 0 || i === n - 1 ? 1 : 0.7}
          />
        ))}
      </svg>
    </div>
  )
}
