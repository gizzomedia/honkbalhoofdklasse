import Image from 'next/image'
import Link from 'next/link'

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
  home_team_id: string
  away_team_id: string
  home_score: number | null
  away_score: number | null
  status: string
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
}

function TeamBlock({ teamId, score, won, isFinal }: {
  teamId: string
  score: number | null
  won: boolean
  isFinal: boolean
}) {
  const logo = TEAM_LOGOS[teamId]
  const color = TEAM_COLORS[teamId] ?? '#1e335a'
  const short = TEAM_SHORT[teamId] ?? teamId.slice(0, 3).toUpperCase()
  const dimmed = isFinal && !won

  return (
    <div className={`flex items-center gap-3 transition-opacity ${dimmed ? 'opacity-40' : 'opacity-100'}`}>
      <div
        className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 p-1.5"
        style={{ backgroundColor: color }}
      >
        {logo
          ? <Image src={logo} alt={short} width={32} height={32} className="object-contain w-full h-full" />
          : <span className="font-display font-800 text-white text-xs">{short}</span>
        }
      </div>
      <span className="font-display font-800 text-sm uppercase text-white tracking-wide flex-1">{short}</span>
      {isFinal && score !== null && (
        <span className={`font-display font-800 text-2xl tabular-nums ${won ? 'text-white' : 'text-white/50'}`}>
          {score}
        </span>
      )}
    </div>
  )
}

export default function ResultCards({ games }: { games: Game[] }) {
  if (games.length === 0) return null

  return (
    <div className="py-8 border-t border-[var(--border)]">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-[var(--accent)]" />
          <h2 className="font-display font-800 italic text-2xl uppercase text-white tracking-tight">
            <strong>Recente Uitslagen</strong>
          </h2>
        </div>
        <Link href="/uitslagen" className="font-display font-700 text-xs text-[var(--accent)] uppercase tracking-widest hover:underline">
          Alles →
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {games.map(g => {
          const homeWon = (g.home_score ?? 0) > (g.away_score ?? 0)
          const awayWon = (g.away_score ?? 0) > (g.home_score ?? 0)
          const isFinal = g.status === 'final'

          return (
            <div
              key={g.id}
              className="relative bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--accent)]/50 transition-all group"
            >
              {/* Winner color accent */}
              {isFinal && (
                <div
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: TEAM_COLORS[homeWon ? g.home_team_id : g.away_team_id] ?? '#fe3d00' }}
                />
              )}

              <div className="p-4 space-y-3">
                {/* Away team */}
                <TeamBlock
                  teamId={g.away_team_id}
                  score={g.away_score}
                  won={awayWon}
                  isFinal={isFinal}
                />

                {/* Divider */}
                <div className="flex items-center gap-2 px-1">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="font-display font-800 text-[10px] text-[var(--muted)] uppercase tracking-widest">vs</span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>

                {/* Home team */}
                <TeamBlock
                  teamId={g.home_team_id}
                  score={g.home_score}
                  won={homeWon}
                  isFinal={isFinal}
                />
              </div>

              {/* Footer */}
              <div className={`px-4 py-2 flex items-center justify-between border-t border-[var(--border)] ${
                isFinal ? 'bg-[var(--accent)]/10' : ''
              }`}>
                <span className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">
                  {formatDate(g.game_date)}
                </span>
                {isFinal && (
                  <span className="font-display font-800 text-[10px] text-[var(--accent)] uppercase tracking-widest">
                    Final
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
