'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import BoxscoreModal from '@/components/BoxscoreModal'

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
  neptunus: 'Neptunus', pirates: 'Amsterdam Pirates', kinheim: 'Kinheim',
  hcaw: 'HCAW', twins: 'Oosterhout Twins', pioniers: 'Hoofddorp Pioniers', uvv: 'UVV',
}
const TEAM_SHORT: Record<string, string> = {
  neptunus: 'Neptunus', pirates: 'Pirates', kinheim: 'Kinheim',
  hcaw: 'HCAW', twins: 'Twins', pioniers: 'Pioniers', uvv: 'UVV',
}

type Game = {
  id: number
  external_id: string
  game_date: string
  home_team_id: string
  away_team_id: string
  home_score: number | null
  away_score: number | null
}

type StandingsEntry = { team_id: string; wins: number; losses: number }

function TeamLogo({ teamId }: { teamId: string }) {
  const logo = TEAM_LOGOS[teamId]
  const color = TEAM_COLORS[teamId] ?? '#1e335a'
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 p-1" style={{ backgroundColor: color }}>
      {logo
        ? <Image src={logo} alt={teamId} width={28} height={28} className="object-contain w-full h-full" />
        : <span className="font-display font-800 text-white text-xs">{teamId.slice(0, 3).toUpperCase()}</span>
      }
    </div>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
}

function ResultCard({ game, standingsMap, onClick }: { game: Game; standingsMap: Record<string, StandingsEntry>; onClick: () => void }) {
  const homeWon = game.home_score !== null && game.away_score !== null && game.home_score > game.away_score
  const awayWon = game.home_score !== null && game.away_score !== null && game.away_score > game.home_score

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 hover:border-[var(--accent)]/50 hover:bg-[var(--card-hover)] transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-2.5">
        <p className="font-display font-800 text-sm uppercase text-white leading-none">
          {formatDate(game.game_date)}
        </p>
        <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest group-hover:text-[var(--accent)] transition-colors">
          Boxscore →
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-2 flex-1 min-w-0 justify-end ${awayWon ? '' : 'opacity-50'}`}>
          <div className="flex flex-col items-end min-w-0 flex-1">
            <p className="font-display font-800 text-base md:text-xl uppercase text-white text-right leading-none truncate">
              <strong>
                <span className="hidden sm:inline">{TEAM_NAMES[game.away_team_id] ?? game.away_team_id}</span>
                <span className="sm:hidden">{TEAM_SHORT[game.away_team_id] ?? game.away_team_id}</span>
              </strong>
            </p>
            {standingsMap[game.away_team_id] && (
              <span className="font-display font-600 text-xs text-[var(--muted)]">
                {standingsMap[game.away_team_id].wins}-{standingsMap[game.away_team_id].losses}
              </span>
            )}
          </div>
          <TeamLogo teamId={game.away_team_id} />
        </div>

        <div className="shrink-0 w-14 text-center">
          {game.away_score !== null && game.home_score !== null ? (
            <p className="font-display font-800 text-xl text-white tracking-tight">
              <span className={awayWon ? 'text-white' : 'text-[var(--muted)]'}>{game.away_score}</span>
              <span className="text-[var(--muted)] mx-0.5">–</span>
              <span className={homeWon ? 'text-white' : 'text-[var(--muted)]'}>{game.home_score}</span>
            </p>
          ) : (
            <p className="font-display font-800 text-lg text-[var(--muted)]">–</p>
          )}
        </div>

        <div className={`flex items-center gap-2 flex-1 min-w-0 ${homeWon ? '' : 'opacity-50'}`}>
          <TeamLogo teamId={game.home_team_id} />
          <div className="flex flex-col min-w-0 flex-1">
            <p className="font-display font-800 text-base md:text-xl uppercase text-white leading-none truncate">
              <strong>
                <span className="hidden sm:inline">{TEAM_NAMES[game.home_team_id] ?? game.home_team_id}</span>
                <span className="sm:hidden">{TEAM_SHORT[game.home_team_id] ?? game.home_team_id}</span>
              </strong>
            </p>
            {standingsMap[game.home_team_id] && (
              <span className="font-display font-600 text-xs text-[var(--muted)]">
                {standingsMap[game.home_team_id].wins}-{standingsMap[game.home_team_id].losses}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export default function UitslagenPage() {
  const [results, setResults] = useState<Game[]>([])
  const [standingsMap, setStandingsMap] = useState<Record<string, StandingsEntry>>({})
  const [selected, setSelected] = useState<Game | null>(null)

  useEffect(() => {
    Promise.all([
      supabase
        .from('games')
        .select('id, external_id, game_date, home_team_id, away_team_id, home_score, away_score')
        .eq('status', 'final')
        .order('game_date', { ascending: false })
        .limit(30),
      supabase
        .from('standings')
        .select('team_id, wins, losses')
        .eq('season', 2026),
    ]).then(([gamesRes, standingsRes]) => {
      setResults((gamesRes.data ?? []) as Game[])
      const map: Record<string, StandingsEntry> = {}
      for (const s of (standingsRes.data ?? []) as StandingsEntry[]) {
        map[s.team_id] = s
      }
      setStandingsMap(map)
    })
  }, [])

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <div>
          <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">Season 2026</p>
          <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
            <strong>Results</strong>
          </h1>
        </div>

        {results.length === 0 ? (
          <div className="flex items-center gap-3 py-8">
            <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            <p className="font-display font-700 text-[var(--muted)] uppercase text-sm tracking-widest">Loading…</p>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map(g => (
              <ResultCard key={g.id} game={g} standingsMap={standingsMap} onClick={() => setSelected(g)} />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <BoxscoreModal
          gameId={selected.external_id}
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
