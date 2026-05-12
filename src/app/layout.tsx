import type { Metadata } from 'next'
import { Barlow_Condensed, Inter } from 'next/font/google'
import NavBar from '@/components/NavBar'
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
  title: 'Honkbal Hoofdklasse',
  description: 'Nieuws, standen en statistieken van de KNBSB Hoofdklasse',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${barlowCondensed.variable} ${inter.variable}`}>
      <body>
        <NavBar />

        <main className="pt-20">
          {children}
        </main>

        <footer className="border-t border-[var(--border)] bg-[var(--card)] mt-16">
          <div className="max-w-5xl mx-auto px-4 py-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">

              {/* Branding */}
              <div>
                <p className="font-display font-800 text-xl text-white">@honkbalhoofdklasse</p>
              </div>

              {/* Navigatie */}
              <div>
                <p className="font-display font-800 text-xs text-[var(--muted)] uppercase tracking-widest mb-3">Navigatie</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {[
                    ['/', 'Home'],
                    ['/stand', 'Stand'],
                    ['/livescores', 'Live Scores'],
                    ['/schema', 'Schema'],
                    ['/uitslagen', 'Uitslagen'],
                    ['/leaders', 'Leaders'],
                    ['/livestream', 'Livestream'],
                    ['/nieuws', 'Nieuws'],
                  ].map(([href, label]) => (
                    <a key={href} href={href} className="font-display font-700 text-sm text-[var(--muted)] hover:text-white transition-colors uppercase tracking-wide">
                      {label}
                    </a>
                  ))}
                </div>
              </div>

              {/* Socials */}
              <div>
                <p className="font-display font-800 text-xs text-[var(--muted)] uppercase tracking-widest mb-3">Volg ons</p>
                <div className="space-y-2">
                  <a
                    href="https://www.instagram.com/honkbalhoofdklasse/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 group"
                  >
                    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </span>
                    <span className="font-display font-700 text-sm text-[var(--muted)] group-hover:text-white transition-colors uppercase tracking-wide">
                      Instagram
                    </span>
                  </a>
                  <a
                    href="/social"
                    className="flex items-center gap-3 group"
                  >
                    <span className="w-8 h-8 rounded-lg bg-[var(--card-hover)] border border-[var(--border)] flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <span className="font-display font-700 text-sm text-[var(--muted)] group-hover:text-white transition-colors uppercase tracking-wide">
                      Media Gallery
                    </span>
                  </a>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-6">
              <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest">
                © {new Date().getFullYear()} Honkbal Hoofdklasse · KNBSB
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
