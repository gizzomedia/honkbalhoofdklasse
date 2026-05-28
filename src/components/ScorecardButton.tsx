'use client'

import { useState } from 'react'

type Props = {
  teamId: string
  playerSlug: string
  playerName: string
}

export default function ScorecardButton({ teamId, playerSlug, playerName }: Props) {
  const [loading, setLoading] = useState(false)

  async function download() {
    setLoading(true)
    try {
      // Fetch current season stats
      let params = ''
      const res = await fetch('/api/compare')
      if (res.ok) {
        const players: { name: string; avg: number; hr: number; rbi: number; ops: number; sb: number }[] = await res.json()
        const found = players.find(p => p.name.toLowerCase() === playerName.toLowerCase())
        if (found) {
          const p = new URLSearchParams({
            avg: found.avg?.toFixed(3) ?? '',
            hr:  String(found.hr  ?? ''),
            rbi: String(found.rbi ?? ''),
            ops: found.ops?.toFixed(3) ?? '',
            sb:  String(found.sb  ?? ''),
          })
          params = '?' + p.toString()
        }
      }

      const imgRes = await fetch(`/api/scorecard/${teamId}/${playerSlug}${params}`)
      const blob   = await imgRes.blob()
      const url    = URL.createObjectURL(blob)
      const a      = document.createElement('a')
      a.href     = url
      a.download = `${playerName.replace(/\s+/g, '-')}-scorecard.png`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={download}
      disabled={loading}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-display font-800 text-sm uppercase tracking-wider bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)] text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      )}
      {loading ? 'Laden…' : 'Scorecard'}
    </button>
  )
}
