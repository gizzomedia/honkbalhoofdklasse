import type { Metadata } from 'next'
import { AWARD_CATEGORIES, AWARDS } from '@/lib/awards-data'
import { slugify } from '@/lib/rosters-data'
import Image from 'next/image'
import Link from 'next/link'
import { TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES, TEAM_SHORT } from '@/lib/teams'

export const metadata: Metadata = {
  title: 'Awards 2026',
  description: 'De awards van de Honkbal Hoofdklasse 2026. Hottest Player, Pitcher en Hitter of the Month.',
  alternates: { canonical: 'https://honkbalhoofdklasse.com/awards' },
}

export const revalidate = false

export default function AwardsPage() {
  const season2026 = AWARDS.filter(a => a.season === 2026)

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-12">
      <div>
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">Hoofdklasse · Season 2026</p>
        <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
          <strong>Awards</strong>
        </h1>
        <p className="font-display font-700 text-[var(--muted)] text-sm mt-2 uppercase tracking-wider">
          Season 2026 award winners
        </p>
        <p className="text-[var(--muted)] text-sm mt-3 max-w-xl leading-relaxed">
          The Honkbal Hoofdklasse recognises outstanding performances each season with awards for the best hitters, pitchers and players of the week. Winners are chosen from all seven clubs competing in the KNBSB Hoofdklasse.
        </p>
      </div>

      <div className="space-y-8">
        {AWARD_CATEGORIES.map(cat => {
          const winners = season2026.filter(a => a.category === cat.key)

          return (
            <section key={cat.key} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
              {/* Category header */}
              <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-[var(--border)]">
                <div>
                  <h2 className="font-display font-800 italic text-2xl uppercase text-white leading-none">
                    <strong>{cat.en}</strong>
                  </h2>
                  <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest mt-0.5">
                    {cat.description}
                  </p>
                </div>
                {cat.sponsorLogo && (
                  <div className="h-8 w-24 flex items-center justify-end shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cat.sponsorLogo} alt="sponsor" className="max-h-full max-w-full object-contain opacity-80" />
                  </div>
                )}
              </div>

              {/* Winners list */}
              {winners.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="font-display font-700 text-[var(--muted)] text-sm uppercase tracking-widest">
                    No winner announced yet
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {winners.map((award, i) => (
                    <Link
                      key={i}
                      href={`/rosters/${award.teamId}/${slugify(award.playerName)}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--card-hover)] transition-colors group"
                    >
                      {/* Label (week/month) */}
                      {award.label && (
                        <div className="shrink-0 w-16">
                          <span className="font-display font-800 text-xs uppercase tracking-widest text-[var(--accent)]">
                            {award.label}
                          </span>
                        </div>
                      )}

                      {/* Team logo */}
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 p-1.5"
                        style={{ backgroundColor: TEAM_COLORS[award.teamId] ?? '#1e335a' }}>
                        <Image
                          src={TEAM_LOGOS[award.teamId]}
                          alt={award.teamId}
                          width={28} height={28}
                          className="object-contain w-full h-full"
                        />
                      </div>

                      {/* Player info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-800 text-lg uppercase text-white group-hover:text-[var(--accent)] transition-colors leading-tight truncate">
                          <strong>{award.playerName}</strong>
                        </p>
                        <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest">
                          {TEAM_NAMES[award.teamId] ?? award.teamId}
                        </p>
                      </div>

                      {/* Note */}
                      {award.note && (
                        <p className="font-display font-700 text-xs text-[var(--muted)] shrink-0 hidden sm:block max-w-[140px] text-right">
                          {award.note}
                        </p>
                      )}

                      <span className="font-display font-700 text-xs text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors shrink-0">→</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
