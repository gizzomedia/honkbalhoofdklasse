import type { MetadataRoute } from 'next'
import { ROSTERS, slugify } from '@/lib/rosters-data'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://honkbalhoofdklasse.com'
  const now = new Date()

  const staticRoutes = [
    { url: base, priority: 1.0, changeFrequency: 'daily' as const },
    { url: `${base}/stand`, priority: 0.9, changeFrequency: 'daily' as const },
    { url: `${base}/livescores`, priority: 0.9, changeFrequency: 'always' as const },
    { url: `${base}/uitslagen`, priority: 0.8, changeFrequency: 'daily' as const },
    { url: `${base}/schema`, priority: 0.8, changeFrequency: 'weekly' as const },
    { url: `${base}/leaders`, priority: 0.8, changeFrequency: 'daily' as const },
    { url: `${base}/rosters`, priority: 0.7, changeFrequency: 'weekly' as const },
    { url: `${base}/nieuws`, priority: 0.7, changeFrequency: 'daily' as const },
    { url: `${base}/awards`, priority: 0.6, changeFrequency: 'weekly' as const },
    { url: `${base}/livestream`, priority: 0.6, changeFrequency: 'weekly' as const },
    { url: `${base}/social`, priority: 0.5, changeFrequency: 'weekly' as const },
  ]

  // Team roster pages
  const teams = ['neptunus', 'pirates', 'kinheim', 'hcaw', 'twins', 'pioniers', 'uvv']
  const teamRoutes = teams.map(team => ({
    url: `${base}/rosters/${team}`,
    priority: 0.6,
    changeFrequency: 'weekly' as const,
  }))

  // Individual player pages
  const playerRoutes = Object.values(ROSTERS).flatMap(roster =>
    roster.players.map(player => ({
      url: `${base}/players/${slugify(player.name)}`,
      priority: 0.7,
      changeFrequency: 'daily' as const,
    }))
  )

  return [...staticRoutes, ...teamRoutes, ...playerRoutes].map(r => ({
    ...r,
    lastModified: now,
  }))
}
