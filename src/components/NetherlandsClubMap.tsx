'use client'

import { useEffect, useRef, useState } from 'react'
import { TEAM_COLORS, TEAM_NAMES } from '@/lib/teams'

const CLUBS = [
  { teamId: 'neptunus',  city: 'Rotterdam',  lat: 51.9225, lon: 4.4792 },
  { teamId: 'pirates',   city: 'Amsterdam',  lat: 52.3676, lon: 4.9041 },
  { teamId: 'kinheim',   city: 'Haarlem',    lat: 52.3874, lon: 4.6462 },
  { teamId: 'hcaw',      city: 'Bussum',     lat: 52.2758, lon: 5.1681 },
  { teamId: 'twins',     city: 'Oosterhout', lat: 51.6400, lon: 4.8600 },
  { teamId: 'pioniers',  city: 'Hoofddorp',  lat: 52.3014, lon: 4.6939 },
  { teamId: 'uvv',       city: 'Utrecht',    lat: 52.0907, lon: 5.1214 },
]

export default function NetherlandsClubMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let map: {
      remove: () => void
      fitBounds: (bounds: [[number,number],[number,number]], opts: object) => void
    } | null = null

    import('maplibre-gl').then(({ default: maplibregl }) => {
      if (!containerRef.current) return

      map = new maplibregl.Map({
        container: containerRef.current,
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json',
        interactive: false,
        attributionControl: false,
      })

      map.fitBounds([[3.2, 50.6], [7.4, 53.7]], { padding: 40, duration: 0 })

      ;(map as maplibregl.Map).on('load', () => {
        CLUBS.forEach(club => {
          const color = TEAM_COLORS[club.teamId] ?? '#ff6b00'

          // Pulse ring element
          const el = document.createElement('div')
          el.style.cssText = `position:relative;width:20px;height:20px;cursor:default;`

          const ring = document.createElement('div')
          ring.style.cssText = `
            position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.35;
            animation:pulse-ring 2.2s ease-out infinite;
          `

          const dot = document.createElement('div')
          dot.style.cssText = `
            position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
            width:10px;height:10px;border-radius:50%;background:${color};
            border:2px solid rgba(255,255,255,0.8);
            box-shadow:0 0 8px ${color}80;
          `

          el.appendChild(ring)
          el.appendChild(dot)

          new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat([club.lon, club.lat])
            .setPopup(
              new maplibregl.Popup({
                closeButton: false,
                offset: 14,
                className: 'hk-popup',
              }).setHTML(`
                <div style="font-family:system-ui,sans-serif;padding:2px 0">
                  <div style="font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:white">${TEAM_NAMES[club.teamId] ?? club.teamId}</div>
                  <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:1px">${club.city}</div>
                </div>
              `)
            )
            .addTo(map as maplibregl.Map)

          el.addEventListener('mouseenter', () => {
            setHovered(club.teamId)
            dot.style.width = '14px'
            dot.style.height = '14px'
          })
          el.addEventListener('mouseleave', () => {
            setHovered(null)
            dot.style.width = '10px'
            dot.style.height = '10px'
          })
        })
      })

      mapRef.current = map
    })

    return () => {
      if (map) map.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: 340 }}>
      {/* Pulse ring keyframe injected once */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.45; }
          70% { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(0.8); opacity: 0; }
        }
        .hk-popup .maplibregl-popup-content {
          background: #0a1220 !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 10px !important;
          padding: 8px 12px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
        }
        .hk-popup .maplibregl-popup-tip { border-top-color: #0a1220 !important; }
      `}</style>
      <div ref={containerRef} className="w-full h-full" />
      {/* Edge fade */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 60%, var(--navy) 100%)' }}
      />
    </div>
  )
}
