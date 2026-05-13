import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import PredictionWidget from '@/components/PredictionWidget'

export const metadata: Metadata = {
  title: 'Speelschema 2026',
  description: 'Het volledige speelschema van de Honkbal Hoofdklasse 2026. Alle wedstrijden, datums en locaties.',
  alternates: { canonical: 'https://honkbalhoofdklasse.com/schema' },
}

export const revalidate = 120

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
  neptunus: 'Neptunus', pirates: 'Amsterdam Pirates', kinheim: 'Kinheim',
  hcaw: 'HCAW', twins: 'Oosterhout Twins', pioniers: 'Hoofddorp Pioniers', uvv: 'UVV',
}
const TEAM_SHORT: Record<string, string> = {
  neptunus: 'Neptunus', pirates: 'Pirates', kinheim: 'Kinheim',
  hcaw: 'HCAW', twins: 'Twins', pioniers: 'Pioniers', uvv: 'UVV',
}

type Game = {
  id: number
  game_date: string
  game_time: string | null
  home_team_id: string
  away_team_id: string
  status: string
  venue: string | null
}

type StandingsEntry = { team_id: string; wins: number; losses: number }

async function getSchedule() {
  const today = new Date().toISOString().split('T')[0]
  const [gamesRes, standingsRes] = await Promise.all([
    supabase
      .from('games').select('*')
      .eq('status', 'scheduled')
      .gte('game_date', today)
      .order('game_date', { ascending: true })
      .limit(30),
    supabase
      .from('standings')
      .select('team_id, wins, losses')
      .eq('season', 2026),
  ])
  const standingsMap: Record<string, StandingsEntry> = {}
  for (const s of (standingsRes.data ?? []) as StandingsEntry[]) {
    standingsMap[s.team_id] = s
  }
  return { games: gamesRes.data ?? [], standingsMap }
}

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
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
}

function GameCard({ game, standingsMap }: { game: Game; standingsMap: Record<string, StandingsEntry> }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="px-4 pt-3 pb-1">

        {/* Datum + tijd + locatie */}
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-800 text-sm uppercase text-white leading-none">
            {formatDate(game.game_date)}
            {game.game_time && (
              <span className="text-[var(--muted)] ml-2">{game.game_time.slice(0, 5)}</span>
            )}
          </p>
          {game.venue && (
            <p className="font-display font-700 text-xs text-[var(--muted)] truncate max-w-[40%] text-right">
              {game.venue}
            </p>
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center gap-2">
          {/* Away */}
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
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

          <div className="shrink-0 w-10 text-center">
            <p className="font-display font-800 italic text-base text-[var(--muted)]">VS</p>
          </div>

          {/* Home */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
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
      </div>

      <div className="px-4 pb-3">
        <PredictionWidget
          gameId={game.id}
          homeTeamId={game.home_team_id}
          awayTeamId={game.away_team_id}
        />
      </div>
    </div>
  )
}

export default async function SchemaPage() {
  const { games, standingsMap } = await getSchedule()

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <div>
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">Season 2026</p>
        <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
          <strong>Schedule</strong>
        </h1>
      </div>

      {games.length === 0 ? (
        <p className="font-display font-700 text-[var(--muted)] text-xl uppercase">No games scheduled</p>
      ) : (
        <div className="space-y-2">
          {games.map(g => <GameCard key={g.id} game={g} standingsMap={standingsMap} />)}
        </div>
      )}
    </div>
  )
}
