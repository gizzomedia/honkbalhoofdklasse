import { notFound } from 'next/navigation'
import Image from 'next/image'
import { ROSTERS, slugify } from '@/lib/rosters-data'
import { computeSeasonStats, fetchPlayerPhotos } from '@/lib/player-stats-lib'
import { headshotFaceUrl } from '@/lib/cloudinary'
import StatsTabs from './StatsTabs'

export const revalidate = 1800

const TEAM_COLORS: Record<string, string> = {
  neptunus: '#121b31', pirates: '#0f6f38', kinheim: '#c0232e',
  hcaw: '#f5b51a', twins: '#ee7e1a', pioniers: '#3d68e9', uvv: '#db002f',
}
const TEAM_NAMES: Record<string, string> = {
  neptunus: 'Curaçao Neptunus', pirates: 'Amsterdam Pirates', kinheim: 'Kinheim',
  hcaw: 'HCAW', twins: 'Oosterhout Twins', pioniers: 'Hoofddorp Pioniers', uvv: 'UVV',
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

export function generateStaticParams() {
  const params: { slug: string }[] = []
  for (const roster of Object.values(ROSTERS)) {
    for (const player of roster.players) {
      params.push({ slug: slugify(player.name) })
    }
  }
  return params
}

function findPlayer(slug: string) {
  for (const [teamId, roster] of Object.entries(ROSTERS)) {
    for (const player of roster.players) {
      if (slugify(player.name) === slug) {
        return { player, teamId }
      }
    }
  }
  return null
}

function calcAge(yob: number): number {
  return new Date().getFullYear() - yob
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const found = findPlayer(slug)
  if (!found) notFound()

  const { player, teamId } = found
  const teamColor = TEAM_COLORS[teamId] ?? '#1e335a'
  const teamName  = TEAM_NAMES[teamId]  ?? teamId
  const teamLogo  = TEAM_LOGOS[teamId]

  // Fetch stats and photos in parallel
  const [stats, photos] = await Promise.all([
    computeSeasonStats(player.name),
    fetchPlayerPhotos(player.name),
  ])

  const bannerUrl      = photos?.banner_url ?? null
  const headshotUrl    = headshotFaceUrl(photos?.headshot_url ?? null)
  const bannerPosition = `${photos?.banner_focal_x ?? 50}% ${photos?.banner_focal_y ?? 50}%`
  const age         = calcAge(player.yob)

  // For Neptunus the team color is very dark; use amber as accent on it
  const accentColor = teamColor === '#121b31' ? '#f59e0b' : teamColor

  return (
    <main className="min-h-screen" style={{ background: '#060e1b' }}>
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${teamColor} 0%, #060e1b 65%)`,
          }}
        />

        {/* Banner photo overlay */}
        {bannerUrl && (
          <div className="absolute inset-0">
            <Image
              src={bannerUrl}
              alt={player.name}
              fill
              className="object-cover"
              style={{ opacity: 0.15, objectPosition: bannerPosition }}
              priority
            />
          </div>
        )}

        {/* Hero content */}
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Jersey number + headshot */}
            <div className="relative flex-shrink-0">
              {/* Huge jersey number behind */}
              <span
                className="absolute -left-4 -top-6 font-display font-800 select-none pointer-events-none leading-none"
                style={{
                  fontSize: 'clamp(80px, 14vw, 160px)',
                  color: teamColor,
                  opacity: 0.10,
                  lineHeight: 1,
                }}
              >
                {player.uniform}
              </span>

              {/* Headshot */}
              {headshotUrl ? (
                <div className="relative w-[200px] h-[200px] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-10">
                  <Image
                    src={headshotUrl}
                    alt={player.name}
                    fill
                    className="object-cover object-center"
                    priority
                  />
                </div>
              ) : (
                <div
                  className="w-[200px] h-[200px] rounded-2xl border-2 border-white/20 shadow-2xl z-10 flex items-center justify-center"
                  style={{ background: `${teamColor}40` }}
                >
                  <span className="font-display font-800 text-6xl text-white/30">
                    {player.uniform}
                  </span>
                </div>
              )}
            </div>

            {/* Player info */}
            <div className="flex-1 min-w-0 z-10">
              {/* Name */}
              <h1 className="font-display font-800 text-5xl sm:text-6xl uppercase text-white leading-none mb-3 tracking-tight">
                {player.name}
              </h1>

              {/* Position pill */}
              <span
                className="inline-block font-display font-700 text-xs uppercase tracking-widest px-3 py-1 rounded-full mb-4"
                style={{ background: accentColor, color: teamColor === '#121b31' ? '#000' : '#fff' }}
              >
                {player.pos}
              </span>

              {/* Team */}
              <div className="flex items-center gap-2 mb-3">
                {teamLogo && (
                  <div
                    className="w-8 h-8 rounded-lg p-1 flex items-center justify-center shrink-0"
                    style={{ background: `${teamColor}80` }}
                  >
                    <Image
                      src={teamLogo}
                      alt={teamName}
                      width={24}
                      height={24}
                      className="object-contain w-full h-full"
                    />
                  </div>
                )}
                <span className="font-display font-700 text-sm text-white/70 uppercase tracking-widest">
                  {teamName}
                </span>
              </div>

              {/* Bats/Throws · YOB · Age */}
              <div className="flex flex-wrap gap-4 text-sm text-white/50 font-display font-700 uppercase tracking-widest">
                <span>Bats/Throws: <span className="text-white/80">{player.bt}</span></span>
                <span>Born: <span className="text-white/80">{player.yob}</span></span>
                <span>Age: <span className="text-white/80">{age}</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="relative mt-8" style={{ height: 3, background: accentColor }} />
      </section>

      {/* ── STATS ────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {stats ? (
          <StatsTabs stats={stats} teamId={teamId} />
        ) : (
          <div className="text-center py-16">
            <p className="font-display font-700 text-white/40 uppercase tracking-widest text-sm">
              No stats available yet for this season.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}
