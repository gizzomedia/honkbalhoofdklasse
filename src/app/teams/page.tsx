import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { TEAM_IDS, TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES } from '@/lib/teams'
import { fetchAllTeamStats } from '@/lib/team-stats'

export const metadata: Metadata = {
  title: 'Teams | Honkbal Hoofdklasse 2026',
  description: 'Teamstatistieken van alle 7 clubs in de KNBSB Honkbal Hoofdklasse 2026. Batting average, ERA, runs en meer per team.',
  alternates: { canonical: 'https://honkbalhoofdklasse.com/teams' },
}

export const revalidate = 300

type Standing = {
  team_id: string; wins: number; losses: number; win_pct: number
  runs_scored: number; runs_allowed: number; games_played: number
}

async function getStandings(): Promise<Standing[]> {
  const { data } = await supabase
    .from('standings')
    .select('team_id, wins, losses, win_pct, runs_scored, runs_allowed, games_played')
    .eq('season', new Date().getFullYear())
    .order('wins', { ascending: false })
    .order('win_pct', { ascending: false })
  return (data ?? []) as Standing[]
}

function fmtRate(v: number): string {
  return v.toFixed(3).replace(/^0\./, '.')
}

export default async function TeamsPage() {
  const [standings, { batting, pitching }] = await Promise.all([
    getStandings(),
    fetchAllTeamStats(),
  ])

  const batMap  = Object.fromEntries(batting.map(b => [b.teamId, b]))
  const pitMap  = Object.fromEntries(pitching.map(p => [p.teamId, p]))

  // Sort by standings order (same as /stand)
  const orderedIds = standings.length
    ? standings.map(s => s.team_id).filter(id => TEAM_IDS.includes(id as never))
    : [...TEAM_IDS]

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
      <div className="mb-8">
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">Season 2026</p>
        <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
          <strong>Teams</strong>
        </h1>
        <p className="text-[var(--muted)] text-sm mt-3 max-w-xl leading-relaxed">
          Season statistics for all seven clubs in the KNBSB Honkbal Hoofdklasse 2026. Click a team for the full breakdown.
        </p>
      </div>

      <div className="space-y-3">
        {orderedIds.map((teamId, i) => {
          const s   = standings.find(x => x.team_id === teamId)
          const bat = batMap[teamId]
          const pit = pitMap[teamId]
          const color = TEAM_COLORS[teamId] ?? '#1e335a'
          const name  = TEAM_NAMES[teamId] ?? teamId
          const logo  = TEAM_LOGOS[teamId]
          const rd    = s ? s.runs_scored - s.runs_allowed : 0

          return (
            <Link
              key={teamId}
              href={`/teams/${teamId}`}
              className="flex items-center gap-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl px-5 py-4 hover:border-[var(--accent)]/40 hover:bg-[var(--card-hover)] transition-all group"
            >
              {/* Rank */}
              <span className="font-display font-800 text-2xl text-[var(--muted)] w-6 shrink-0">{i + 1}</span>

              {/* Logo */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 p-2" style={{ backgroundColor: color }}>
                {logo
                  ? <Image src={logo} alt={name} width={40} height={40} className="object-contain w-full h-full" />
                  : <span className="font-display font-800 text-xs text-white">{teamId.slice(0, 3).toUpperCase()}</span>
                }
              </div>

              {/* Name + record */}
              <div className="flex-1 min-w-0">
                <p className="font-display font-800 text-lg uppercase tracking-wide text-white leading-none">{name}</p>
                {s && (
                  <p className="font-display font-700 text-xs text-[var(--muted)] mt-1">
                    {s.wins}–{s.losses} &middot; {s.win_pct.toFixed(3).replace('0.', '.')}
                    &middot; <span className={rd >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {rd >= 0 ? '+' : ''}{rd} run diff
                    </span>
                  </p>
                )}
              </div>

              {/* Key batting stats */}
              {bat && (
                <div className="hidden md:flex gap-6 shrink-0">
                  <div className="text-center">
                    <p className="font-display font-700 text-[10px] uppercase text-[var(--muted)] tracking-wider">BA</p>
                    <p className="font-display font-800 text-base text-white">{fmtRate(bat.avg)}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-display font-700 text-[10px] uppercase text-[var(--muted)] tracking-wider">HR</p>
                    <p className="font-display font-800 text-base text-white">{bat.hr}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-display font-700 text-[10px] uppercase text-[var(--muted)] tracking-wider">R</p>
                    <p className="font-display font-800 text-base text-white">{bat.r}</p>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="hidden md:block w-px h-8 bg-white/10 shrink-0" />

              {/* Key pitching stats */}
              {pit && (
                <div className="hidden md:flex gap-6 shrink-0">
                  <div className="text-center">
                    <p className="font-display font-700 text-[10px] uppercase text-[var(--muted)] tracking-wider">ERA</p>
                    <p className="font-display font-800 text-base text-white">{pit.era.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-display font-700 text-[10px] uppercase text-[var(--muted)] tracking-wider">SO</p>
                    <p className="font-display font-800 text-base text-white">{pit.pitch_so}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-display font-700 text-[10px] uppercase text-[var(--muted)] tracking-wider">WHIP</p>
                    <p className="font-display font-800 text-base text-white">{pit.whip.toFixed(2)}</p>
                  </div>
                </div>
              )}

              <span className="font-display font-800 text-[var(--accent)] text-xl group-hover:translate-x-1 transition-transform shrink-0">→</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
