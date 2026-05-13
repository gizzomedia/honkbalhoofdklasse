import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Standings 2026',
  description: 'De actuele stand van de KNBSB Honkbal Hoofdklasse 2026. Bekijk wins, losses en winning percentage per team.',
  alternates: { canonical: 'https://honkbalhoofdklasse.com/stand' },
}

export const revalidate = 300

const TEAM_COLORS: Record<string, string> = {
  neptunus: '#121b31',
  pirates:  '#0f6f38',
  kinheim:  '#c0232e',
  hcaw:     '#f5b51a',
  twins:    '#ee7e1a',
  pioniers: '#3d68e9',
  uvv:      '#db002f',
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
  neptunus: 'Neptunus',
  pirates:  'Amsterdam Pirates',
  kinheim:  'Kinheim',
  hcaw:     'HCAW',
  twins:    'Oosterhout Twins',
  pioniers: 'Hoofddorp Pioniers',
  uvv:      'UVV',
}

type StandingRow = {
  team_id: string
  games_played: number
  wins: number
  losses: number
  ties: number
  win_pct: number
  runs_scored: number
  runs_allowed: number
}

async function getStandings(): Promise<StandingRow[]> {
  const { data, error } = await supabase
    .from('standings')
    .select('team_id, games_played, wins, losses, ties, win_pct, runs_scored, runs_allowed')
    .eq('season', new Date().getFullYear())
    .order('wins', { ascending: false })
    .order('win_pct', { ascending: false })

  if (error || !data) return []
  return data
}

export default async function StandPage() {
  const standings = await getStandings()
  const leader = standings[0]

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">
          Season 2026
        </p>
        <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
          <strong>Standings</strong>
        </h1>
      </div>

      {/* Tabel */}
      <div className="rounded-2xl overflow-hidden border border-[var(--border)]">
        {/* Kolomkoppen */}
        <div className="grid grid-cols-[1.5rem_1fr_2.5rem_2.5rem_3.5rem] md:grid-cols-[2rem_1fr_3rem_3rem_3rem_4rem] gap-2 px-4 md:px-5 py-3 bg-[var(--navy)] text-white/60 font-display font-700 uppercase text-xs tracking-widest">
          <span>#</span>
          <span>Team</span>
          <span className="text-center">W</span>
          <span className="text-center">L</span>
          <span className="text-center">PCT</span>
          <span className="text-center hidden md:block">G</span>
        </div>

        {standings.map((s, i) => {
          const isLeader = i === 0
          const gb = leader
            ? ((leader.wins - s.wins) - (leader.losses - s.losses)) / 2
            : 0
          const logo = TEAM_LOGOS[s.team_id]
          const color = TEAM_COLORS[s.team_id] ?? '#1e335a'
          const name = TEAM_NAMES[s.team_id] ?? s.team_id
          const pct = s.win_pct ? s.win_pct.toFixed(3).replace('0.', '.') : '.000'

          return (
            <div
              key={s.team_id}
              className={`
                grid grid-cols-[1.5rem_1fr_2.5rem_2.5rem_3.5rem] md:grid-cols-[2rem_1fr_3rem_3rem_3rem_4rem] gap-2 px-4 md:px-5 py-4
                items-center border-b border-[var(--border)] last:border-0
                transition-colors
                ${isLeader
                  ? 'bg-[var(--accent)]'
                  : 'bg-[var(--card)] hover:bg-[var(--card-hover)]'
                }
              `}
            >
              {/* Rang */}
              <span className={`font-display font-800 text-lg ${isLeader ? 'text-white' : 'text-[var(--muted)]'}`}>
                {i + 1}
              </span>

              {/* Team */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 p-1.5"
                  style={{ backgroundColor: color }}
                >
                  {logo ? (
                    <Image
                      src={logo}
                      alt={name}
                      width={32}
                      height={32}
                      className="object-contain w-full h-full"
                    />
                  ) : (
                    <span className="font-display font-800 text-xs text-white">
                      {s.team_id.slice(0, 3).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-display font-800 text-lg uppercase tracking-wide leading-none text-white">
                    <strong>{name}</strong>
                  </p>
                  {!isLeader && gb > 0 && (
                    <p className="text-[var(--muted)] text-xs mt-0.5">
                      -{gb % 1 === 0 ? gb : gb.toFixed(1)} GB
                    </p>
                  )}
                  {isLeader && (
                    <p className="text-white text-xs mt-0.5 font-display font-800 uppercase tracking-wider">
                      Leader
                    </p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <span className={`text-center font-display font-800 text-base ${isLeader ? 'text-white' : 'text-white'}`}>
                {s.wins}
              </span>
              <span className="text-center font-display font-600 text-base text-white">
                {s.losses}
              </span>
              <span className={`text-center font-display font-700 text-base ${isLeader ? 'text-white' : 'text-[var(--accent)]'}`}>
                {pct}
              </span>
              <span className={`text-center font-display font-600 text-base hidden md:block ${isLeader ? 'text-white' : 'text-white'}`}>
                {s.games_played}
              </span>
            </div>
          )
        })}
      </div>


    </div>
  )
}
