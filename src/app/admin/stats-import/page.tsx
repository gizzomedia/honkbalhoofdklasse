'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type SeriesInfo = {
  seriesDate: string
  gameDates: string[]
  gameCount: number
  imported: boolean
  importing: boolean
  result: string | null
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
}

function fmtDate(d: string) {
  const [, m, day] = d.split('-')
  return `${parseInt(day)} ${MONTH_NAMES[m]}`
}

export default function StatsImportPage() {
  const [series, setSeries] = useState<SeriesInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSeries()
  }, [])

  async function loadSeries() {
    setLoading(true)
    try {
      // Fetch schedule from stenwessel
      const schedRes = await fetch('/api/admin/import-series')
      if (!schedRes.ok) throw new Error('Failed to load schedule')
      const data = await schedRes.json()
      setSeries(data.series)
    } catch (e) {
      setError(String(e))
    }
    setLoading(false)
  }

  async function importSeries(seriesDate: string) {
    setSeries(prev => prev.map(s =>
      s.seriesDate === seriesDate ? { ...s, importing: true, result: null } : s
    ))

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch('/api/admin/import-series', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ seriesDate }),
    })
    const json = await res.json()

    setSeries(prev => prev.map(s =>
      s.seriesDate === seriesDate
        ? {
            ...s,
            importing: false,
            imported: res.ok,
            result: res.ok
              ? `✓ ${json.gamesProcessed} games · ${json.battersImported} batters · ${json.pitchersImported} pitchers`
              : `✗ ${json.error ?? 'Failed'}`,
          }
        : s
    ))
  }

  if (loading) return (
    <div className="p-8 text-white font-display">Loading schedule…</div>
  )

  if (error) return (
    <div className="p-8 text-red-400 font-display">{error}</div>
  )

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="font-display font-800 italic text-4xl uppercase text-white">
          <strong>Stats</strong> <span className="text-[var(--accent)]">Import</span>
        </h1>
        <p className="text-[var(--muted)] text-sm mt-2">
          Importeer per serie de batting & pitching stats vanuit de stenwessel boxscores naar Supabase.
        </p>
      </div>

      <div className="space-y-3">
        {series.map(s => (
          <div
            key={s.seriesDate}
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${s.imported ? 'bg-green-500' : 'bg-[var(--muted)]'}`} />
                <p className="font-display font-800 text-white uppercase">
                  Serie {fmtDate(s.seriesDate)}
                  {s.gameDates.length > 1 && (
                    <span className="text-[var(--muted)] font-700 ml-2 text-sm">
                      — {fmtDate(s.gameDates[s.gameDates.length - 1])}
                    </span>
                  )}
                </p>
                {s.imported && (
                  <span className="font-display font-700 text-[10px] uppercase tracking-widest text-green-500">Imported</span>
                )}
              </div>
              <p className="font-display font-700 text-xs text-[var(--muted)] mt-1 ml-5">
                {s.gameCount} {s.gameCount === 1 ? 'game' : 'games'} ·{' '}
                {s.gameDates.map(fmtDate).join(', ')}
              </p>
              {s.result && (
                <p className={`font-display font-700 text-xs mt-1 ml-5 ${s.result.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                  {s.result}
                </p>
              )}
            </div>

            <button
              onClick={() => importSeries(s.seriesDate)}
              disabled={s.importing}
              className="shrink-0 font-display font-800 text-xs uppercase tracking-wider px-4 py-2 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {s.importing ? 'Importing…' : s.imported ? 'Re-import' : 'Import'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
