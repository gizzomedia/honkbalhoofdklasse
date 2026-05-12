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
const TEAM_SHORT: Record<string, string> = {
  neptunus: 'NEP', pirates: 'PIR', kinheim: 'KIN',
  hcaw: 'HCA', twins: 'TWI', pioniers: 'PIO', uvv: 'UVV',
}

type Game = {
  id: number
  game_date: string
  game_time: string | null
  home_team_id: string
  away_team_id: string
  home_score: number | null
  away_score: number | null
  status: string
}

function TeamLogo({ teamId }: { teamId: string }) {
  const logo = TEAM_LOGOS[teamId]
  const color = TEAM_COLORS[teamId] ?? '#1e335a'
  return (
    <div className="w-8 h-8 rounded flex items-center justify-center p-1 shrink-0" style={{ backgroundColor: color }}>
      {logo
        ? <Image src={logo} alt={teamId} width={24} height={24} className="object-contain w-full h-full" />
        : <span className="font-display font-800 text-white text-[10px]">{(TEAM_SHORT[teamId] ?? teamId).slice(0, 3)}</span>
      }
    </div>
  )
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export default function ScoresTicker({ games }: { games: Game[] }) {
  if (games.length === 0) return null

  return (
    <div className="bg-[#0a1628] border-b border-[var(--border)] overflow-x-auto scrollbar-hide">
      <div className="flex items-stretch divide-x divide-[var(--border)] min-w-max">
        {games.map(g => {
          const isFinal = g.status === 'final'
          const homeWon = isFinal && (g.home_score ?? 0) > (g.away_score ?? 0)
          const awayWon = isFinal && (g.away_score ?? 0) > (g.home_score ?? 0)
          return (
            <div key={g.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors shrink-0">
              <div className="flex flex-col gap-1.5">
                <div className={`flex items-center gap-2 ${awayWon ? 'opacity-100' : isFinal ? 'opacity-40' : ''}`}>
                  <TeamLogo teamId={g.away_team_id} />
                  <span className="font-display font-800 text-xs text-white uppercase tracking-wide">
                    {TEAM_SHORT[g.away_team_id] ?? g.away_team_id}
                  </span>
                  {isFinal && (
                    <span className={`font-display font-800 text-sm ml-2 ${awayWon ? 'text-white' : 'text-white/50'}`}>
                      {g.away_score}
                    </span>
                  )}
                </div>
                <div className={`flex items-center gap-2 ${homeWon ? 'opacity-100' : isFinal ? 'opacity-40' : ''}`}>
                  <TeamLogo teamId={g.home_team_id} />
                  <span className="font-display font-800 text-xs text-white uppercase tracking-wide">
                    {TEAM_SHORT[g.home_team_id] ?? g.home_team_id}
                  </span>
                  {isFinal && (
                    <span className={`font-display font-800 text-sm ml-2 ${homeWon ? 'text-white' : 'text-white/50'}`}>
                      {g.home_score}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                {isFinal ? (
                  <span className="font-display font-700 text-[10px] text-[var(--accent)] uppercase tracking-widest">Final</span>
                ) : (
                  <div>
                    <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">{formatDate(g.game_date)}</p>
                    {g.game_time && <p className="font-display font-800 text-xs text-white">{g.game_time.slice(0, 5)}</p>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
