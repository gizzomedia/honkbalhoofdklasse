import type { Metadata } from 'next'
import { Barlow_Condensed, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import NavBar from '@/components/NavBar'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'
import { LanguageProvider } from '@/lib/language'
import './globals.css'

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-display',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://honkbalhoofdklasse.com'),
  title: {
    default: 'Honkbal Hoofdklasse | Standen, Scores & Stats',
    template: '%s | Honkbal Hoofdklasse',
  },
  description: 'Alles over de KNBSB Honkbal Hoofdklasse: live scores, standen, statistieken, rosters en nieuws van Neptunus, Pirates, Kinheim, HCAW, Twins, Pioniers en UVV.',
  keywords: ['honkbal hoofdklasse', 'KNBSB hoofdklasse', 'honkbal nederland', 'hoofdklasse standen', 'hoofdklasse scores', 'neptunus honkbal', 'amsterdam pirates', 'kinheim', 'HCAW', 'oosterhout twins', 'hoofddorp pioniers', 'UVV honkbal'],
  authors: [{ name: 'Honkbal Hoofdklasse' }],
  creator: 'Honkbal Hoofdklasse',
  publisher: 'Honkbal Hoofdklasse',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    type: 'website',
    locale: 'nl_NL',
    url: 'https://honkbalhoofdklasse.com',
    siteName: 'Honkbal Hoofdklasse',
    title: 'Honkbal Hoofdklasse | Standen, Scores & Stats',
    description: 'Alles over de KNBSB Honkbal Hoofdklasse: live scores, standen, statistieken en nieuws.',
    images: [{ url: 'https://res.cloudinary.com/dqld625sq/image/upload/v1778542430/logo_hk_abi5hm.png', width: 1200, height: 630, alt: 'Honkbal Hoofdklasse' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Honkbal Hoofdklasse | Standen, Scores & Stats',
    description: 'Live scores, standen en statistieken van de KNBSB Honkbal Hoofdklasse.',
    images: ['https://res.cloudinary.com/dqld625sq/image/upload/v1778542430/logo_hk_abi5hm.png'],
  },
  alternates: { canonical: 'https://honkbalhoofdklasse.com' },
}

const schemaOrg = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SportsOrganization',
      '@id': 'https://honkbalhoofdklasse.com/#league',
      name: 'KNBSB Honkbal Hoofdklasse',
      alternateName: 'Honkbal Hoofdklasse',
      url: 'https://honkbalhoofdklasse.com',
      logo: 'https://res.cloudinary.com/dqld625sq/image/upload/v1778542430/logo_hk_abi5hm.png',
      sport: 'Baseball',
      description: 'The highest baseball competition in the Netherlands, organised by the KNBSB. Teams: Curaçao Neptunus, Amsterdam Pirates, Kinheim, HCAW, Oosterhout Twins, Hoofddorp Pioniers and UVV.',
      location: { '@type': 'Country', name: 'Netherlands' },
      memberOf: { '@type': 'SportsOrganization', name: 'KNBSB', url: 'https://knbsb.nl' },
      sameAs: [
        'https://www.instagram.com/honkbalhoofdklasse/',
        'https://www.tiktok.com/@honkbalhoofdklasse',
        'https://www.youtube.com/@Honkbalhoofdklasse',
        'https://www.facebook.com/profile.php?id=61579476197609',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://honkbalhoofdklasse.com/#website',
      url: 'https://honkbalhoofdklasse.com',
      name: 'Honkbal Hoofdklasse',
      description: 'Live scores, standings, statistics and news from the KNBSB Honkbal Hoofdklasse.',
      inLanguage: 'en',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: 'https://honkbalhoofdklasse.com/leaders?q={search_term_string}' },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${barlowCondensed.variable} ${inter.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Hoofdklasse" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
        />
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-85LWJHPVS1"></script>
        <script async src="/gtag.js"></script>
      </head>
      <body>
        <LanguageProvider>
        <NavBar />

        <main className="pt-20">
          {children}
        </main>

        {/* Sponsor balk */}
        <div className="border-t border-[var(--border)] bg-[var(--card)] py-5 overflow-hidden">
          <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest text-center mb-4">Made possible by</p>
          <div className="overflow-hidden">
            <div className="flex animate-marquee gap-16 items-center" style={{ width: 'max-content' }}>
              {[
                { src: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780394708/nouzoos_bnqatr.png',                       w: 'w-[129px]', h: 'h-[41px]' },
                { src: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780394730/Logo_Diap_RGB_Totaalwarmte_ybdfbz.png',    w: 'w-28',      h: 'h-9' },
                { src: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780394738/BatKingEurope_Logo_rgb_white_w30lxp.webp', w: 'w-28',      h: 'h-9' },
                { src: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780395350/SSK_LOGO_nnm9t2.png',                      w: 'w-28',      h: 'h-9' },
                { src: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780395308/LJ_hpdo4v.png',                            w: 'w-28',      h: 'h-9' },
                { src: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780395334/GizzoMedia_Logo_nedyfo.png',               w: 'w-[134px]', h: 'h-[43px]' },
                { src: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780395321/KNBSB_etffww.png',                         w: 'w-[168px]', h: 'h-[54px]' },
                { src: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780394708/nouzoos_bnqatr.png',                       w: 'w-[129px]', h: 'h-[41px]' },
                { src: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780394730/Logo_Diap_RGB_Totaalwarmte_ybdfbz.png',    w: 'w-28',      h: 'h-9' },
                { src: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780394738/BatKingEurope_Logo_rgb_white_w30lxp.webp', w: 'w-28',      h: 'h-9' },
                { src: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780395350/SSK_LOGO_nnm9t2.png',                      w: 'w-28',      h: 'h-9' },
                { src: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780395308/LJ_hpdo4v.png',                            w: 'w-28',      h: 'h-9' },
                { src: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780395334/GizzoMedia_Logo_nedyfo.png',               w: 'w-[134px]', h: 'h-[43px]' },
                { src: 'https://res.cloudinary.com/dn8c5398m/image/upload/v1780395321/KNBSB_etffww.png',                         w: 'w-[168px]', h: 'h-[54px]' },
              ].map(({ src, w, h }, i) => (
                <div key={i} className={`${w} ${h} flex items-center justify-center shrink-0`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="sponsor" className="max-w-full max-h-full object-contain opacity-70 hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        </div>

        </LanguageProvider>
        <footer className="border-t border-[var(--border)] bg-[var(--card)]">
          <div className="max-w-5xl mx-auto px-4 py-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">

              {/* Branding */}
              <div>
                <p className="font-display font-800 text-xl text-white">@honkbalhoofdklasse</p>
              </div>

              {/* Navigatie */}
              <div>
                <p className="font-display font-800 text-xs text-[var(--muted)] uppercase tracking-widest mb-3">Navigation</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {[
                    ['/', 'Home'],
                    ['/stand', 'Standings'],
                    ['/livescores', 'Live Scores'],
                    ['/schema', 'Schedule'],
                    ['/uitslagen', 'Results'],
                    ['/leaders', 'Leaders'],
                    ['/awards', 'Awards'],
                    ['/livestream', 'Livestream'],
                    ['/nieuws', 'News'],
                    ['/rosters', 'Rosters'],
                  ].map(([href, label]) => (
                    <a key={href} href={href} className="font-display font-700 text-sm text-[var(--muted)] hover:text-white transition-colors uppercase tracking-wide">
                      {label}
                    </a>
                  ))}
                </div>
              </div>

              {/* Socials */}
              <div>
                <p className="font-display font-800 text-xs text-[var(--muted)] uppercase tracking-widest mb-3">Follow us</p>
                <div className="space-y-2">
                  {/* Instagram */}
                  <a href="https://www.instagram.com/honkbalhoofdklasse/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    </span>
                    <span className="font-display font-700 text-sm text-[var(--muted)] group-hover:text-white transition-colors uppercase tracking-wide">Instagram</span>
                  </a>
                  {/* TikTok */}
                  <a href="https://www.tiktok.com/@honkbalhoofdklasse" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                    <span className="w-8 h-8 rounded-lg bg-[#010101] border border-[var(--border)] flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.16 8.16 0 004.77 1.52V6.82a4.85 4.85 0 01-1-.13z"/></svg>
                    </span>
                    <span className="font-display font-700 text-sm text-[var(--muted)] group-hover:text-white transition-colors uppercase tracking-wide">TikTok</span>
                  </a>
                  {/* YouTube */}
                  <a href="https://www.youtube.com/@Honkbalhoofdklasse" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                    <span className="w-8 h-8 rounded-lg bg-[#FF0000] flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    </span>
                    <span className="font-display font-700 text-sm text-[var(--muted)] group-hover:text-white transition-colors uppercase tracking-wide">YouTube</span>
                  </a>
                  {/* Facebook */}
                  <a href="https://www.facebook.com/profile.php?id=61579476197609" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                    <span className="w-8 h-8 rounded-lg bg-[#1877F2] flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </span>
                    <span className="font-display font-700 text-sm text-[var(--muted)] group-hover:text-white transition-colors uppercase tracking-wide">Facebook</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-6 flex items-center justify-between gap-4 flex-wrap">
              <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest">
                © {new Date().getFullYear()} Honkbal Hoofdklasse · KNBSB
              </p>
              <a
                href="/HonkbalWidget.js"
                download="HonkbalWidget.js"
                rel="nofollow"
                className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                iOS Widget
              </a>
            </div>
          </div>
        </footer>
        <Analytics />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  )
}
