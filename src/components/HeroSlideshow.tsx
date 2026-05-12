'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'

const SLIDES = [
  'https://res.cloudinary.com/dqld625sq/image/upload/v1777728718/UVV_vs_Pioniers_16_april_2026-16_xqnjzx.jpg',
  'https://res.cloudinary.com/dqld625sq/image/upload/v1775839878/Twins_vs_Neptunus_Opening_Day_2026-11_cqbyqf.jpg',
  'https://res.cloudinary.com/dqld625sq/image/upload/v1777729483/HCAW_KINHEIM_23_APRIL_2026-44_uvboj8.jpg',
  'https://res.cloudinary.com/dqld625sq/image/upload/v1777730112/HCAW_KINHEIM_23_APRIL_2026-50_h8ovdn.jpg',
]

export default function HeroSlideshow() {
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => setCurrent(i => (i + 1) % SLIDES.length), [])
  const prev = useCallback(() => setCurrent(i => (i - 1 + SLIDES.length) % SLIDES.length), [])

  useEffect(() => {
    const t = setInterval(next, 6000)
    return () => clearInterval(t)
  }, [next])

  return (
    <div className="relative w-full overflow-hidden bg-[#04080f]" style={{ height: '100vh', marginTop: '-80px' }}>

      {/* Photo slides — right-heavy */}
      {SLIDES.map((src, i) => (
        <div key={src} className={`absolute inset-0 transition-opacity duration-1000 ${i === current ? 'opacity-100' : 'opacity-0'}`}>
          <Image src={src} alt="" fill className="object-cover object-center" priority={i === 0} sizes="100vw" />
        </div>
      ))}

      {/* Gradient layers */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#04080f] from-30% via-[#04080f]/70 via-55% to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#04080f] via-transparent to-black/40" />

      {/* Main content */}
      <div className="absolute inset-0 flex flex-col justify-center pl-8 md:pl-16 pt-20">

        {/* Monster headline */}
        <div className="leading-[0.85] select-none">
          <div className="font-display font-800 italic uppercase text-white"
            style={{ fontSize: 'clamp(4rem, 14vw, 13rem)', lineHeight: 0.85 }}>
            HONKBAL
          </div>
          <div className="font-display font-800 italic uppercase text-[var(--accent)]"
            style={{ fontSize: 'clamp(4rem, 14vw, 13rem)', lineHeight: 0.85 }}>
            HOOFDKLASSE
          </div>
        </div>

        {/* Bottom controls */}
        <div className="flex items-center gap-4 mt-10">
          <button onClick={prev} className="w-10 h-10 border border-white/30 flex items-center justify-center text-white hover:border-[var(--accent)] hover:bg-[var(--accent)] transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={next} className="w-10 h-10 border border-white/30 flex items-center justify-center text-white hover:border-[var(--accent)] hover:bg-[var(--accent)] transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {/* Slide dots */}
          <div className="flex gap-2 ml-2">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`transition-all duration-300 ${i === current ? 'w-8 h-1 bg-[var(--accent)]' : 'w-2 h-1 bg-white/30 hover:bg-white/60'}`} />
            ))}
          </div>
          <span className="font-display font-800 text-white/30 text-sm ml-4">
            {String(current + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
        <div key={current} className="h-full bg-[var(--accent)] animate-progress" style={{ animationDuration: '6000ms' }} />
      </div>
    </div>
  )
}
