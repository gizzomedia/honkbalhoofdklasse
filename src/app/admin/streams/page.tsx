'use client'

import { useState, useEffect } from 'react'

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
  const [authed, setAuthed]   = useState(false)
  const [pw, setPw]           = useState('')
  const [savedPw, setSavedPw] = useState('')
  const [games, setGames]     = useState<Game[]>([])
  const [streams, setStreams]  = useState<Stream[]>([])
  const [urls, setUrls]       = useState<Record<number, string>>({})
  const [saving, setSaving]   = useState<number | null>(null)
  const [msg, setMsg]         = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('admin-pw')
    if (stored) { setSavedPw(stored); setAuthed(true); load(stored) }
  }, [])

  async function load(password: string) {
    const res = await fetch('/api/admin/streams', { headers: { 'x-admin-password': password } })
    if (!res.ok) return
    const { games: g, streams: s } = await res.json()
    setGames(g ?? [])
    setStreams(s ?? [])
  }

  async function login() {
    const res = await fetch('/api/admin/streams', { headers: { 'x-admin-password': pw } })
    if (res.ok) {
      localStorage.setItem('admin-pw', pw)
      setSavedPw(pw); setAuthed(true)
      const { games: g, streams: s } = await res.json()
      setGames(g ?? []); setStreams(s ?? [])
    } else alert('Verkeerd wachtwoord')
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
        headers: { 'x-admin-password': savedPw, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: existing.id, stream_url: url, platform: detectPlatform(url) }),
      })
    } else {
      await fetch('/api/admin/streams', {
        method: 'POST',
        headers: { 'x-admin-password': savedPw, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, stream_url: url, platform: detectPlatform(url),
          game_id: game.id, scheduled_at,
        }),
      })
    }

    setUrls(p => { const n = { ...p }; delete n[game.id]; return n })
    flash('Opgeslagen')
    load(savedPw)
    setSaving(null)
  }

  async function remove(streamId: number) {
    await fetch('/api/admin/streams', {
      method: 'DELETE',
      headers: { 'x-admin-password': savedPw, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: streamId }),
    })
    flash('Verwijderd')
    load(savedPw)
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3000) }

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center bg-[#06101e]">
      <div className="bg-[#0a1220] border border-[#1a2a3a] p-8 rounded-2xl w-full max-w-sm space-y-4">
        <h1 className="font-display font-800 text-2xl uppercase text-white">Admin · Streams</h1>
        <input
          type="password" placeholder="Wachtwoord" value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          className="w-full bg-[#060e1b] border border-[#1a2a3a] text-white px-4 py-3 rounded-xl font-display text-sm focus:outline-none focus:border-[var(--accent)]"
        />
        <button onClick={login}
          className="w-full bg-[var(--accent)] text-white font-display font-800 uppercase tracking-widest text-sm py-3 rounded-xl hover:opacity-90">
          Inloggen
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-800 italic text-4xl uppercase text-white"><strong>Streams</strong></h1>
          <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-wider mt-1">
            Stream gaat automatisch live als de wedstrijd begint
          </p>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="font-display font-700 text-xs text-[var(--accent)] uppercase">{msg}</span>}
          <a href="/admin" className="font-display font-700 text-xs text-[var(--muted)] uppercase hover:text-white transition-colors">
            ← Admin
          </a>
        </div>
      </div>

      {/* Game list */}
      <div className="space-y-2">
        {games.length === 0 && (
          <p className="font-display font-700 text-[var(--muted)] uppercase text-sm text-center py-12">
            Geen aankomende wedstrijden
          </p>
        )}

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
              {/* Wedstrijd info */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-display font-800 text-sm uppercase text-white">
                    {TEAM_NAME[g.away_team_id] ?? g.away_team_id}
                    <span className="text-[var(--muted)] mx-1.5 font-700">vs</span>
                    {TEAM_NAME[g.home_team_id] ?? g.home_team_id}
                  </p>
                  <p className="font-display font-700 text-xs text-[var(--muted)] mt-0.5">{fmtGame(g)}</p>
                </div>
                {g.status === 'live' && (
                  <span className="flex items-center gap-1.5 font-display font-800 text-[10px] text-[var(--accent)] uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                    Live
                  </span>
                )}
                {existing?.is_live && (
                  <span className="flex items-center gap-1.5 font-display font-800 text-[10px] text-[var(--accent)] uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                    Stream live
                  </span>
                )}
              </div>

              {/* URL rij */}
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
  )
}
