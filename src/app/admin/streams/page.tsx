'use client'

import { useState, useEffect } from 'react'

type Stream = {
  id: number
  title: string
  stream_url: string
  platform: string | null
  is_live: boolean
  scheduled_at: string | null
}

const PLATFORMS = ['youtube', 'twitch', 'knbsb', 'other']

function fmtDate(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function AdminStreamsPage() {
  const [authed, setAuthed]     = useState(false)
  const [pw, setPw]             = useState('')
  const [savedPw, setSavedPw]   = useState('')
  const [streams, setStreams]    = useState<Stream[]>([])
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState<string | null>(null)

  // New stream form
  const [title, setTitle]         = useState('')
  const [url, setUrl]             = useState('')
  const [platform, setPlatform]   = useState('youtube')
  const [scheduledAt, setScheduledAt] = useState('')
  const [isLive, setIsLive]       = useState(false)
  const [adding, setAdding]       = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('admin-pw')
    if (stored) { setSavedPw(stored); setAuthed(true); load(stored) }
  }, [])

  async function load(password: string) {
    const res = await fetch('/api/admin/streams', { headers: { 'x-admin-password': password } })
    if (res.ok) setStreams(await res.json())
  }

  async function login() {
    const res = await fetch('/api/admin/streams', { headers: { 'x-admin-password': pw } })
    if (res.ok) {
      sessionStorage.setItem('admin-pw', pw)
      setSavedPw(pw); setAuthed(true); setStreams(await res.json())
    } else alert('Verkeerd wachtwoord')
  }

  async function addStream() {
    if (!title.trim() || !url.trim()) return
    setAdding(true)
    const res = await fetch('/api/admin/streams', {
      method: 'POST',
      headers: { 'x-admin-password': savedPw, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        stream_url: url.trim(),
        platform,
        is_live: isLive,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      }),
    })
    if (res.ok) {
      setTitle(''); setUrl(''); setScheduledAt(''); setIsLive(false)
      flash('Stream toegevoegd')
      load(savedPw)
    } else {
      const e = await res.json()
      alert('Fout: ' + e.error)
    }
    setAdding(false)
  }

  async function toggleLive(stream: Stream) {
    setLoading(true)
    await fetch('/api/admin/streams', {
      method: 'PATCH',
      headers: { 'x-admin-password': savedPw, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: stream.id, is_live: !stream.is_live }),
    })
    flash(stream.is_live ? 'Offline gezet' : 'Live gezet!')
    load(savedPw)
    setLoading(false)
  }

  async function deleteStream(id: number) {
    if (!confirm('Verwijderen?')) return
    await fetch('/api/admin/streams', {
      method: 'DELETE',
      headers: { 'x-admin-password': savedPw, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    flash('Verwijderd')
    load(savedPw)
  }

  function flash(m: string) {
    setMsg(m)
    setTimeout(() => setMsg(null), 3000)
  }

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
          className="w-full bg-[var(--accent)] text-white font-display font-800 uppercase tracking-widest text-sm py-3 rounded-xl hover:opacity-90 transition-opacity">
          Inloggen
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-800 italic text-4xl uppercase text-white">
          <strong>Streams</strong>
        </h1>
        <div className="flex items-center gap-3">
          {msg && <span className="font-display font-700 text-xs text-[var(--accent)] uppercase">{msg}</span>}
          <a href="/admin/photos" className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest hover:text-white transition-colors">
            → Foto's
          </a>
          <a href="/livestream" className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest hover:text-white transition-colors">
            → Livestream pagina
          </a>
        </div>
      </div>

      {/* Nieuwe stream toevoegen */}
      <div className="bg-[#0a1220] border border-[#1a2a3a] rounded-2xl p-6 space-y-4">
        <h2 className="font-display font-800 text-sm uppercase text-[var(--muted)] tracking-widest">
          Stream toevoegen
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            placeholder="Titel  (bv. Neptunus vs Pirates)"
            value={title} onChange={e => setTitle(e.target.value)}
            className="col-span-full bg-[#060e1b] border border-[#1a2a3a] text-white px-4 py-2.5 rounded-xl font-display text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <input
            placeholder="Stream URL (YouTube / Twitch / ...)"
            value={url} onChange={e => setUrl(e.target.value)}
            className="col-span-full bg-[#060e1b] border border-[#1a2a3a] text-white px-4 py-2.5 rounded-xl font-display text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <select
            value={platform} onChange={e => setPlatform(e.target.value)}
            className="bg-[#060e1b] border border-[#1a2a3a] text-white px-4 py-2.5 rounded-xl font-display text-sm focus:outline-none focus:border-[var(--accent)]"
          >
            {PLATFORMS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
          <input
            type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
            className="bg-[#060e1b] border border-[#1a2a3a] text-white px-4 py-2.5 rounded-xl font-display text-sm focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setIsLive(v => !v)}
              className={`w-10 h-5 rounded-full transition-colors relative ${isLive ? 'bg-[var(--accent)]' : 'bg-[#1a2a3a]'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isLive ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="font-display font-700 text-sm text-white uppercase tracking-wide">
              {isLive ? 'Nu live' : 'Gepland'}
            </span>
          </label>

          <button
            onClick={addStream} disabled={adding || !title || !url}
            className="bg-[var(--accent)] text-white font-display font-800 uppercase tracking-widest text-xs px-6 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {adding ? 'Bezig...' : 'Toevoegen'}
          </button>
        </div>
      </div>

      {/* Bestaande streams */}
      <div className="space-y-3">
        {streams.length === 0 && (
          <p className="font-display font-700 text-[var(--muted)] uppercase text-sm text-center py-8">
            Nog geen streams
          </p>
        )}

        {streams.map(s => (
          <div key={s.id}
            className={`flex items-center gap-4 rounded-xl border px-5 py-4 transition-colors ${s.is_live ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[#1a2a3a] bg-[#0a1220]'}`}
          >
            {/* Live indicator */}
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.is_live ? 'bg-[var(--accent)] animate-pulse' : 'bg-[#1a2a3a]'}`} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-display font-800 text-sm uppercase text-white truncate">{s.title}</p>
              <p className="font-display font-700 text-xs text-[var(--muted)] truncate mt-0.5">
                {s.platform?.toUpperCase()} · {fmtDate(s.scheduled_at)}
              </p>
              <p className="font-display font-700 text-[10px] text-[#2a3f5a] truncate mt-0.5">{s.stream_url}</p>
            </div>

            {/* Acties */}
            <div className="flex items-center gap-2 shrink-0">
              <a href={s.stream_url} target="_blank" rel="noopener noreferrer"
                className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest hover:text-white transition-colors px-2 py-1 border border-[#1a2a3a] rounded-lg">
                Open
              </a>
              <button
                onClick={() => toggleLive(s)} disabled={loading}
                className={`font-display font-800 text-[10px] uppercase tracking-widest px-3 py-1 rounded-lg transition-colors ${s.is_live ? 'bg-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/30' : 'bg-[#1a2a3a] text-[var(--muted)] hover:text-white'}`}
              >
                {s.is_live ? '● Live' : 'Zet live'}
              </button>
              <button
                onClick={() => deleteStream(s.id)}
                className="font-display font-700 text-[10px] text-[var(--muted)] hover:text-red-400 transition-colors px-2 py-1"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
