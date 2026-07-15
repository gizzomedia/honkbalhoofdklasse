'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Totals = { clicks: number; impressions: number; ctr: number; position: number }
type Point = { date: string; clicks: number; impressions: number }
type QueryRow = { query: string; clicks: number; impressions: number; ctr: number; position: number }
type PageRow = { page: string; clicks: number; impressions: number; ctr: number; position: number }
type GeoRow = { country: string; clicks: number; impressions: number }
type DeviceRow = { device: string; clicks: number; impressions: number }

type GscData = {
  totals: Totals
  timeseries: Point[]
  queries: QueryRow[]
  pages: PageRow[]
  countries: GeoRow[]
  devices: DeviceRow[]
  error?: string
}

const COUNTRY_NAMES: Record<string, string> = {
  nld: 'Netherlands', deu: 'Germany', bel: 'Belgium', jpn: 'Japan',
  usa: 'United States', gbr: 'United Kingdom', fra: 'France', abw: 'Aruba',
  ven: 'Venezuela', aus: 'Australia', can: 'Canada', esp: 'Spain',
  cur: 'Curaçao', ita: 'Italy', tha: 'Thailand', kor: 'South Korea',
}

const DEVICE_NAMES: Record<string, string> = {
  MOBILE: 'Mobile', DESKTOP: 'Desktop', TABLET: 'Tablet',
}

function fmtNum(n: number): string {
  return Math.round(n).toLocaleString()
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#0a1220] border border-[#1a2a3a] rounded-xl px-6 py-5">
      <p className="font-display font-700 text-xs uppercase text-[var(--muted)] tracking-wider mb-1">{label}</p>
      <p className="font-display font-800 text-3xl text-white">{value}</p>
      {sub && <p className="font-display font-700 text-xs text-[var(--muted)] mt-1">{sub}</p>}
    </div>
  )
}

function TimeChart({ data }: { data: Point[] }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.impressions), 1)
  const maxClicks = Math.max(...data.map(d => d.clicks), 1)
  const showEvery = data.length > 20 ? Math.ceil(data.length / 10) : 1
  const fmt = (key: string) => {
    const [, m, d] = key.split('-')
    return `${parseInt(m)}/${parseInt(d)}`
  }

  return (
    <div className="bg-[#0a1220] border border-[#1a2a3a] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="font-display font-800 text-sm uppercase text-white tracking-wide">Over Time</p>
        <div className="flex gap-4">
          <span className="font-display font-700 text-xs text-white/50 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--accent)]/40 inline-block" /> Impressions
          </span>
          <span className="font-display font-700 text-xs text-white/50 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[var(--accent)] inline-block" /> Clicks
          </span>
        </div>
      </div>
      <div className="flex items-end gap-0.5 h-28">
        {data.map(b => (
          <div key={b.date} className="flex-1 flex flex-col items-center justify-end gap-0 group relative h-full">
            <div
              className="w-full bg-[var(--accent)]/30 group-hover:bg-[var(--accent)]/50 rounded-t-sm transition-colors relative"
              style={{ height: `${(b.impressions / max) * 100}%`, minHeight: b.impressions > 0 ? '2px' : '0' }}
              title={`${fmt(b.date)}: ${b.impressions} impressions, ${b.clicks} clicks`}
            >
              <div
                className="w-full bg-[var(--accent)] rounded-t-sm absolute bottom-0 left-0"
                style={{ height: `${(b.clicks / b.impressions) * 100 || 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-0.5 mt-1 overflow-hidden">
        {data.map((b, i) => (
          <div key={b.date} className="flex-1 text-center">
            {i % showEvery === 0 && (
              <span className="font-display font-700 text-[9px] text-white/30">{fmt(b.date)}</span>
            )}
          </div>
        ))}
      </div>
      <span className="sr-only">{maxClicks}</span>
    </div>
  )
}

function QueryTable({ rows }: { rows: QueryRow[] }) {
  const max = rows[0]?.impressions ?? 1
  return (
    <div className="bg-[#0a1220] border border-[#1a2a3a] rounded-xl p-5">
      <p className="font-display font-800 text-sm uppercase text-white tracking-wide mb-4">Top Search Queries</p>
      <div className="space-y-2">
        {rows.slice(0, 15).map(r => (
          <div key={r.query}>
            <div className="flex items-center justify-between mb-1 gap-3">
              <span className="font-display font-700 text-xs text-white/80 truncate flex-1">{r.query}</span>
              <span className="font-display font-700 text-xs text-[var(--muted)] shrink-0">
                <span className="text-white">{r.clicks}</span> clicks · {r.impressions} impr
              </span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${(r.impressions / max) * 100}%` }} />
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="font-display font-700 text-xs text-[var(--muted)]">No data</p>}
      </div>
    </div>
  )
}

function PageTable({ rows }: { rows: PageRow[] }) {
  const max = rows[0]?.impressions ?? 1
  const short = (url: string) => url.replace(/^https?:\/\/[^/]+/, '') || '/'
  return (
    <div className="bg-[#0a1220] border border-[#1a2a3a] rounded-xl p-5">
      <p className="font-display font-800 text-sm uppercase text-white tracking-wide mb-4">Top Pages</p>
      <div className="space-y-2">
        {rows.slice(0, 15).map(r => (
          <div key={r.page}>
            <div className="flex items-center justify-between mb-1 gap-3">
              <span className="font-display font-700 text-xs text-white/80 truncate flex-1">{short(r.page)}</span>
              <span className="font-display font-700 text-xs text-[var(--muted)] shrink-0">
                <span className="text-white">{r.clicks}</span> clicks · {r.impressions} impr
              </span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${(r.impressions / max) * 100}%` }} />
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="font-display font-700 text-xs text-[var(--muted)]">No data</p>}
      </div>
    </div>
  )
}

function BarList({ title, rows }: { title: string; rows: { label: string; clicks: number; impressions: number }[] }) {
  const max = rows[0]?.impressions ?? 1
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0)
  return (
    <div className="bg-[#0a1220] border border-[#1a2a3a] rounded-xl p-5">
      <p className="font-display font-800 text-sm uppercase text-white tracking-wide mb-4">{title}</p>
      <div className="space-y-2.5">
        {rows.slice(0, 10).map(r => {
          const pct = totalClicks > 0 ? Math.round((r.clicks / totalClicks) * 100) : 0
          return (
            <div key={r.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-display font-700 text-xs text-white/80 truncate max-w-[55%]">{r.label}</span>
                <span className="font-display font-700 text-xs text-[var(--muted)]">
                  {r.clicks} <span className="text-white/30">({pct}%)</span>
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${(r.impressions / max) * 100}%` }} />
              </div>
            </div>
          )
        })}
        {rows.length === 0 && <p className="font-display font-700 text-xs text-[var(--muted)]">No data</p>}
      </div>
    </div>
  )
}

const RANGES = [
  { label: '7 days',  value: '7d'  },
  { label: '28 days', value: '28d' },
  { label: '90 days', value: '90d' },
]

export default function AnalyticsPage() {
  const [pw, setPw]         = useState('')
  const [authed, setAuthed] = useState(false)
  const [range, setRange]   = useState('28d')
  const [data, setData]     = useState<GscData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('admin-pw')
    if (saved) { setPw(saved); setAuthed(true) }
  }, [])

  const fetchData = useCallback(async (password: string, r: string) => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/gsc?range=${r}`, {
        headers: { 'x-admin-password': password },
      })
      if (res.status === 401) { setError('Wrong password'); setLoading(false); return }
      const json = await res.json()
      if (json.error) setError(json.error)
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
          <h1 className="font-display font-800 italic text-3xl uppercase text-white">Search Analytics</h1>
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

  const t = data?.totals
  const ctrPct = t ? (t.ctr * 100).toFixed(1) : '0'
  const avgPos = t ? t.position.toFixed(1) : '0'

  return (
    <div className="min-h-screen bg-[#06101e] px-4 py-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8 flex-wrap">
          <Link href="/admin" className="font-display font-800 text-[var(--accent)] text-sm hover:opacity-80">← Admin</Link>
          <h1 className="font-display font-800 italic text-3xl uppercase text-white">Search Analytics</h1>
          <div className="ml-auto flex gap-2">
            {RANGES.map(r => (
              <button key={r.value} onClick={() => setRange(r.value)}
                className={`font-display font-700 text-xs uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors ${range === r.value ? 'bg-[var(--accent)] text-white' : 'bg-[#0a1220] border border-[#1a2a3a] text-white/60 hover:text-white'}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-wider mb-6">
          Google Search Console · honkbalhoofdklasse.com
        </p>

        {loading && (
          <div className="text-center py-20 text-white/40 font-display font-700 text-sm uppercase tracking-wider">
            Loading…
          </div>
        )}
        {error && <p className="text-red-400 font-display font-700 text-sm mb-4">{error}</p>}

        {data && !loading && (
          <div className="space-y-6">
            {/* Overview stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Clicks"       value={fmtNum(t?.clicks ?? 0)} />
              <StatCard label="Impressions"  value={fmtNum(t?.impressions ?? 0)} />
              <StatCard label="Avg CTR"      value={`${ctrPct}%`} />
              <StatCard label="Avg Position" value={avgPos} />
            </div>

            {/* Chart */}
            <TimeChart data={data.timeseries} />

            {/* Queries + Pages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <QueryTable rows={data.queries} />
              <PageTable rows={data.pages} />
            </div>

            {/* Countries + Devices */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BarList
                title="Countries"
                rows={data.countries.map(c => ({ label: COUNTRY_NAMES[c.country] ?? c.country.toUpperCase(), clicks: c.clicks, impressions: c.impressions }))}
              />
              <BarList
                title="Devices"
                rows={data.devices.map(d => ({ label: DEVICE_NAMES[d.device] ?? d.device, clicks: d.clicks, impressions: d.impressions }))}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
