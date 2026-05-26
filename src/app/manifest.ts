import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             'Honkbal Hoofdklasse',
    short_name:       'Hoofdklasse',
    description:      'Live scores, standings en stats van de KNBSB Honkbal Hoofdklasse 2026.',
    start_url:        '/',
    display:          'standalone',
    background_color: '#06101e',
    theme_color:      '#06101e',
    orientation:      'portrait',
    categories:       ['sports', 'news'],
    icons: [
      {
        src:     '/icons/icon-192.png',
        sizes:   '192x192',
        type:    'image/png',
        purpose: 'any',
      },
      {
        src:     '/icons/icon-512.png',
        sizes:   '512x512',
        type:    'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
