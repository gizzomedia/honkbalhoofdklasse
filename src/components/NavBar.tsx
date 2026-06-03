'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/language'
import SearchModal from './SearchModal'
import PushNotifications from './PushNotifications'

type NavItem = { href: string; label: string; external?: boolean }
type NavLink  = { type: 'link';     href: string; label: string }
type NavGroup = { type: 'dropdown'; label: string; items: NavItem[] }
type NavEntry = NavLink | NavGroup

function useNavEntries(): NavEntry[] {
  return [
    { type: 'link', href: '/livescores', label: 'Scores' },
    { type: 'link', href: '/schema',     label: 'Schedule' },
    { type: 'link', href: '/uitslagen',  label: 'Results' },
    { type: 'link', href: '/stand',      label: 'Standings' },
    {
      type: 'dropdown', label: 'Stats',
      items: [
        { href: '/leaders', label: 'Leaders' },
        { href: '/teams',   label: 'Teams'   },
        { href: '/rosters', label: 'Rosters' },
        { href: '/compare', label: 'Compare' },
        { href: '/awards',  label: 'Awards'  },
      ],
    },
    {
      type: 'dropdown', label: 'Play',
      items: [
        { href: '/pick-em',         label: 'Pick \'em'      },
        { href: '/pickle',          label: 'Pickle'         },
        { href: '/immaculate-grid', label: 'Immaculate Grid'},
        { href: '/higher-lower',    label: 'Higher Lower'   },
      ],
    },
    {
      type: 'dropdown', label: 'Media',
      items: [
        { href: 'https://honkbalsoftbal.nl/?cat=544', label: 'News', external: true },
        { href: '/livestream',  label: 'Livestream' },
        { href: '/social',      label: 'Social' },
        { href: '/partner-up',  label: 'Partner Up' },
      ],
    },
  ]
}

function DropdownMenu({ group, pathname }: { group: NavGroup; pathname: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isActive = group.items.some(i => i.href === pathname)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 font-display font-700 text-sm uppercase tracking-wider transition-colors hover:text-white ${isActive ? 'text-white' : 'text-white/60'}`}
      >
        {group.label}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xl z-50 min-w-[160px]">
          {group.items.map(item => {
            const cls = `block px-4 py-2.5 font-display font-700 text-sm uppercase tracking-wider transition-colors hover:bg-[var(--accent)] hover:text-white ${pathname === item.href ? 'text-[var(--accent)]' : 'text-white/70'}`
            return item.href.startsWith('http') ? (
              <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={cls}>
                {item.label}
              </a>
            ) : (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cls}>
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LangDropdown() {
  const { lang, toggle } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const options = [
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'nl', flag: '🇳🇱', label: 'Nederlands' },
  ]
  const current = options.find(o => o.code === lang)!

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 font-display font-700 text-sm text-white/70 hover:text-white transition-colors border border-white/20 hover:border-white/40 rounded-lg px-2.5 py-1.5"
      >
        <span>{current.flag}</span>
        <span className="uppercase tracking-wider text-xs">{current.code.toUpperCase()}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-xl z-50 min-w-[150px]">
          {options.map(opt => (
            <button
              key={opt.code}
              onClick={() => { if (opt.code !== lang) toggle(); setOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 font-display font-700 text-sm transition-colors hover:bg-[var(--card-hover)] ${opt.code === lang ? 'text-[var(--accent)]' : 'text-white/70 hover:text-white'}`}
            >
              <span>{opt.flag}</span>
              <span>{opt.label}</span>
              {opt.code === lang && <span className="ml-auto text-[var(--accent)]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NavBar() {
  const [open, setOpen] = useState(false)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()
  const isHome = pathname === '/'
  const transparent = isHome && !scrolled
  const entries = useNavEntries()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(s => !s)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setOpen(false); setOpenGroup(null) }, [pathname])

  return (
    <>
    {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
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
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-5">
          <Link
            href="/"
            className={`font-display font-700 text-sm uppercase tracking-wider transition-colors hover:text-white ${pathname === '/' ? 'text-white' : 'text-white/60'}`}
          >
            Home
          </Link>

          {entries.map(entry =>
            entry.type === 'link' ? (
              <Link
                key={entry.href}
                href={entry.href}
                className={`font-display font-700 text-sm uppercase tracking-wider transition-colors hover:text-white ${pathname === entry.href ? 'text-white' : 'text-white/60'}`}
              >
                {entry.label}
              </Link>
            ) : (
              <DropdownMenu key={entry.label} group={entry} pathname={pathname} />
            )
          )}

          <a
            href="https://app.honkbalsoftbal.tv/nl/home"
            target="_blank"
            rel="noopener noreferrer"
            className="font-display font-700 text-sm uppercase tracking-wider text-white/60 hover:text-white transition-colors"
          >
            Honkbalsoftbal.tv
          </a>

          {/* Bell + Search — far right on desktop */}
          <div className="flex items-center gap-2 ml-2 pl-4 border-l border-white/10">
            <PushNotifications />
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5"
              aria-label="Zoeken"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="font-display font-700 text-xs text-white/40 uppercase tracking-wider">Zoeken</span>
              <kbd className="font-display font-700 text-[10px] text-white/30 border border-white/10 rounded px-1.5 py-0.5">⌘K</kbd>
            </button>
          </div>

        </div>

        {/* Mobile: bell + hamburger */}
        <div className="lg:hidden flex items-center gap-1">
          <div className="lg:hidden"><PushNotifications /></div>
          <button
          className="flex flex-col gap-1.5 p-2 shrink-0"
          onClick={() => setOpen(o => !o)}
          aria-label="Menu"
        >
          <span className={`block w-6 h-0.5 bg-white transition-all duration-200 origin-center ${open ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-6 h-0.5 bg-white transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
          <span className={`block w-6 h-0.5 bg-white transition-all duration-200 origin-center ${open ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ${open ? 'max-h-[600px]' : 'max-h-0'}`}>
        <div className="bg-[var(--card)] border-t border-[var(--border)] px-4 py-4 space-y-1">
          {/* Home */}
          <Link href="/"
            className={`block font-display font-800 text-sm uppercase tracking-wider px-4 py-3 rounded-xl transition-colors ${pathname === '/' ? 'bg-[var(--accent)] text-white' : 'text-white/60 hover:text-white hover:bg-[var(--card-hover)]'}`}>
            Home
          </Link>

          {/* Entries */}
          {entries.map(entry =>
            entry.type === 'link' ? (
              <Link key={entry.href} href={entry.href}
                className={`block font-display font-800 text-sm uppercase tracking-wider px-4 py-3 rounded-xl transition-colors ${pathname === entry.href ? 'bg-[var(--accent)] text-white' : 'text-white/60 hover:text-white hover:bg-[var(--card-hover)]'}`}>
                {entry.label}
              </Link>
            ) : (
              <div key={entry.label}>
                <button
                  onClick={() => setOpenGroup(openGroup === entry.label ? null : entry.label)}
                  className={`w-full flex items-center justify-between font-display font-800 text-sm uppercase tracking-wider px-4 py-3 rounded-xl transition-colors ${entry.items.some(i => i.href === pathname) ? 'bg-[var(--accent)] text-white' : 'text-white/60 hover:text-white hover:bg-[var(--card-hover)]'}`}
                >
                  {entry.label}
                  <svg className={`w-3 h-3 transition-transform ${openGroup === entry.label ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openGroup === entry.label && (
                  <div className="grid grid-cols-2 gap-1 pl-2">
                    {entry.items.map(item => {
                      const cls = `font-display font-800 text-sm uppercase tracking-wider px-4 py-3 rounded-xl transition-colors ${pathname === item.href ? 'bg-[var(--accent)] text-white' : 'text-white/60 hover:text-white hover:bg-[var(--card-hover)]'}`
                      return item.external || item.href.startsWith('http') ? (
                        <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>
                          {item.label}
                        </a>
                      ) : (
                        <Link key={item.href} href={item.href} className={cls}>
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          )}

          {/* External + Lang */}
          <a href="https://app.honkbalsoftbal.tv/nl/home" target="_blank" rel="noopener noreferrer"
            className="block font-display font-800 text-sm uppercase tracking-wider px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-[var(--card-hover)] transition-colors">
            Honkbalsoftbal.tv
          </a>

          {/* Mobile search */}
          <button
            onClick={() => { setOpen(false); setSearchOpen(true) }}
            className="w-full flex items-center gap-3 font-display font-800 text-sm uppercase tracking-wider px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-[var(--card-hover)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Zoeken
          </button>

        </div>
      </div>
    </nav>
    </>
  )
}
