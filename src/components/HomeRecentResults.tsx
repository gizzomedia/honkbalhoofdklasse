'use client'

import { useState } from 'react'
import Image from 'next/image'
import BoxscoreModal from './BoxscoreModal'

const TEAM_COLORS: Record<string, string> = {
  neptunus: '#121b31', pirates: '#0f6f38', kinheim: '#c0232e',
  hcaw: '#f5b51a', twins: '#ee7e1a', pioniers: '#3d68e9', uvv: '#db002f',
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
  neptunus: 'Neptunus', pirates: 'Pirates', kinheim: 'Kinheim',
  hcaw: 'HCAW', twins: 'Twins', pioniers: 'Pioniers', uvv: 'UVV',
}
const TEAM_SHORT: Record<string, string> = {
  neptunus: 'NEP', pirates: 'PIR', kinheim: 'KIN',
  hcaw: 'HCA', twins: 'TWI', pioniers: 'PIO', uvv: 'UVV',
}

type Game = {
  id: number | string
  external_id: string | null
  game_date: string
  home_team_id: string
  away_team_id: string
  home_score: number | null
  away_score: number | null
  status: string
}

type StandingEntry = { wins: number; losses: number }

function TeamLogo({ teamId, size = 40 }: { teamId: string; size?: number }) {
  const logo = TEAM_LOGOS[teamId]
  const color = TEAM_COLORS[teamId] ?? '#1e335a'
  return (
    <div className="rounded-lg flex items-center justify-center shrink-0 p-1.5"
      style={{ backgroundColor: color, width: size, height: size }}>
      {logo
        ? <Image src={logo} alt={teamId} width={size - 8} height={size - 8} className="object-contain w-full h-full" />
        : <span className="font-display font-800 text-white" style={{ fontSize: size * 0.25 }}>{TEAM_SHORT[teamId] ?? teamId.slice(0, 3).toUpperCase()}</span>
      }
    </div>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

export default function HomeRecentResults({
  results,
  standingsMap,
}: {
  results: Game[]
  standingsMap: Record<string, StandingEntry>
}) {
  const [selected, setSelected] = useState<Game | null>(null)

  if (results.length === 0) return null

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {results.map(g => {
          const homeWon = (g.home_score ?? 0) > (g.away_score ?? 0)
          const awayWon = (g.away_score ?? 0) > (g.home_score ?? 0)
          const winColor = TEAM_COLORS[homeWon ? g.home_team_id : g.away_team_id] ?? '#fe3d00'
          return (
            <div
              key={g.id}
              onClick={() => setSelected(g)}
              className="relative bg-[#0a1220] border border-[#1a2a3a] overflow-hidden group hover:border-[var(--accent)]/50 transition-colors cursor-pointer"
            >
              <div className="h-[3px]" style={{ backgroundColor: winColor }} />

              <div className="p-4">
                {/* Away */}
                <div className={`flex items-center gap-2 mb-1.5 ${awayWon ? '' : 'opacity-35'}`}>
                  <TeamLogo teamId={g.away_team_id} size={32} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-display font-800 text-[0.72rem] uppercase text-white truncate leading-tight">
                      {TEAM_NAMES[g.away_team_id] ?? g.away_team_id}
                    </span>
                    {standingsMap[g.away_team_id] && (
                      <span className="font-display font-600 text-[0.6rem] text-[#4a6a8a] leading-none mt-0.5">
                        {standingsMap[g.away_team_id].wins}-{standingsMap[g.away_team_id].losses}
                      </span>
                    )}
                  </div>
                  <span className={`font-display font-800 text-2xl tabular-nums ${awayWon ? 'text-white' : 'text-white/30'}`}>
                    {g.away_score ?? '–'}
                  </span>
                </div>

                {/* Home */}
                <div className={`flex items-center gap-2 ${homeWon ? '' : 'opacity-35'}`}>
                  <TeamLogo teamId={g.home_team_id} size={32} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-display font-800 text-[0.72rem] uppercase text-white truncate leading-tight">
                      {TEAM_NAMES[g.home_team_id] ?? g.home_team_id}
                    </span>
                    {standingsMap[g.home_team_id] && (
                      <span className="font-display font-600 text-[0.6rem] text-[#4a6a8a] leading-none mt-0.5">
                        {standingsMap[g.home_team_id].wins}-{standingsMap[g.home_team_id].losses}
                      </span>
                    )}
                  </div>
                  <span className={`font-display font-800 text-2xl tabular-nums ${homeWon ? 'text-white' : 'text-white/30'}`}>
                    {g.home_score ?? '–'}
                  </span>
                </div>
              </div>

              <div className="px-4 py-2 border-t border-[#1a2a3a] flex items-center justify-between">
                <span className="font-display font-700 text-[11px] text-[#4a6a8a] uppercase tracking-widest">{formatDate(g.game_date)}</span>
                <span className="font-display font-800 text-[11px] text-[var(--accent)] uppercase tracking-widest">Final</span>
              </div>
            </div>
          )
        })}
      </div>

      {selected && (
        <BoxscoreModal
          gameId={selected.external_id ?? String(selected.id)}
          awayId={selected.away_team_id}
          homeId={selected.home_team_id}
          awayScore={selected.away_score}
          homeScore={selected.home_score}
          gameDate={selected.game_date}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
