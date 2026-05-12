import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export const revalidate = 120

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

type Game = {
  id: number
  game_date: string
  home_team_id: string
  away_team_id: string
  home_score: number | null
  away_score: number | null
  status: string
}

async function getResults() {
  const { data } = await supabase
    .from('games').select('*')
    .eq('status', 'final')
    .order('game_date', { ascending: false })
    .limit(30)
  return data ?? []
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
  return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
}

function ResultCard({ game }: { game: Game }) {
  const homeWon = game.home_score !== null && game.away_score !== null && game.home_score > game.away_score
  const awayWon = game.home_score !== null && game.away_score !== null && game.away_score > game.home_score

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3">

      {/* Datum + Final */}
      <div className="flex items-center justify-between mb-2.5">
        <p className="font-display font-800 text-sm uppercase text-white leading-none">
          {formatDate(game.game_date)}
        </p>
        <p className="font-display font-800 italic text-sm text-[var(--accent)] uppercase">
          <strong>Final</strong>
        </p>
      </div>

      {/* Teams + score */}
      <div className="flex items-center gap-2">
        {/* Away */}
        <div className={`flex items-center gap-2 flex-1 min-w-0 justify-end ${awayWon ? '' : 'opacity-50'}`}>
          <p className="font-display font-800 text-base md:text-xl uppercase text-white text-right leading-none truncate">
            <strong>{TEAM_NAMES[game.away_team_id] ?? game.away_team_id}</strong>
          </p>
          <TeamLogo teamId={game.away_team_id} />
        </div>

        {/* Score */}
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

        {/* Home */}
        <div className={`flex items-center gap-2 flex-1 min-w-0 ${homeWon ? '' : 'opacity-50'}`}>
          <TeamLogo teamId={game.home_team_id} />
          <p className="font-display font-800 text-base md:text-xl uppercase text-white leading-none truncate">
            <strong>{TEAM_NAMES[game.home_team_id] ?? game.home_team_id}</strong>
          </p>
        </div>
      </div>
    </div>
  )
}

export default async function UitslagenPage() {
  const results = await getResults()

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      <div>
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">Seizoen 2026</p>
        <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
          <strong>Uitslagen</strong>
        </h1>
      </div>

      {results.length === 0 ? (
        <p className="font-display font-700 text-[var(--muted)] text-xl uppercase">Nog geen uitslagen beschikbaar</p>
      ) : (
        <div className="space-y-2">
          {results.map(g => <ResultCard key={g.id} game={g} />)}
        </div>
      )}
    </div>
  )
}
