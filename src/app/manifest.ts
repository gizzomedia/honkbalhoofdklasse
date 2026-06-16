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
        src:     'https://res.cloudinary.com/dn8c5398m/image/upload/q_auto,w_192,h_192,c_fill/f_auto/v1781608197/APP_LOGO_juysrd.png',
        sizes:   '192x192',
        type:    'image/png',
        purpose: 'any',
      },
      {
        src:     'https://res.cloudinary.com/dn8c5398m/image/upload/q_auto,w_512,h_512,c_fill/f_auto/v1781608197/APP_LOGO_juysrd.png',
        sizes:   '512x512',
        type:    'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
