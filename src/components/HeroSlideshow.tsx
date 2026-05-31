'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

const IMAGES = [
  'https://res.cloudinary.com/dn8c5398m/image/upload/v1780159379/Twins_HCAW_7_mei_2026-54_f6fnno.jpg',
  'https://res.cloudinary.com/dn8c5398m/image/upload/v1780159379/Pirates_Neptunus_28_mei_2026-50_z2yivd.jpg',
  'https://res.cloudinary.com/dn8c5398m/image/upload/v1780159377/Twins_HCAW_7_mei_2026-29_yjlwjm.jpg',
  'https://res.cloudinary.com/dn8c5398m/image/upload/v1780159377/Twins_HCAW_7_mei_2026-19_nifdlo.jpg',
  'https://res.cloudinary.com/dn8c5398m/image/upload/v1780159501/UVV_vs_Pioniers_16_april_2026-41_akfnm2.jpg',
  'https://res.cloudinary.com/dn8c5398m/image/upload/v1780159483/UVV_vs_Pioniers_16_april_2026-47_ukuhkf.jpg',
]

const INTERVAL = 5000

export default function HeroSlideshow() {
  const [current, setCurrent] = useState(0)
  const [prev, setPrev]       = useState<number | null>(null)
  const [fading, setFading]   = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setPrev(current)
      setFading(true)
      setTimeout(() => {
        setCurrent(c => (c + 1) % IMAGES.length)
        setFading(false)
        setPrev(null)
      }, 800)
    }, INTERVAL)
    return () => clearInterval(timer)
  }, [current])

  return (
    <div
      className="relative flex items-end overflow-hidden"
      style={{ height: '100vh', marginTop: '-80px' }}
    >
      {/* Previous image (fading out) */}
      {prev !== null && (
        <Image
          key={`prev-${prev}`}
          src={IMAGES[prev]}
          alt=""
          fill
          className="object-cover transition-opacity duration-700"
          style={{ opacity: fading ? 0 : 1 }}
          priority
        />
      )}

      {/* Current image */}
      <Image
        key={`cur-${current}`}
        src={IMAGES[current]}
        alt=""
        fill
        className="object-cover transition-opacity duration-700"
        style={{ opacity: fading ? 0 : 1 }}
        priority={current === 0}
      />

      {/* Gradient overlays */}
      {/* Mobile: softer full overlay + strong bottom */}
      <div className="absolute inset-0 bg-[#04080f]/50 md:hidden" />
      {/* Desktop: directional gradient from left */}
      <div className="absolute inset-0 hidden md:block bg-gradient-to-r from-[#04080f] from-30% via-[#04080f]/70 via-55% to-transparent" />
      {/* Both: fade to dark at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#04080f] via-[#04080f]/30 to-transparent" />

      {/* Text */}
      <div className="relative z-10 px-6 md:px-12 pb-20 max-w-6xl">
        <p className="font-display font-700 text-white/60 uppercase tracking-[0.3em] text-sm mb-2">Lucky Day</p>
        <h1
          className="font-display font-800 italic uppercase tracking-tight leading-none"
          style={{ fontSize: 'clamp(4rem, 14vw, 13rem)', lineHeight: 0.85 }}
        >
          <span className="text-white">HONKBAL</span>
          <br />
          <strong className="text-[var(--accent)]">HOOFDKLASSE</strong>
        </h1>
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-8 right-8 flex gap-2 z-10">
        {IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => { setPrev(current); setFading(true); setTimeout(() => { setCurrent(i); setFading(false); setPrev(null) }, 800) }}
            className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-white w-5' : 'bg-white/40'}`}
          />
        ))}
      </div>
    </div>
  )
}
