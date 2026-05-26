import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  TEAM_IDS, TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES, TEAM_SHORT, teamAccent
} from '@/lib/teams'
import { fetchAllTeamStats } from '@/lib/team-stats'
import { ROSTERS } from '@/lib/rosters-data'

export const revalidate = 300

export async function generateStaticParams() {
  return TEAM_IDS.map(id => ({ teamId: id }))
}

export async function generateMetadata({ params }: { params: Promise<{ teamId: string }> }): Promise<Metadata> {
  const { teamId } = await params
  const name = TEAM_NAMES[teamId] ?? teamId
  return {
    title: `${name} | Honkbal Hoofdklasse 2026`,
    description: `Seizoensstatistieken voor ${name} in de KNBSB Honkbal Hoofdklasse 2026. Batting, pitching, roster en wedstrijdresultaten.`,
    alternates: { canonical: `https://honkbalhoofdklasse.com/teams/${teamId}` },
  }
}

type Standing = {
  wins: number; losses: number; win_pct: number
  runs_scored: number; runs_allowed: number; games_played: number
}
type Game = {
  external_id: string; game_date: string
  home_team_id: string; away_team_id: string
  home_score: number | null; away_score: number | null
}

function fmtRate(v: number): string {
  return v.toFixed(3).replace(/^0\./, '.')
}
function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
}

function StatRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg ${highlight ? 'bg-white/5' : ''}`}>
      <span className="font-display font-700 text-xs uppercase text-[var(--muted)] tracking-wider">{label}</span>
      <span className="font-display font-800 text-sm text-white">{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[var(--border)]">
        <p className="font-display font-800 text-sm uppercase text-white tracking-wide">{title}</p>
      </div>
      <div className="p-3 space-y-0.5">{children}</div>
    </div>
  )
}

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params
  if (!TEAM_IDS.includes(teamId as never)) notFound()

  const name   = TEAM_NAMES[teamId]
  const color  = TEAM_COLORS[teamId] ?? '#1e335a'
  const logo   = TEAM_LOGOS[teamId]
  const accent = teamAccent(teamId)
  const roster = ROSTERS[teamId]

  const [standingRes, gamesRes, { batting, pitching }] = await Promise.all([
    supabase
      .from('standings')
      .select('wins, losses, win_pct, runs_scored, runs_allowed, games_played')
      .eq('season', new Date().getFullYear())
      .eq('team_id', teamId)
      .maybeSingle(),
    supabase
      .from('games')
      .select('external_id, game_date, home_team_id, away_team_id, home_score, away_score')
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .not('home_score', 'is', null)
      .order('game_date', { ascending: false })
      .limit(6),
    fetchAllTeamStats(),
  ])

  const standing = standingRes.data as Standing | null
  const games    = (gamesRes.data ?? []) as Game[]
  const bat      = batting.find(b => b.teamId === teamId)
  const pit      = pitching.find(p => p.teamId === teamId)

  const rd = standing ? standing.runs_scored - standing.runs_allowed : 0

  // All teams for league rank sorting
  const allTeams = [...batting].sort((a, b) => b.avg - a.avg)
  const avgRank  = allTeams.findIndex(t => t.teamId === teamId) + 1

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">

      {/* Back */}
      <Link href="/teams" className="inline-flex items-center gap-2 font-display font-700 text-sm text-[var(--muted)] hover:text-white transition-colors uppercase tracking-wider">
        ← All Teams
      </Link>

      {/* Hero header */}
      <div
        className="rounded-3xl overflow-hidden border border-[var(--border)] relative"
        style={{ backgroundColor: color }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{ background: `radial-gradient(ellipse at 80% 50%, ${accent} 0%, transparent 70%)` }}
        />
        <div className="relative flex items-center gap-6 px-6 md:px-10 py-8">
          {logo && (
            <div className="w-20 h-20 md:w-28 md:h-28 shrink-0 flex items-center justify-center">
              <Image src={logo} alt={name} width={112} height={112} className="object-contain w-full h-full drop-shadow-xl" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display font-700 text-white/60 uppercase tracking-widest text-xs mb-1">Honkbal Hoofdklasse 2026</p>
            <h1 className="font-display font-800 italic text-4xl md:text-5xl uppercase tracking-tight text-white leading-none">
              <strong>{name}</strong>
            </h1>
            {standing && (
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <p className="font-display font-800 text-2xl text-white">
                  {standing.wins}–{standing.losses}
                  <span className="text-white/50 font-700 text-lg ml-2">{fmtRate(standing.win_pct)}</span>
                </p>
                <div className="flex items-center gap-3 text-white/70">
                  <span className="font-display font-700 text-sm">{standing.games_played} G</span>
                  <span className="font-display font-700 text-sm">RS {standing.runs_scored}</span>
                  <span className="font-display font-700 text-sm">RA {standing.runs_allowed}</span>
                  <span className={`font-display font-800 text-sm ${rd >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {rd >= 0 ? '+' : ''}{rd} RD
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Batting */}
        {bat && (
          <Section title="Team Batting">
            <StatRow label="Batting Average"    value={fmtRate(bat.avg)}  highlight />
            <StatRow label="On-Base Pct"        value={fmtRate(bat.obp)} />
            <StatRow label="Slugging Pct"       value={fmtRate(bat.slg)}  highlight />
            <StatRow label="OPS"                value={fmtRate(bat.ops)} />
            <StatRow label="Runs Scored"        value={bat.r}             highlight />
            <StatRow label="Hits"               value={bat.h} />
            <StatRow label="Home Runs"          value={bat.hr}            highlight />
            <StatRow label="RBI"                value={bat.rbi} />
            <StatRow label="Doubles"            value={bat.double}        highlight />
            <StatRow label="Triples"            value={bat.triple} />
            <StatRow label="Stolen Bases"       value={`${bat.sb} (${bat.cs} CS)`} highlight />
            <StatRow label="Walks"              value={bat.bb} />
            <StatRow label="Strikeouts"         value={bat.so}            highlight />
            <StatRow label="At Bats"            value={bat.ab} />
            <StatRow label="Total Bases"        value={bat.tb}            highlight />
          </Section>
        )}

        {/* Pitching */}
        {pit && (
          <Section title="Team Pitching">
            <StatRow label="ERA"                value={pit.era.toFixed(2)} highlight />
            <StatRow label="WHIP"               value={pit.whip.toFixed(2)} />
            <StatRow label="Innings Pitched"    value={pit.ip}             highlight />
            <StatRow label="Strikeouts"         value={pit.pitch_so} />
            <StatRow label="Walks"              value={pit.pitch_bb}       highlight />
            <StatRow label="Hits Allowed"       value={pit.pitch_h} />
            <StatRow label="Runs Allowed"       value={pit.pitch_r}        highlight />
            <StatRow label="Earned Runs"        value={pit.pitch_er} />
            <StatRow label="Home Runs Allowed"  value={pit.pitch_hr}       highlight />
            <StatRow label="Complete Games"     value={pit.pitch_cg} />
            <StatRow label="Shutouts"           value={pit.pitch_sho}      highlight />
            <StatRow label="Saves"              value={pit.pitch_save} />
            <StatRow label="Opp Batting Avg"    value={fmtRate(pit.bavg)}  highlight />
          </Section>
        )}

        {/* Recent results */}
        {games.length > 0 && (
          <Section title="Recent Results">
            {games.slice(0, 6).map(g => {
              const isHome  = g.home_team_id === teamId
              const opp     = isHome ? g.away_team_id : g.home_team_id
              const ourScore  = isHome ? g.home_score : g.away_score
              const oppScore  = isHome ? g.away_score : g.home_score
              const won     = ourScore !== null && oppScore !== null && ourScore > oppScore
              const oppName = TEAM_SHORT[opp] ?? opp.toUpperCase()
              const oppLogo = TEAM_LOGOS[opp]
              const oppColor = TEAM_COLORS[opp] ?? '#1e335a'

              return (
                <div key={g.external_id} className={`flex items-center gap-3 px-2 py-2 rounded-lg ${won ? 'bg-green-900/10' : 'bg-red-900/10'}`}>
                  <span className={`font-display font-800 text-xs w-3 ${won ? 'text-green-400' : 'text-red-400'}`}>{won ? 'W' : 'L'}</span>
                  <span className="font-display font-700 text-xs text-[var(--muted)] w-24 shrink-0">{fmtDate(g.game_date)}</span>
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="font-display font-700 text-xs text-white/50">{isHome ? 'vs' : '@'}</span>
                    <div className="w-5 h-5 rounded flex items-center justify-center p-0.5" style={{ backgroundColor: oppColor }}>
                      {oppLogo
                        ? <Image src={oppLogo} alt={oppName} width={16} height={16} className="object-contain w-full h-full" />
                        : <span className="text-white text-[8px] font-bold">{oppName.slice(0, 3)}</span>
                      }
                    </div>
                    <span className="font-display font-700 text-xs text-white">{oppName}</span>
                  </div>
                  <span className={`font-display font-800 text-sm ${won ? 'text-green-400' : 'text-red-400'}`}>
                    {ourScore}–{oppScore}
                  </span>
                </div>
              )
            })}
          </Section>
        )}

        {/* Roster */}
        {roster && (
          <Section title={`Roster (${roster.players.length} players)`}>
            {roster.players.map(p => (
              <div key={p.name} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
                <span className="font-display font-700 text-[10px] text-[var(--muted)] w-5 text-right shrink-0">#{p.uniform}</span>
                <span className="font-display font-700 text-xs text-white flex-1">{p.name}</span>
                <span className="font-display font-700 text-[10px] uppercase text-[var(--muted)] shrink-0">{p.pos}</span>
                <span className="font-display font-700 text-[10px] text-[var(--muted)]/60 shrink-0">{p.bt}</span>
              </div>
            ))}
          </Section>
        )}
      </div>

      {/* League rank teaser */}
      {bat && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-5 py-4">
          <p className="font-display font-700 text-xs uppercase text-[var(--muted)] tracking-wider mb-1">League Rank</p>
          <p className="font-display font-800 text-white">
            Batting average: <span style={{ color: accent }}>#{avgRank}</span> in the league
          </p>
          <p className="font-display font-700 text-xs text-[var(--muted)] mt-1">
            See individual player rankings on the <Link href="/leaders" className="text-[var(--accent)] hover:underline">Leaders page</Link>
          </p>
        </div>
      )}
    </div>
  )
}
