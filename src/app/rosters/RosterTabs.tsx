'use client'

import { useState } from 'react'
import Image from 'next/image'

const TEAM_COLORS: Record<string, string> = {
  neptunus: '#121b31', pirates: '#ffc425', kinheim: '#c0232e',
  hcaw: '#f5b51a', twins: '#ee7e1a', pioniers: '#e41d30', uvv: '#db002f',
}
const TEAM_LOGOS: Record<string, string> = {
  neptunus: 'https://res.cloudinary.com/dqld625sq/image/upload/v1770654466/Neptunus_logo_wit_afyyae.png',
  pirates:  'https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/pirates_logo_ic4rk8.png',
  kinheim:  'https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/Kinheim_logo_d4zw2t.png',
  hcaw:     'https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/HCAW_logo_wit_rijssy.png',
  twins:    'https://res.cloudinary.com/dqld625sq/image/upload/v1770654463/Twins_wit_c7dumy.png',
  pioniers: 'https://res.cloudinary.com/dqld625sq/image/upload/v1770654445/Pioniers_logo_mqj4tb.png',
  uvv:      'https://res.cloudinary.com/dqld625sq/image/upload/v1770654446/UVV_logo_xcaa5d.png',
}
const TEAM_NAMES: Record<string, string> = {
  neptunus: 'Curaçao Neptunus', pirates: 'Amsterdam Pirates', kinheim: 'Kinheim',
  hcaw: 'HCAW', twins: 'Oosterhout Twins', pioniers: 'Hoofddorp Pioniers', uvv: 'UVV',
}
const TEAM_ORDER = ['neptunus', 'pirates', 'kinheim', 'hcaw', 'twins', 'pioniers', 'uvv']

const POSITION_GROUPS: { label: string; short: string; positions: string[] }[] = [
  { label: 'Starting Pitchers', short: 'SP', positions: ['SP'] },
  { label: 'Relief Pitchers',   short: 'RP', positions: ['RP'] },
  { label: 'Catcher',           short: 'C',  positions: ['C'] },
  { label: 'First Base',        short: '1B', positions: ['1B'] },
  { label: 'Second Base',       short: '2B', positions: ['2B'] },
  { label: 'Third Base',        short: '3B', positions: ['3B'] },
  { label: 'Shortstop',         short: 'SS', positions: ['SS'] },
  { label: 'Left Field',        short: 'LF', positions: ['LF'] },
  { label: 'Center Field',      short: 'CF', positions: ['CF'] },
  { label: 'Right Field',       short: 'RF', positions: ['RF'] },
  { label: 'Designated Hitter', short: 'DH', positions: ['DH'] },
  { label: 'Utility / Pinch',   short: 'UT', positions: ['OF', 'IF', 'UT', 'PH', 'PR', 'EH'] },
]

export type RosterPlayer = {
  name: string
  uniform: string
  primaryPos: string
}

export type Rosters = Record<string, RosterPlayer[]>

function formatName(raw: string): string {
  const parts = raw.split(' ')
  if (parts.length < 2) return raw
  // Format: "LASTNAME Firstname" → "Firstname Lastname"
  const last = parts[0]
  const first = parts.slice(1).join(' ')
  const lastCap = last.charAt(0) + last.slice(1).toLowerCase()
  return `${first} ${lastCap}`
}

export default function RosterTabs({ rosters }: { rosters: Rosters }) {
  const availableTeams = TEAM_ORDER.filter(t => rosters[t] && rosters[t].length > 0)
  const [activeTeam, setActiveTeam] = useState(availableTeams[0] ?? '')

  const players = rosters[activeTeam] ?? []

  return (
    <div className="space-y-6">
      {/* Team tabs — horizontal scroll on mobile */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex gap-2 min-w-max">
          {availableTeams.map(teamId => {
            const active = teamId === activeTeam
            const color = TEAM_COLORS[teamId] ?? '#1e335a'
            return (
              <button
                key={teamId}
                onClick={() => setActiveTeam(teamId)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-display font-800 text-sm uppercase tracking-wide transition-all shrink-0 ${
                  active ? 'text-white' : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] hover:text-white'
                }`}
                style={active ? { backgroundColor: color } : {}}
              >
                <div
                  className="w-6 h-6 rounded flex items-center justify-center shrink-0 p-0.5"
                  style={{ backgroundColor: active ? 'rgba(255,255,255,0.2)' : color }}
                >
                  <Image
                    src={TEAM_LOGOS[teamId]}
                    alt={teamId}
                    width={20}
                    height={20}
                    className="object-contain w-full h-full"
                  />
                </div>
                <span className="hidden sm:inline">{TEAM_NAMES[teamId]}</span>
                <span className="sm:hidden">{teamId.slice(0, 3).toUpperCase()}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Roster grid */}
      <div className="space-y-5">
        {POSITION_GROUPS.map(group => {
          const groupPlayers = players
            .filter(p => group.positions.includes(p.primaryPos))
            .sort((a, b) => {
              const na = Number(a.uniform) || 99
              const nb = Number(b.uniform) || 99
              return na - nb
            })
          if (groupPlayers.length === 0) return null

          return (
            <div key={group.short}>
              {/* Position header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: TEAM_COLORS[activeTeam] ?? '#1e335a' }}
                >
                  <span className="font-display font-800 text-white text-sm">{group.short}</span>
                </div>
                <div>
                  <h2 className="font-display font-800 italic text-2xl uppercase text-white leading-none">
                    <strong>{group.label}</strong>
                  </h2>
                  <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest">
                    {groupPlayers.length} speler{groupPlayers.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Player cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {groupPlayers.map((player, i) => (
                  <div
                    key={i}
                    className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-3 py-3 flex items-center gap-3 hover:bg-[var(--card-hover)] transition-colors"
                  >
                    {/* Jersey number */}
                    <span
                      className="font-display font-800 text-lg w-8 text-center shrink-0 leading-none"
                      style={{ color: TEAM_COLORS[activeTeam] ?? 'var(--accent)' }}
                    >
                      {player.uniform || '–'}
                    </span>
                    {/* Name */}
                    <p className="font-display font-800 text-sm uppercase text-white leading-tight truncate">
                      <strong>{formatName(player.name)}</strong>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
