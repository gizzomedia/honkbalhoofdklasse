import type { Metadata } from 'next'
import { ROSTERS, slugify } from '@/lib/rosters-data'
import { TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES } from '@/lib/teams'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 3600

const POS_LABELS: Record<string, string> = {
  P: 'Pitcher', C: 'Catcher', IF: 'Infielder', OF: 'Outfielder',
  'C/IF': 'Catcher / Infielder', UTL: 'Utility', DH: 'Designated Hitter',
}

const KNBSB_TEAM_IDS: Record<string, number> = {
  pirates: 39583, neptunus: 39587, hcaw: 39584,
  kinheim: 39586, twins: 39588, uvv: 39589, pioniers: 39585,
}

const KNBSB_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'nl-NL,nl;q=0.9',
  'Origin': 'https://stats.knbsbstats.nl',
  'Referer': 'https://stats.knbsbstats.nl/events/2026-lucky-day-hoofdklasse/stats/players/batting',
}

type SupplementalPlayer = { name: string; pos: 'P' | '?' }

async function getSupplementalPlayers(teamId: string, knownNames: Set<string>): Promise<SupplementalPlayer[]> {
  const teamNum = KNBSB_TEAM_IDS[teamId]
  if (!teamNum) return []

  function parseName(raw: string): string {
    const parts = raw.replace(/<[^>]+>/g, '|').split('|').map(s => s.trim()).filter(Boolean)
    return parts.length >= 2 ? `${parts[1]} ${parts[0].charAt(0) + parts[0].slice(1).toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}` : parts[0] ?? ''
  }

  async function fetchSection(section: string): Promise<string[]> {
    try {
      const url = `https://stats.knbsbstats.nl/api/v1/stats/events/2026-lucky-day-hoofdklasse/index?section=players&stats-section=${section}&round=&team=&split=&language=en`
      const res = await fetch(url, { headers: KNBSB_HEADERS, next: { revalidate: 3600 } })
      if (!res.ok) return []
      const d = await res.json()
      let data = d.data ?? []
      if (data.length && Array.isArray(data[0]?.data)) data = data.flatMap((c: { data: unknown[] }) => c.data)
      // Filter by teamid since the team query param is ignored by the API
      return (data as Record<string, unknown>[])
        .filter(p => Number(p.teamid) === teamNum)
        .map(p => parseName(String(p.name ?? '')))
        .filter(Boolean)
    } catch { return [] }
  }

  const [batters, pitchers] = await Promise.all([fetchSection('batting'), fetchSection('pitching')])
  const pitcherSet = new Set(pitchers.map(n => n.toLowerCase()))

  const seen = new Set<string>()
  const result: SupplementalPlayer[] = []
  for (const name of [...batters, ...pitchers]) {
    const lower = name.toLowerCase()
    if (knownNames.has(lower) || seen.has(lower) || !name) continue
    seen.add(lower)
    result.push({ name, pos: pitcherSet.has(lower) ? 'P' : '?' })
  }
  return result
}

const TEAM_DESCRIPTIONS: Record<string, string> = {
  neptunus:  'Curaçao Neptunus is the most decorated club in Dutch baseball history, based in Rotterdam.',
  pirates:   'Amsterdam Pirates is one of the premier baseball clubs in the Netherlands, based in Amsterdam.',
  kinheim:   'Kinheim is a competitive Dutch baseball club based in Haarlem.',
  hcaw:      'HCAW is a traditional Dutch baseball club based in Bussum.',
  twins:     'Oosterhout Twins is one of the leading baseball clubs in the Netherlands, based in Oosterhout.',
  pioniers:  'Hoofddorp Pioniers is a competitive Dutch baseball club based in Hoofddorp.',
  uvv:       'UVV is a Dutch baseball club based in Utrecht.',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamId: string }>
}): Promise<Metadata> {
  const { teamId } = await params
  const roster = ROSTERS[teamId]
  if (!roster) return {}
  const teamName = TEAM_NAMES[teamId] ?? teamId
  const playerNames = roster.players.slice(0, 6).map(p => p.name).join(', ')
  const description = `${teamName} roster for the 2026 KNBSB Honkbal Hoofdklasse season. Players include ${playerNames} and more.`
  const canonical = `https://honkbalhoofdklasse.com/rosters/${teamId}`
  return {
    title: `${teamName} Roster 2026 | Honkbal Hoofdklasse`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${teamName} · Honkbal Hoofdklasse 2026`,
      description,
      url: canonical,
    },
  }
}

export function generateStaticParams() {
  return Object.keys(ROSTERS).map(teamId => ({ teamId }))
}

export default async function TeamRosterPage({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const { teamId } = await params
  const roster = ROSTERS[teamId]
  if (!roster) notFound()

  const teamName  = TEAM_NAMES[teamId] ?? teamId
  const teamColor = TEAM_COLORS[teamId] ?? '#1e335a'
  const teamLogo  = TEAM_LOGOS[teamId]

  const knownNames = new Set(roster.players.map(p => p.name.toLowerCase()))
  const supplemental = await getSupplementalPlayers(teamId, knownNames)

  const sportsTeamSchema = {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: teamName,
    sport: 'Baseball',
    url: `https://honkbalhoofdklasse.com/rosters/${teamId}`,
    logo: teamLogo,
    memberOf: {
      '@type': 'SportsOrganization',
      '@id': 'https://honkbalhoofdklasse.com/#league',
      name: 'KNBSB Honkbal Hoofdklasse',
    },
    athlete: roster.players.map(p => ({
      '@type': 'Person',
      name: p.name,
      url: `https://honkbalhoofdklasse.com/rosters/${teamId}/${slugify(p.name)}`,
    })),
  }

  const sections = [
    { label: 'Pitchers',  filter: (pos: string) => pos === 'P' },
    { label: 'Catchers',  filter: (pos: string) => pos === 'C' || pos === 'C/IF' },
    { label: 'Infield',   filter: (pos: string) => pos === 'IF' || pos === 'C/IF' },
    { label: 'Outfield',  filter: (pos: string) => pos === 'OF' },
    { label: 'Utility',   filter: (pos: string) => pos === 'UTL' || pos === 'DH' },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsTeamSchema) }}
      />
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-8">

        <Link
          href="/rosters"
          className="inline-flex items-center gap-2 font-display font-700 text-xs text-[var(--muted)] hover:text-white uppercase tracking-widest transition-colors"
        >
          ← All Teams
        </Link>

        {/* Team header */}
        <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] p-6 md:p-8">
          <div className="absolute inset-0 opacity-10" style={{ backgroundColor: teamColor }} />
          <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: teamColor }} />
          <div className="relative flex items-center gap-6 flex-wrap">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 p-3"
              style={{ backgroundColor: teamColor }}>
              <Image src={teamLogo} alt={teamName} width={60} height={60} className="object-contain w-full h-full" />
            </div>
            <div>
              <p className="font-display font-700 text-xs uppercase tracking-widest mb-1"
                style={{ color: teamColor === '#121b31' ? 'var(--accent)' : teamColor }}>
                Honkbal Hoofdklasse · 2026
              </p>
              <h1 className="font-display font-800 italic text-4xl md:text-5xl uppercase text-white leading-none tracking-tight">
                <strong>{teamName}</strong>
              </h1>
              <p className="font-display font-700 text-sm text-[var(--muted)] mt-2">
                {TEAM_DESCRIPTIONS[teamId]}
              </p>
            </div>
          </div>
        </div>

        {/* Players by position */}
        {sections.map(sec => {
          const players = roster.players.filter(p => sec.filter(p.pos))
          if (!players.length) return null
          return (
            <section key={sec.label}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-5 shrink-0" style={{ backgroundColor: teamColor }} />
                <h2 className="font-display font-800 italic text-xl uppercase text-white tracking-tight">
                  <strong>{sec.label}</strong>
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {players.map(player => (
                  <Link
                    key={player.name}
                    href={`/rosters/${teamId}/${slugify(player.name)}`}
                    className="flex items-center gap-4 bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 hover:border-[var(--accent)]/60 hover:bg-[var(--card-hover)] transition-all group"
                  >
                    <span className="font-display font-800 text-lg w-8 text-center shrink-0"
                      style={{ color: teamColor === '#121b31' ? '#f59e0b' : teamColor }}>
                      #{player.uniform}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-800 text-sm uppercase text-white group-hover:text-[var(--accent)] transition-colors truncate">
                        <strong>{player.name}</strong>
                      </p>
                      <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">
                        {POS_LABELS[player.pos] ?? player.pos} · B/T {player.bt} · {new Date().getFullYear() - player.yob} yrs
                      </p>
                    </div>
                    <span className="text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors text-sm shrink-0">→</span>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}

        {/* Supplemental players — in stats but not yet in static roster */}
        {supplemental.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-5 shrink-0 bg-[var(--muted)]" />
              <h2 className="font-display font-800 italic text-xl uppercase text-white tracking-tight">
                <strong>Nieuw dit seizoen</strong>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {supplemental.map(player => (
                <div
                  key={player.name}
                  className="flex items-center gap-4 bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3"
                >
                  <span className="font-display font-800 text-lg w-8 text-center shrink-0 text-[var(--muted)]">—</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-800 text-sm uppercase text-white truncate">
                      <strong>{player.name}</strong>
                    </p>
                    <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">
                      {player.pos === 'P' ? 'Pitcher' : 'Positiespeler'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Coaching staff */}
        {roster.coaches.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-5 bg-[var(--border)] shrink-0" />
              <h2 className="font-display font-800 italic text-xl uppercase text-white tracking-tight">
                <strong>Coaching Staff</strong>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {roster.coaches.map(coach => (
                <div key={coach.name}
                  className="flex items-center gap-4 bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3">
                  <span className="font-display font-800 text-lg w-8 text-center shrink-0 text-[var(--muted)]">
                    #{coach.uniform}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-800 text-sm uppercase text-white truncate">
                      <strong>{coach.name}</strong>
                    </p>
                    <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest">
                      {coach.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </>
  )
}
