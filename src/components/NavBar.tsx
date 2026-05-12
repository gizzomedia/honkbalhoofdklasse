'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/language'

export default function NavBar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const isHome = pathname === '/'
  const transparent = isHome && !scrolled
  const { lang, t, toggle } = useLanguage()

  const NAV_LINKS: { href: string; label: string; external?: boolean }[] = [
    { href: '/',            label: t.home },
    { href: '/stand',       label: t.standings },
    { href: '/livescores',  label: t.live },
    { href: '/schema',      label: t.schedule },
    { href: '/uitslagen',   label: t.results },
    { href: '/leaders',     label: t.leaders },
    { href: '/livestream',  label: t.livestream },
    { href: '/nieuws',      label: t.news },
    { href: '/rosters',     label: t.rosters },
    { href: '/social',      label: t.social },
    { href: 'https://app.honkbalsoftbal.tv/nl/home', label: 'Honkbalsoftbal.tv', external: true },
  ]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      transparent
        ? 'bg-transparent border-transparent'
        : 'bg-[var(--card)]/95 backdrop-blur-md border-b border-[var(--border)]'
    }`}>
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-20">

        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image
            src="https://res.cloudinary.com/dqld625sq/image/upload/v1778542430/logo_hk_abi5hm.png"
            alt="Honkbal Hoofdklasse"
            width={120}
            height={120}
            className="object-contain"
          />
          <p className="font-display font-800 text-xl tracking-wide text-white hidden sm:block">
            @honkbalhoofdklasse
          </p>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex gap-6 text-sm font-display font-700 uppercase tracking-wider">
          {NAV_LINKS.map(link => link.external ? (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white text-white/60"
            >
              {link.label}
            </a>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors hover:text-white ${
                pathname === link.href ? 'text-white' : 'text-white/60'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Language toggle */}
        <button
          onClick={toggle}
          className="hidden lg:flex items-center gap-1 font-display font-800 text-xs uppercase tracking-widest border border-white/20 rounded px-2 py-1 text-white/60 hover:text-white hover:border-white/40 transition-colors shrink-0"
        >
          {lang === 'en' ? 'NL' : 'EN'}
        </button>

        {/* Hamburger */}
        <button
          className="lg:hidden flex flex-col gap-1.5 p-2 shrink-0"
          onClick={() => setOpen(o => !o)}
          aria-label="Menu"
        >
          <span className={`block w-6 h-0.5 bg-white transition-all duration-200 origin-center ${open ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-6 h-0.5 bg-white transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
          <span className={`block w-6 h-0.5 bg-white transition-all duration-200 origin-center ${open ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ${open ? 'max-h-96' : 'max-h-0'}`}>
        <div className="bg-[var(--card)] border-t border-[var(--border)] px-4 py-4 grid grid-cols-2 gap-1">
          {NAV_LINKS.map(link => link.external ? (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-display font-800 text-sm uppercase tracking-wider px-4 py-3 rounded-xl transition-colors text-white/60 hover:text-white hover:bg-[var(--card-hover)]"
            >
              {link.label}
            </a>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              className={`font-display font-800 text-sm uppercase tracking-wider px-4 py-3 rounded-xl transition-colors ${
                pathname === link.href
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-white/60 hover:text-white hover:bg-[var(--card-hover)]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
