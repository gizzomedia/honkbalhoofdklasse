import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: 'https://honkbalhoofdklasse.com/sitemap.xml',
    host: 'https://honkbalhoofdklasse.com',
  }
}
