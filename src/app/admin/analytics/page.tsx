'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Overview = { total: number; devices: number; bounceRate: number }
type Bucket   = { key: string; total: number; devices: number; bounceRate?: number }
type AnalyticsData = {
  overview:   Overview
  timeseries: Bucket[]
  byPath:     Bucket[]
  byCountry:  Bucket[]
  byDevice:   Bucket[]
  byReferrer: Bucket[]
}

const COUNTRY_NAMES: Record<string, string> = {
  NL: 'Netherlands', DE: 'Germany', BE: 'Belgium', JP: 'Japan',
  US: 'United States', GB: 'United Kingdom', FR: 'France', AW: 'Aruba',
  VE: 'Venezuela', AU: 'Australia', CA: 'Canada', ES: 'Spain',
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[#0a1220] border border-[#1a2a3a] rounded-xl px-6 py-5">
      <p className="font-display font-700 text-xs uppercase text-[var(--muted)] tracking-wider mb-1">{label}</p>
      <p className="font-display font-800 text-3xl text-white">{value}</p>
      {sub && <p className="font-display font-700 text-xs text-[var(--muted)] mt-1">{sub}</p>}
    </div>
  )
}

function BarList({ title, data, total }: { title: string; data: Bucket[]; total: number }) {
  const max = data[0]?.total ?? 1
  return (
    <div className="bg-[#0a1220] border border-[#1a2a3a] rounded-xl p-5">
      <p className="font-display font-800 text-sm uppercase text-white tracking-wide mb-4">{title}</p>
      <div className="space-y-2.5">
        {data.slice(0, 8).map(row => {
          const pct = total > 0 ? Math.round((row.total / total) * 100) : 0
          const bar = max > 0 ? (row.total / max) * 100 : 0
          const label = COUNTRY_NAMES[row.key] ?? row.key
          return (
            <div key={row.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-display font-700 text-xs text-white/80 truncate max-w-[60%]">{label}</span>
                <span className="font-display font-700 text-xs text-[var(--muted)]">{row.total} <span className="text-white/30">({pct}%)</span></span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${bar}%` }} />
              </div>
            </div>
          )
        })}
        {data.length === 0 && <p className="font-display font-700 text-xs text-[var(--muted)]">No data</p>}
      </div>
    </div>
  )
}

function MiniChart({ data, granularity }: { data: Bucket[]; granularity: string }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.total), 1)
  const fmt = (key: string) => {
    if (granularity === 'hour') {
      const d = new Date(key)
      return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}h`
    }
    const [, m, d] = key.split('-')
    return `${parseInt(m)}/${parseInt(d)}`
  }
  const showEvery = data.length > 20 ? Math.ceil(data.length / 10) : 1

  return (
    <div className="bg-[#0a1220] border border-[#1a2a3a] rounded-xl p-5">
      <p className="font-display font-800 text-sm uppercase text-white tracking-wide mb-4">Page Views Over Time</p>
      <div className="flex items-end gap-0.5 h-24">
        {data.map((b, i) => (
          <div key={b.key} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full bg-[var(--accent)]/40 hover:bg-[var(--accent)] rounded-sm transition-colors cursor-default"
              style={{ height: `${(b.total / max) * 96}px`, minHeight: b.total > 0 ? '2px' : '0' }}
              title={`${fmt(b.key)}: ${b.total}`}
            />
          </div>
        ))}
      </div>
      {/* X labels — show a subset */}
      <div className="flex gap-0.5 mt-1 overflow-hidden">
        {data.map((b, i) => (
          <div key={b.key} className="flex-1 text-center">
            {i % showEvery === 0 && (
              <span className="font-display font-700 text-[9px] text-white/30">{fmt(b.key)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const RANGES = [
  { label: '7 days',  value: '7d'  },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
]

export default function AnalyticsPage() {
  const [pw, setPw]         = useState('')
  const [authed, setAuthed] = useState(false)
  const [range, setRange]   = useState('30d')
  const [data, setData]     = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('admin-pw')
    if (saved) { setPw(saved); setAuthed(true) }
  }, [])

  const fetchData = useCallback(async (password: string, r: string) => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/admin/analytics?range=${r}`, {
        headers: { 'x-admin-password': password },
      })
      if (res.status === 401) { setError('Wrong password'); setLoading(false); return }
      const json = await res.json()
      setData(json)
    } catch {
      setError('Failed to load')
    }
    setLoading(false)
  }, [])

  function login(e: React.FormEvent) {
    e.preventDefault()
    localStorage.setItem('admin-pw', pw)
    setAuthed(true)
    fetchData(pw, range)
  }

  useEffect(() => {
    if (authed && pw) fetchData(pw, range)
  }, [authed, pw, range, fetchData])

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06101e]">
        <form onSubmit={login} className="space-y-4 w-full max-w-xs px-4">
          <h1 className="font-display font-800 italic text-3xl uppercase text-white">Admin</h1>
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)}
            placeholder="Password" autoFocus
            className="w-full bg-[#0a1220] border border-[#1a2a3a] rounded-xl px-4 py-3 text-white font-display font-700 text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <button type="submit" className="w-full bg-[var(--accent)] text-white font-display font-800 text-sm uppercase tracking-wider py-3 rounded-xl hover:opacity-90 transition-opacity">
            Login
          </button>
          {error && <p className="text-red-400 font-display font-700 text-xs">{error}</p>}
        </form>
      </div>
    )
  }

  const ov = data?.overview
  const totalPageviews = ov?.total ?? 0
  const granularity = range === '7d' ? 'hour' : 'day'

  return (
    <div className="min-h-screen bg-[#06101e] px-4 py-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="font-display font-800 text-[var(--accent)] text-sm hover:opacity-80">← Admin</Link>
          <h1 className="font-display font-800 italic text-3xl uppercase text-white">Analytics</h1>
          <div className="ml-auto flex gap-2">
            {RANGES.map(r => (
              <button key={r.value} onClick={() => setRange(r.value)}
                className={`font-display font-700 text-xs uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors ${range === r.value ? 'bg-[var(--accent)] text-white' : 'bg-[#0a1220] border border-[#1a2a3a] text-white/60 hover:text-white'}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="text-center py-20 text-white/40 font-display font-700 text-sm uppercase tracking-wider">
            Loading…
          </div>
        )}
        {error && <p className="text-red-400 font-display font-700 text-sm mb-4">{error}</p>}

        {data && !loading && (
          <div className="space-y-6">
            {/* Overview stats */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Page Views"      value={totalPageviews.toLocaleString()} />
              <StatCard label="Unique Visitors" value={(ov?.devices ?? 0).toLocaleString()} />
              <StatCard label="Bounce Rate"     value={`${ov?.bounceRate ?? 0}%`} />
            </div>

            {/* Chart */}
            <MiniChart data={data.timeseries} granularity={granularity} />

            {/* Breakdown grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BarList title="Top Pages"    data={data.byPath}     total={totalPageviews} />
              <BarList title="Countries"    data={data.byCountry}  total={totalPageviews} />
              <BarList title="Devices"      data={data.byDevice}   total={totalPageviews} />
              <BarList title="Referrers"    data={data.byReferrer} total={totalPageviews} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
