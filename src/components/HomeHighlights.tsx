'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

type Highlight = {
  id: number
  instagram_url: string
  author: string | null
  caption: string | null
  thumbnail_url: string | null
  created_at: string
}

function timeAgo(date: string): string {
  const ms = Date.now() - new Date(date).getTime()
  const h  = Math.floor(ms / 3_600_000)
  const m  = Math.floor((ms % 3_600_000) / 60_000)
  if (h >= 1) return `${h}h ago`
  return `${m}m ago`
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-1 h-6 bg-[var(--accent)] shrink-0" />
      <span className="font-display font-800 italic text-3xl md:text-4xl uppercase text-white tracking-tight">
        <strong>{children}</strong>
      </span>
    </div>
  )
}

export default function HomeHighlights() {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/highlights')
      .then(r => r.json())
      .then(d => { setHighlights(d); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  if (!loaded || highlights.length === 0) return null

  return (
    <section className="bg-[#04080f] pt-14 pb-10 px-6 md:px-12 border-t border-[#0f1e2e]">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-6">
          <SectionLabel>Highlights</SectionLabel>
        </div>

        <div className={highlights.length === 1 ? 'max-w-2xl' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
          {highlights.map((h, i) => {
            const isFeatured = i === 0 && highlights.length > 1
            return (
              <a
                key={h.id}
                href={h.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group block bg-[#0a1220] border border-[#1a2a3a] hover:border-[var(--accent)]/60 transition-colors overflow-hidden rounded-xl ${isFeatured ? 'md:col-span-2' : ''}`}
              >
                {h.thumbnail_url && (
                  <div className="relative overflow-hidden" style={{ aspectRatio: isFeatured ? '16/7' : '16/9' }}>
                    <Image
                      src={h.thumbnail_url}
                      alt={h.caption ?? ''}
                      fill
                      className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                      unoptimized
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      <span className="font-display font-800 text-[10px] text-white uppercase tracking-widest">
                        {h.author ?? 'Instagram'}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
                      <span className="font-display font-700 text-[10px] text-white/70 uppercase tracking-widest">
                        {timeAgo(h.created_at)}
                      </span>
                    </div>
                  </div>
                )}
                <div className="p-4">
                  {h.caption && (
                    <p className={`font-display font-700 text-white/80 leading-snug ${isFeatured ? 'text-base line-clamp-3' : 'text-sm line-clamp-2'}`}>
                      {h.caption}
                    </p>
                  )}
                  <p className="font-display font-700 text-[10px] text-[var(--accent)] uppercase tracking-widest mt-2 group-hover:underline">
                    Bekijk op Instagram →
                  </p>
                </div>
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
