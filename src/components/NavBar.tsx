'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/',            label: 'Home' },
  { href: '/stand',       label: 'Stand' },
  { href: '/livescores',  label: 'Live' },
  { href: '/schema',      label: 'Schema' },
  { href: '/uitslagen',   label: 'Uitslagen' },
  { href: '/leaders',     label: 'Leaders' },
  { href: '/livestream',  label: 'Livestream' },
  { href: '/nieuws',      label: 'Nieuws' },
  { href: '/social',      label: 'Social' },
]

export default function NavBar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const isHome = pathname === '/'
  const transparent = isHome && !scrolled

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
          {NAV_LINKS.map(link => (
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
          {NAV_LINKS.map(link => (
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
