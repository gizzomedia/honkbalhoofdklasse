import { AWARD_CATEGORIES, AWARDS, SEASONS, getAwardsBySeason } from '@/lib/awards-data'
import Image from 'next/image'
import Link from 'next/link'

export const revalidate = false

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
  neptunus: 'Neptunus', pirates: 'Pirates', kinheim: 'Kinheim',
  hcaw: 'HCAW', twins: 'Twins', pioniers: 'Pioniers', uvv: 'UVV',
}

function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõöø]/g, 'o')
    .replace(/[ùúûü]/g, 'u').replace(/[ç]/g, 'c').replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function AwardsPage() {
  const currentSeason = 2026

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-16">
      <div>
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-1">Hoofdklasse</p>
        <h1 className="font-display font-800 italic text-5xl uppercase tracking-tight text-white">
          <strong>Awards</strong>
        </h1>
        <p className="font-display font-700 text-[var(--muted)] text-sm mt-2 uppercase tracking-wider">
          Jaarlijkse onderscheidingen van de Hoofdklasse
        </p>
      </div>

      {SEASONS.map(season => {
        const seasonAwards = getAwardsBySeason(season)
        const isCurrent = season === currentSeason

        return (
          <section key={season}>
            {/* Season header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-1 h-8 bg-[var(--accent)] shrink-0" />
              <div>
                <h2 className="font-display font-800 italic text-4xl uppercase text-white leading-none">
                  <strong>Seizoen {season}</strong>
                </h2>
                {isCurrent && (
                  <p className="font-display font-700 text-xs text-[var(--accent)] uppercase tracking-widest mt-1">
                    Seizoen in uitvoering · Awards worden einde seizoen bekendgemaakt
                  </p>
                )}
              </div>
            </div>

            {/* Award categories grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {AWARD_CATEGORIES.map(cat => {
                const award = seasonAwards.find(a => a.category === cat.key)

                return (
                  <div key={cat.key}
                    className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
                    {/* Award color bar */}
                    <div className="h-[3px]"
                      style={{ backgroundColor: award ? (TEAM_COLORS[award.teamId] ?? 'var(--accent)') : '#1E2E42' }} />

                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <span className="text-2xl shrink-0 mt-0.5">{cat.icon}</span>
                        <div>
                          <p className="font-display font-800 text-sm uppercase text-white leading-tight">
                            {cat.nl}
                          </p>
                          <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mt-0.5">
                            {cat.description}
                          </p>
                        </div>
                      </div>

                      {award ? (
                        <Link
                          href={`/rosters/${award.teamId}/${slugify(award.playerName)}`}
                          className="flex items-center gap-3 group"
                        >
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 p-1"
                            style={{ backgroundColor: TEAM_COLORS[award.teamId] ?? '#1e335a' }}>
                            <Image
                              src={TEAM_LOGOS[award.teamId]}
                              alt={award.teamId}
                              width={28}
                              height={28}
                              className="object-contain w-full h-full"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-display font-800 text-base uppercase text-white group-hover:text-[var(--accent)] transition-colors leading-tight truncate">
                              {award.playerName}
                            </p>
                            <p className="font-display font-700 text-xs text-[var(--muted)] uppercase">
                              {TEAM_NAMES[award.teamId] ?? award.teamId}
                            </p>
                          </div>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#0a1220] border border-[#1a2a3a] flex items-center justify-center shrink-0">
                            <span className="text-[var(--muted)] text-lg">?</span>
                          </div>
                          <p className="font-display font-700 text-sm text-[var(--muted)] uppercase tracking-wide">
                            {isCurrent ? 'TBD' : 'Geen data'}
                          </p>
                        </div>
                      )}

                      {award?.note && (
                        <p className="font-display font-700 text-xs text-[var(--muted)] mt-3 italic">
                          {award.note}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
