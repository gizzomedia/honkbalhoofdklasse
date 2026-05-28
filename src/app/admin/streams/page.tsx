'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Game = {
  id: number
  game_date: string
  game_time: string | null
  home_team_id: string
  away_team_id: string
  status: string
}

type Stream = {
  id: number
  game_id: number | null
  title: string
  stream_url: string
  platform: string | null
  is_live: boolean
}

const TEAM_NAME: Record<string, string> = {
  neptunus: 'Neptunus', pirates: 'Pirates', kinheim: 'Kinheim',
  hcaw: 'HCAW', twins: 'Twins', pioniers: 'Pioniers', uvv: 'UVV',
}

function fmtGame(g: Game) {
  const d = new Date(g.game_date + 'T12:00:00')
  const date = d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = g.game_time ? g.game_time.slice(0, 5) : ''
  return `${date}${time ? ' · ' + time : ''}`
}

function detectPlatform(url: string) {
  if (url.includes('youtube') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('twitch')) return 'twitch'
  return 'other'
}

export default function AdminStreamsPage() {
  const [games, setGames]     = useState<Game[]>([])
  const [streams, setStreams]  = useState<Stream[]>([])
  const [urls, setUrls]       = useState<Record<number, string>>({})
  const [saving, setSaving]   = useState<number | null>(null)
  const [msg, setMsg]         = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/streams')
    if (res.status === 401 || res.status === 403) {
      setDenied(true)
      setLoading(false)
      return
    }
    const { games: g, streams: s } = await res.json()
    setGames(g ?? [])
    setStreams(s ?? [])
    setLoading(false)
  }

  function streamForGame(gameId: number) {
    return streams.find(s => s.game_id === gameId)
  }

  async function save(game: Game) {
    const url = (urls[game.id] ?? '').trim()
    if (!url) return
    setSaving(game.id)

    const title = `${TEAM_NAME[game.away_team_id] ?? game.away_team_id} vs ${TEAM_NAME[game.home_team_id] ?? game.home_team_id}`
    const scheduled_at = game.game_date + 'T' + (game.game_time ?? '12:00:00')
    const existing = streamForGame(game.id)

    if (existing) {
      await fetch('/api/admin/streams', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: existing.id, stream_url: url, platform: detectPlatform(url) }),
      })
    } else {
      await fetch('/api/admin/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, stream_url: url, platform: detectPlatform(url), game_id: game.id, scheduled_at }),
      })
    }

    setUrls(p => { const n = { ...p }; delete n[game.id]; return n })
    flash('Opgeslagen')
    load()
    setSaving(null)
  }

  async function remove(streamId: number) {
    await fetch('/api/admin/streams', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: streamId }),
    })
    flash('Verwijderd')
    load()
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3000) }

  if (denied) {
    return (
      <div className="min-h-screen bg-[#06101e] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-display font-800 text-white uppercase text-lg mb-2">Geen toegang</p>
          <p className="font-display font-700 text-sm text-[var(--muted)] mb-6">Je hebt geen rechten voor streams.</p>
          <Link href="/admin" className="font-display font-700 text-xs text-[var(--accent)] uppercase tracking-wider">
            ← Terug naar admin
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#06101e] px-4 pt-20 pb-16">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <Link href="/admin" className="font-display font-700 text-xs text-[var(--muted)] hover:text-white uppercase tracking-wider transition-colors mb-2 block">
              ← Terug
            </Link>
            <h1 className="font-display font-800 italic text-4xl uppercase text-white">Streams</h1>
            <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-wider mt-1">
              Stream gaat automatisch live als de wedstrijd begint
            </p>
          </div>
          {msg && <span className="font-display font-700 text-xs text-[var(--accent)] uppercase">{msg}</span>}
        </div>

        {loading && (
          <p className="font-display font-700 text-[var(--muted)] uppercase text-sm text-center py-12 animate-pulse">
            Laden…
          </p>
        )}

        {!loading && games.length === 0 && (
          <p className="font-display font-700 text-[var(--muted)] uppercase text-sm text-center py-12">
            Geen aankomende thuiswedstrijden
          </p>
        )}

        <div className="space-y-2">
          {games.map(g => {
            const existing = streamForGame(g.id)
            const typing   = urls[g.id] ?? ''

            return (
              <div key={g.id}
                className={`border rounded-xl px-5 py-4 transition-colors ${
                  existing
                    ? 'border-[var(--accent)]/50 bg-[var(--accent)]/5'
                    : 'border-[#1a2a3a] bg-[#0a1220]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-display font-800 text-sm uppercase text-white">
                      {TEAM_NAME[g.away_team_id] ?? g.away_team_id}
                      <span className="text-[var(--muted)] mx-1.5 font-700">vs</span>
                      {TEAM_NAME[g.home_team_id] ?? g.home_team_id}
                    </p>
                    <p className="font-display font-700 text-xs text-[var(--muted)] mt-0.5">{fmtGame(g)}</p>
                  </div>
                  {(g.status === 'live' || existing?.is_live) && (
                    <span className="flex items-center gap-1.5 font-display font-800 text-[10px] text-[var(--accent)] uppercase tracking-widest">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                      Live
                    </span>
                  )}
                </div>

                {existing ? (
                  <div className="flex items-center gap-3">
                    <a href={existing.stream_url} target="_blank" rel="noopener noreferrer"
                      className="flex-1 font-display font-700 text-xs text-[var(--accent)] truncate hover:underline min-w-0">
                      {existing.stream_url}
                    </a>
                    <button onClick={() => remove(existing.id)}
                      className="font-display font-700 text-[10px] text-[var(--muted)] hover:text-red-400 transition-colors shrink-0 px-2 py-1">
                      Verwijderen
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      placeholder="https://youtube.com/watch?v=..."
                      value={typing}
                      onChange={e => setUrls(p => ({ ...p, [g.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && save(g)}
                      className="flex-1 bg-[#060e1b] border border-[#1a2a3a] text-white px-3 py-2 rounded-lg font-display text-xs focus:outline-none focus:border-[var(--accent)] placeholder:text-[#2a3f5a]"
                    />
                    <button
                      onClick={() => save(g)}
                      disabled={!typing.trim() || saving === g.id}
                      className="bg-[var(--accent)] text-white font-display font-800 text-xs uppercase tracking-widest px-4 py-2 rounded-lg disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
                    >
                      {saving === g.id ? '...' : 'Opslaan'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
