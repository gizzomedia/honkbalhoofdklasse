import { ROSTERS, slugify } from '@/lib/rosters-data'
import { AWARD_CATEGORIES, getAwardsByPlayer } from '@/lib/awards-data'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

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
  neptunus: 'Curaçao Neptunus', pirates: 'Amsterdam Pirates', kinheim: 'Kinheim',
  hcaw: 'HCAW', twins: 'Oosterhout Twins', pioniers: 'Hoofddorp Pioniers', uvv: 'UVV',
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

export default function PlayerProfilePage({
  params,
}: {
  params: { teamId: string; playerSlug: string }
}) {
  const { teamId, playerSlug } = params
  const roster = ROSTERS[teamId]
  if (!roster) notFound()

  const player = roster.players.find(p => slugify(p.name) === playerSlug)
  if (!player) notFound()

  const awards = getAwardsByPlayer(player.name)
  const teamColor = TEAM_COLORS[teamId] ?? '#1e335a'
  const teamLogo = TEAM_LOGOS[teamId]
  const teamName = TEAM_NAMES[teamId] ?? teamId
  const age = new Date().getFullYear() - player.yob
  const posLabel = POS_LABELS[player.pos] ?? player.pos

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-8">

      {/* Terug knop */}
      <Link
        href="/rosters"
        className="inline-flex items-center gap-2 font-display font-700 text-xs text-[var(--muted)] hover:text-white uppercase tracking-widest transition-colors"
      >
        ← Rosters
      </Link>

      {/* Player header card */}
      <div className="relative rounded-2xl overflow-hidden border border-[var(--border)]">
        {/* Team color background */}
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
              <span className="font-display font-700 text-sm text-[var(--muted)] uppercase tracking-wider">{age} jaar</span>
              <span className="font-display font-700 text-sm text-[var(--muted)] uppercase tracking-wider">Geb. {player.yob}</span>
            </div>
          </div>

          {/* Instagram link als beschikbaar */}
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
                  <span className="text-3xl shrink-0">{cat?.icon ?? '🏆'}</span>
                  <div>
                    <p className="font-display font-800 text-base uppercase text-white leading-tight">
                      {cat?.nl ?? award.category}
                    </p>
                    <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest mt-0.5">
                      Seizoen {award.season}
                    </p>
                    {award.note && (
                      <p className="font-display font-700 text-xs text-[var(--accent)] mt-1">{award.note}</p>
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
            <p className="font-display font-800 text-xl uppercase text-[var(--muted)] italic">Nog geen awards</p>
            <p className="font-display font-700 text-sm text-[var(--muted)] uppercase tracking-widest mt-2">
              Awards verschijnen hier zodra ze bekend zijn
            </p>
            <Link href="/awards" className="inline-block mt-4 font-display font-700 text-xs text-[var(--accent)] uppercase tracking-widest hover:underline">
              Bekijk alle awards →
            </Link>
          </div>
        </section>
      )}

      {/* Stats link */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 bg-[var(--accent)] shrink-0" />
          <h2 className="font-display font-800 italic text-2xl uppercase text-white tracking-tight">
            <strong>Statistieken</strong>
          </h2>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-display font-800 text-base uppercase text-white">KNBSB Stats</p>
            <p className="font-display font-700 text-sm text-[var(--muted)] mt-1">
              Bekijk volledige statistieken op de officiële KNBSB stats website
            </p>
          </div>
          <a
            href={`https://stats.knbsbstats.nl/events/2026-lucky-day-hoofdklasse/roster`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 bg-[var(--accent)] px-5 py-2.5 font-display font-800 text-sm uppercase tracking-wider text-white hover:bg-[var(--accent)]/80 transition-colors rounded-lg"
          >
            Stats bekijken →
          </a>
        </div>
      </section>

      {/* Instagram team feed */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 bg-[var(--accent)] shrink-0" />
          <h2 className="font-display font-800 italic text-2xl uppercase text-white tracking-tight">
            <strong>Foto&apos;s</strong>
          </h2>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-display font-800 text-base uppercase text-white">@honkbalhoofdklasse</p>
            <p className="font-display font-700 text-sm text-[var(--muted)] mt-1">
              Volg ons op Instagram voor de laatste foto&apos;s en video&apos;s
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
            Volgen
          </a>
        </div>
      </section>

    </div>
  )
}
