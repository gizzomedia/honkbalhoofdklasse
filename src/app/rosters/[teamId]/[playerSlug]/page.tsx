import { ROSTERS, slugify } from '@/lib/rosters-data'
import { AWARD_CATEGORIES, getAwardsByPlayer } from '@/lib/awards-data'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES, TEAM_SHORT } from '@/lib/teams'

export const revalidate = 86400

export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamId: string; playerSlug: string }>
}): Promise<Metadata> {
  const { teamId, playerSlug } = await params
  const roster = ROSTERS[teamId]
  if (!roster) return {}
  const player = roster.players.find(p => slugify(p.name) === playerSlug)
  if (!player) return {}
  const teamName = TEAM_NAMES[teamId] ?? teamId
  const posLabel = POS_LABELS[player.pos] ?? player.pos
  const description = `${player.name} is a ${posLabel} for ${teamName} in the 2026 KNBSB Honkbal Hoofdklasse. #${player.uniform} · B/T ${player.bt} · Born ${player.yob}.`
  const canonical = `https://honkbalhoofdklasse.com/rosters/${teamId}/${playerSlug}`
  return {
    title: `${player.name} – ${posLabel} | ${teamName} | Honkbal Hoofdklasse 2026`,
    description,
    alternates: { canonical },
    openGraph: { title: `${player.name} · ${teamName} · Honkbal Hoofdklasse`, description, url: canonical },
  }
}

export function generateStaticParams() {
  const params: { teamId: string; playerSlug: string }[] = []
  for (const [teamId, roster] of Object.entries(ROSTERS)) {
    for (const player of roster.players) {
      params.push({ teamId, playerSlug: slugify(player.name) })
    }
  }
  return params
}

const POS_LABELS: Record<string, string> = {
  P: 'Pitcher', C: 'Catcher', IF: 'Infielder', OF: 'Outfielder',
  'C/IF': 'Catcher / Infielder', UTL: 'Utility', DH: 'Designated Hitter',
}

type BattingRow  = { year:string; age:string; lg:string; team:string; g:string; ab:string; r:string; h:string; d:string; t:string; hr:string; rbi:string; bb:string; so:string; avg:string; obp:string; slg:string }
type PitchingRow = { year:string; age:string; lg:string; team:string; w:string; l:string; era:string; g:string; gs:string; sv:string; ip:string; h:string; bb:string; so:string; whip:string }

async function getCareerStats(bbrefId: string): Promise<{ batting: BattingRow[]; pitching: PitchingRow[] }> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honkbalhoofdklasse.com'
    const res = await fetch(`${base}/api/career-stats?id=${encodeURIComponent(bbrefId)}`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return { batting: [], pitching: [] }
    return res.json()
  } catch { return { batting: [], pitching: [] } }
}

async function getPlayerPhotos(playerName: string): Promise<{ banner_url: string | null; headshot_url: string | null }> {
  const { data } = await supabase
    .from('player_photos')
    .select('banner_url, headshot_url')
    .ilike('player_name', playerName)
    .limit(1)
    .maybeSingle()
  return data ?? { banner_url: null, headshot_url: null }
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ teamId: string; playerSlug: string }>
}) {
  const { teamId, playerSlug } = await params
  const roster = ROSTERS[teamId]
  if (!roster) notFound()

  const player = roster.players.find(p => slugify(p.name) === playerSlug)
  if (!player) notFound()

  const [awards, photos, career] = await Promise.all([
    Promise.resolve(getAwardsByPlayer(player.name)),
    getPlayerPhotos(player.name),
    player.bbref_id ? getCareerStats(player.bbref_id) : Promise.resolve({ batting: [], pitching: [] }),
  ])
  const teamColor = TEAM_COLORS[teamId] ?? '#1e335a'
  const teamLogo = TEAM_LOGOS[teamId]
  const teamName = TEAM_NAMES[teamId] ?? teamId
  const age = new Date().getFullYear() - player.yob
  const posLabel = POS_LABELS[player.pos] ?? player.pos

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': ['Person', 'Athlete'],
    name: player.name,
    url: `https://honkbalhoofdklasse.com/rosters/${teamId}/${playerSlug}`,
    sport: 'Baseball',
    description: `${player.name} is a ${posLabel} for ${teamName} in the 2026 KNBSB Honkbal Hoofdklasse. #${player.uniform}.`,
    birthDate: String(player.yob),
    affiliation: {
      '@type': 'SportsTeam',
      name: teamName,
      url: `https://honkbalhoofdklasse.com/rosters/${teamId}`,
      memberOf: {
        '@type': 'SportsOrganization',
        '@id': 'https://honkbalhoofdklasse.com/#league',
        name: 'KNBSB Honkbal Hoofdklasse',
      },
    },
    ...(player.instagram ? { sameAs: [`https://www.instagram.com/${player.instagram}/`] } : {}),
  }

  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
    />
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-8">

      {/* Terug knop + acties */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href="/rosters"
          className="inline-flex items-center gap-2 font-display font-700 text-xs text-[var(--muted)] hover:text-white uppercase tracking-widest transition-colors"
        >
          ← Rosters
        </Link>
        <Link
          href={`/compare?a=${encodeURIComponent(player.name)}`}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-display font-800 text-sm uppercase tracking-wider bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)] text-white transition-colors"
        >
          Compare
        </Link>
      </div>

      {/* Player header card */}
      <div className="relative rounded-2xl overflow-hidden border border-[var(--border)]">
        {photos.banner_url ? (
          /* MLB-style: full banner photo */
          <div className="relative">
            <div className="relative h-48 md:h-64 w-full overflow-hidden">
              <Image
                src={photos.banner_url}
                alt={player.name}
                fill
                className="object-cover object-top"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a1220]" />
            </div>

            <div className="relative px-6 pb-6 -mt-16 flex items-end gap-5 flex-wrap">
              {/* Round headshot over banner */}
              {photos.headshot_url && (
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-[#0a1220] shrink-0 shadow-xl">
                  <Image src={photos.headshot_url} alt={player.name} fill className="object-cover" />
                </div>
              )}

              {/* Player info */}
              <div className="flex-1 min-w-0 pb-1">
                <p className="font-display font-700 text-xs uppercase tracking-widest mb-1"
                  style={{ color: teamColor === '#121b31' ? 'var(--accent)' : teamColor }}>
                  {teamName}
                </p>
                <h1 className="font-display font-800 italic text-4xl md:text-5xl uppercase text-white leading-none tracking-tight">
                  <strong>{player.name}</strong>
                </h1>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <span className="font-display font-800 text-lg text-white/60">#{player.uniform}</span>
                  <span className="font-display font-700 text-sm text-[var(--muted)] uppercase tracking-wider">{posLabel}</span>
                  <span className="font-display font-700 text-sm text-[var(--muted)] uppercase tracking-wider">B/T: {player.bt}</span>
                  <span className="font-display font-700 text-sm text-[var(--muted)] uppercase tracking-wider">{age} yrs</span>
                  <span className="font-display font-700 text-sm text-[var(--muted)] uppercase tracking-wider">Born {player.yob}</span>
                </div>
              </div>

              {/* Instagram */}
              {player.instagram && (
                <a
                  href={`https://instagram.com/${player.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-800 text-sm uppercase tracking-wider text-white transition-colors shrink-0 self-end"
                  style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  @{player.instagram}
                </a>
              )}
            </div>
          </div>
        ) : (
          /* Fallback: team color card */
          <>
            <div className="absolute inset-0" style={{ backgroundColor: teamColor, opacity: 0.15 }} />
            <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: teamColor }} />

            <div className="relative p-6 md:p-8 flex items-center gap-6 flex-wrap">
              {/* Team logo */}
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 p-3"
                style={{ backgroundColor: teamColor }}>
                <Image src={teamLogo} alt={teamId} width={60} height={60} className="object-contain w-full h-full" />
              </div>

              {/* Player info */}
              <div className="flex-1 min-w-0">
                <p className="font-display font-700 text-xs uppercase tracking-widest mb-1"
                  style={{ color: teamColor === '#121b31' ? 'var(--accent)' : teamColor }}>
                  {teamName}
                </p>
                <h1 className="font-display font-800 italic text-4xl md:text-5xl uppercase text-white leading-none tracking-tight">
                  <strong>{player.name}</strong>
                </h1>
                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  <span className="font-display font-800 text-lg text-white/60">#{player.uniform}</span>
                  <span className="font-display font-700 text-sm text-[var(--muted)] uppercase tracking-wider">{posLabel}</span>
                  <span className="font-display font-700 text-sm text-[var(--muted)] uppercase tracking-wider">B/T: {player.bt}</span>
                  <span className="font-display font-700 text-sm text-[var(--muted)] uppercase tracking-wider">{age} yrs</span>
                  <span className="font-display font-700 text-sm text-[var(--muted)] uppercase tracking-wider">Born {player.yob}</span>
                </div>
              </div>

              {/* Instagram link */}
              {player.instagram && (
                <a
                  href={`https://instagram.com/${player.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-800 text-sm uppercase tracking-wider text-white transition-colors shrink-0"
                  style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  @{player.instagram}
                </a>
              )}
            </div>
          </>
        )}
      </div>

      {/* Awards sectie */}
      {awards.length > 0 ? (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-[var(--accent)] shrink-0" />
            <h2 className="font-display font-800 italic text-2xl uppercase text-white tracking-tight">
              <strong>Awards</strong>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {awards.map((award, i) => {
              const cat = AWARD_CATEGORIES.find(c => c.key === award.category)
              return (
                <div key={i}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4">
                  <div>
                    <p className="font-display font-800 text-base uppercase text-white leading-tight">
                      {cat?.en ?? cat?.nl ?? award.category}
                    </p>
                    {award.label && (
                      <p className="font-display font-700 text-xs text-[var(--accent)] uppercase tracking-widest mt-0.5">{award.label}</p>
                    )}
                    <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest mt-0.5">
                      Season {award.season}
                    </p>
                    {award.note && (
                      <p className="font-display font-700 text-xs text-[var(--muted)] mt-1 italic">{award.note}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-[var(--accent)] shrink-0" />
            <h2 className="font-display font-800 italic text-2xl uppercase text-white tracking-tight">
              <strong>Awards</strong>
            </h2>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center">
            <p className="font-display font-800 text-xl uppercase text-[var(--muted)] italic">No awards yet</p>
            <p className="font-display font-700 text-sm text-[var(--muted)] uppercase tracking-widest mt-2">
              Awards will appear here once announced
            </p>
            <Link href="/awards" className="inline-block mt-4 font-display font-700 text-xs text-[var(--accent)] uppercase tracking-widest hover:underline">
              View all awards →
            </Link>
          </div>
        </section>
      )}

      {/* Career Stats */}
      {(career.batting.length > 0 || career.pitching.length > 0) && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-6 bg-[var(--accent)] shrink-0" />
            <h2 className="font-display font-800 italic text-2xl uppercase text-white tracking-tight">
              <strong>Career Stats</strong>
            </h2>
            {player.bbref_id && (
              <a
                href={`https://www.baseball-reference.com/register/player.fcgi?id=${player.bbref_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto font-display font-700 text-[10px] text-[var(--muted)] hover:text-white uppercase tracking-widest transition-colors"
              >
                Baseball Reference →
              </a>
            )}
          </div>

          {career.batting.length > 0 && (
            <div className="mb-5">
              <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-2">Batting</p>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      {['Year','Age','Lg','Team','G','AB','R','H','2B','3B','HR','RBI','BB','SO','AVG','OBP','SLG'].map(h => (
                        <th key={h} className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest px-2 py-2 text-center whitespace-nowrap first:text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {career.batting.map((row, i) => {
                      const isCareer = row.year === 'Career'
                      return (
                        <tr key={i} className={`border-b border-[var(--border)] last:border-0 ${isCareer ? 'bg-[var(--accent)]/5 font-bold' : 'hover:bg-[var(--card-hover)]'} transition-colors`}>
                          <td className={`font-display font-800 px-2 py-2 text-left whitespace-nowrap ${isCareer ? 'text-[var(--accent)]' : 'text-white'}`}>{row.year}</td>
                          <td className="font-display font-700 px-2 py-2 text-center text-[var(--muted)]">{row.age}</td>
                          <td className="font-display font-700 px-2 py-2 text-center text-[var(--muted)] whitespace-nowrap">{row.lg}</td>
                          <td className="font-display font-800 px-2 py-2 text-center text-white whitespace-nowrap">{row.team}</td>
                          {[row.g,row.ab,row.r,row.h,row.d,row.t,row.hr,row.rbi,row.bb,row.so].map((v,j) => (
                            <td key={j} className="font-display font-700 px-2 py-2 text-center text-white">{v||'–'}</td>
                          ))}
                          <td className="font-display font-800 px-2 py-2 text-center" style={{ color: teamColor }}>{row.avg||'–'}</td>
                          <td className="font-display font-700 px-2 py-2 text-center text-white">{row.obp||'–'}</td>
                          <td className="font-display font-700 px-2 py-2 text-center text-white">{row.slg||'–'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {career.pitching.length > 0 && (
            <div>
              <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-2">Pitching</p>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      {['Year','Age','Lg','Team','W','L','ERA','G','GS','SV','IP','H','BB','SO','WHIP'].map(h => (
                        <th key={h} className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest px-2 py-2 text-center whitespace-nowrap first:text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {career.pitching.map((row, i) => {
                      const isCareer = row.year === 'Career'
                      return (
                        <tr key={i} className={`border-b border-[var(--border)] last:border-0 ${isCareer ? 'bg-[var(--accent)]/5' : 'hover:bg-[var(--card-hover)]'} transition-colors`}>
                          <td className={`font-display font-800 px-2 py-2 text-left whitespace-nowrap ${isCareer ? 'text-[var(--accent)]' : 'text-white'}`}>{row.year}</td>
                          <td className="font-display font-700 px-2 py-2 text-center text-[var(--muted)]">{row.age}</td>
                          <td className="font-display font-700 px-2 py-2 text-center text-[var(--muted)] whitespace-nowrap">{row.lg}</td>
                          <td className="font-display font-800 px-2 py-2 text-center text-white whitespace-nowrap">{row.team}</td>
                          <td className="font-display font-800 px-2 py-2 text-center text-white">{row.w||'–'}</td>
                          <td className="font-display font-700 px-2 py-2 text-center text-white">{row.l||'–'}</td>
                          <td className="font-display font-800 px-2 py-2 text-center" style={{ color: teamColor }}>{row.era||'–'}</td>
                          {[row.g,row.gs,row.sv,row.ip,row.h,row.bb,row.so,row.whip].map((v,j) => (
                            <td key={j} className="font-display font-700 px-2 py-2 text-center text-white">{v||'–'}</td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Stats link */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 bg-[var(--accent)] shrink-0" />
          <h2 className="font-display font-800 italic text-2xl uppercase text-white tracking-tight">
            <strong>Stats</strong>
          </h2>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-display font-800 text-base uppercase text-white">KNBSB Stats</p>
            <p className="font-display font-700 text-sm text-[var(--muted)] mt-1">
              View full statistics on the KNBSB stats website
            </p>
          </div>
          <a
            href={`https://stats.knbsbstats.nl/events/2026-lucky-day-hoofdklasse/roster`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 bg-[var(--accent)] px-5 py-2.5 font-display font-800 text-sm uppercase tracking-wider text-white hover:bg-[var(--accent)]/80 transition-colors rounded-lg"
          >
            View Stats →
          </a>
        </div>
      </section>

      {/* Instagram team feed */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 bg-[var(--accent)] shrink-0" />
          <h2 className="font-display font-800 italic text-2xl uppercase text-white tracking-tight">
            <strong>Photos</strong>
          </h2>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-display font-800 text-base uppercase text-white">@honkbalhoofdklasse</p>
            <p className="font-display font-700 text-sm text-[var(--muted)] mt-1">
              Follow us on Instagram for the latest photos and videos
            </p>
          </div>
          <a
            href="https://www.instagram.com/honkbalhoofdklasse/"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg font-display font-800 text-sm uppercase tracking-wider text-white transition-opacity hover:opacity-80"
            style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Follow
          </a>
        </div>
      </section>

    </div>
    </>
  )
}
