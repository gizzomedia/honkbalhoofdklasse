'use client'

import { useState } from 'react'
import { TEAM_COLORS, TEAM_NAMES, TEAM_LOGOS } from '@/lib/teams'
import Image from 'next/image'

// All 7 clubs in the western Netherlands.
// Positions are manually tuned for the SVG canvas (0-400 wide, 0-340 tall)
// so they appear geographically accurate relative to each other.
const CLUBS = [
  { teamId: 'kinheim',  city: 'Haarlem',    cx: 128, cy: 72  },
  { teamId: 'pioniers', city: 'Hoofddorp',  cx: 108, cy: 104 },
  { teamId: 'pirates',  city: 'Amsterdam',  cx: 180, cy: 68  },
  { teamId: 'hcaw',     city: 'Bussum',     cx: 232, cy: 108 },
  { teamId: 'uvv',      city: 'Utrecht',    cx: 228, cy: 178 },
  { teamId: 'neptunus', city: 'Rotterdam',  cx: 130, cy: 228 },
  { teamId: 'twins',    city: 'Oosterhout', cx: 190, cy: 282 },
]

export default function NetherlandsClubMap() {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <svg
          viewBox="0 0 400 340"
          className="w-full"
          style={{ display: 'block' }}
        >
          {/* Subtle grid */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="0.6" fill="rgba(255,255,255,0.06)" />
            </pattern>
          </defs>
          <rect width="400" height="340" fill="url(#grid)" />

          {/* Connection lines between all clubs */}
          {CLUBS.map((a, i) =>
            CLUBS.slice(i + 1).map(b => (
              <line
                key={`${a.teamId}-${b.teamId}`}
                x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
            ))
          )}

          {/* Hover connection highlight */}
          {hovered && CLUBS.filter(c => c.teamId !== hovered).map(b => {
            const a = CLUBS.find(c => c.teamId === hovered)!
            return (
              <line
                key={`hl-${b.teamId}`}
                x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy}
                stroke={TEAM_COLORS[hovered] ?? '#ff6b00'}
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.4"
              />
            )
          })}

          {/* Dots + labels */}
          {CLUBS.map((c, i) => {
            const color = TEAM_COLORS[c.teamId] ?? '#ff6b00'
            const isH = hovered === c.teamId
            const labelRight = c.cx < 200

            return (
              <g
                key={c.teamId}
                onMouseEnter={() => setHovered(c.teamId)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'default' }}
              >
                {/* Pulse ring */}
                <circle cx={c.cx} cy={c.cy} fill={color} opacity="0">
                  <animate
                    attributeName="r" values="5;22;5"
                    dur={`${2.0 + i * 0.35}s`} repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity" values="0.4;0;0.4"
                    dur={`${2.0 + i * 0.35}s`} repeatCount="indefinite"
                  />
                </circle>

                {/* Dot */}
                <circle
                  cx={c.cx} cy={c.cy}
                  r={isH ? 9 : 6}
                  fill={color}
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth={isH ? 2 : 1.5}
                  style={{ transition: 'r 0.15s ease' }}
                />

                {/* Label background + text */}
                {(() => {
                  const name = TEAM_NAMES[c.teamId] ?? c.teamId
                  const label = c.city
                  const lx = labelRight ? c.cx + 14 : c.cx - 14
                  const anchor = labelRight ? 'start' : 'end'
                  return (
                    <g opacity={isH ? 1 : 0.75} style={{ transition: 'opacity 0.15s' }}>
                      <text
                        x={lx} y={c.cy - 3}
                        textAnchor={anchor}
                        fill="white"
                        fontSize="9"
                        fontFamily="system-ui, sans-serif"
                        fontWeight="800"
                        letterSpacing="0.06em"
                        style={{ textTransform: 'uppercase' }}
                      >
                        {name}
                      </text>
                      <text
                        x={lx} y={c.cy + 9}
                        textAnchor={anchor}
                        fill="rgba(255,255,255,0.45)"
                        fontSize="8"
                        fontFamily="system-ui, sans-serif"
                      >
                        {label}
                      </text>
                    </g>
                  )
                })()}
              </g>
            )
          })}
        </svg>

        {/* Legend strip at the bottom */}
        <div className="border-t border-[var(--border)] px-5 py-3 flex flex-wrap gap-x-5 gap-y-1.5 justify-center">
          {CLUBS.map(c => (
            <div
              key={c.teamId}
              className="flex items-center gap-1.5 cursor-default"
              onMouseEnter={() => setHovered(c.teamId)}
              onMouseLeave={() => setHovered(null)}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: TEAM_COLORS[c.teamId] ?? '#ff6b00' }}
              />
              <span className={`font-display font-700 text-[10px] uppercase tracking-wider transition-colors ${hovered === c.teamId ? 'text-white' : 'text-[var(--muted)]'}`}>
                {c.city}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
