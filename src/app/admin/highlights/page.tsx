'use client'

import { useState, useEffect } from 'react'

type Highlight = {
  id: number
  instagram_url: string
  shortcode: string | null
  author: string | null
  caption: string | null
  thumbnail_url: string | null
  expires_at: string
  created_at: string
}

type Preview = {
  shortcode: string
  author: string
  caption: string
  thumbnail_url: string | null
}

function timeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'Verlopen'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}u ${m}m` : `${m}m`
}

function timeAgo(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime()
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h > 0) return `${h} uur geleden`
  return `${m} min geleden`
}

export default function AdminHighlightsPage() {
  const [authed, setAuthed]       = useState(false)
  const [pw, setPw]               = useState('')
  const [savedPw, setSavedPw]     = useState('')
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [url, setUrl]             = useState('')
  const [preview, setPreview]     = useState<Preview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('admin-pw')
    if (stored) { setSavedPw(stored); setAuthed(true); load(stored) }
  }, [])

  // Refresh time-left every minute
  useEffect(() => {
    if (!authed) return
    const t = setInterval(() => setHighlights(h => [...h]), 60_000)
    return () => clearInterval(t)
  }, [authed])

  async function load(password: string) {
    const res = await fetch('/api/admin/highlights', { headers: { 'x-admin-password': password } })
    if (res.ok) setHighlights(await res.json())
  }

  async function login() {
    const res = await fetch('/api/admin/highlights', { headers: { 'x-admin-password': pw } })
    if (res.ok) { sessionStorage.setItem('admin-pw', pw); setSavedPw(pw); setAuthed(true); setHighlights(await res.json()) }
    else alert('Verkeerd wachtwoord')
  }

  async function fetchPreview() {
    setError(null)
    setPreview(null)
    setPreviewLoading(true)
    const res = await fetch('/api/admin/highlights', {
      method: 'POST',
      headers: { 'x-admin-password': savedPw, 'content-type': 'application/json' },
      body: JSON.stringify({ instagram_url: url, preview: true }),
    })
    if (res.ok) {
      setPreview(await res.json())
    } else {
      const e = await res.json()
      setError(e.error ?? 'Ophalen mislukt')
    }
    setPreviewLoading(false)
  }

  async function save() {
    setSaving(true); setError(null)
    const res = await fetch('/api/admin/highlights', {
      method: 'POST',
      headers: { 'x-admin-password': savedPw, 'content-type': 'application/json' },
      body: JSON.stringify({ instagram_url: url }),
    })
    if (res.ok) {
      setUrl(''); setPreview(null)
      await load(savedPw)
    } else {
      const e = await res.json()
      setError(e.error ?? 'Opslaan mislukt')
    }
    setSaving(false)
  }

  async function remove(id: number) {
    if (!confirm('Highlight verwijderen?')) return
    await fetch('/api/admin/highlights', {
      method: 'DELETE',
      headers: { 'x-admin-password': savedPw, 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await load(savedPw)
  }

  const active  = highlights.filter(h => new Date(h.expires_at) > new Date())
  const expired = highlights.filter(h => new Date(h.expires_at) <= new Date())

  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 w-full max-w-sm space-y-4">
        <div>
          <p className="font-display font-700 text-[var(--accent)] text-xs uppercase tracking-widest mb-1">Admin</p>
          <h1 className="font-display font-800 italic text-3xl uppercase text-white">Highlights</h1>
        </div>
        <input type="password" placeholder="Wachtwoord" value={pw} onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          className="w-full bg-[#0d1b2e] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg px-4 py-3 text-white placeholder:text-white/40 outline-none font-display font-700 text-sm [color-scheme:dark]" />
        <button onClick={login}
          className="w-full bg-[var(--accent)] py-3 rounded-lg font-display font-800 text-sm uppercase tracking-wider text-white hover:bg-[var(--accent)]/80 transition-colors">
          Inloggen →
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <p className="font-display font-700 text-[var(--accent)] text-xs uppercase tracking-widest mb-1">Admin</p>
        <h1 className="font-display font-800 italic text-4xl uppercase text-white">Highlights</h1>
        <p className="font-display font-700 text-[var(--muted)] text-sm mt-1">
          Posts verschijnen 24 uur op de homepage en verdwijnen daarna automatisch.
        </p>
      </div>

      {/* Add form */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
        <p className="font-display font-800 text-sm uppercase text-white tracking-widest">Nieuwe highlight</p>

        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://www.instagram.com/p/..."
            value={url}
            onChange={e => { setUrl(e.target.value); setPreview(null); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && fetchPreview()}
            className="flex-1 bg-[#0d1b2e] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg px-4 py-2.5 text-white placeholder:text-white/40 outline-none font-display font-700 text-sm [color-scheme:dark]"
          />
          <button
            onClick={fetchPreview}
            disabled={!url.includes('instagram.com') || previewLoading}
            className="px-4 py-2.5 rounded-lg border border-[var(--border)] font-display font-800 text-xs uppercase tracking-wider text-[var(--muted)] hover:text-white hover:border-[var(--accent)] transition-colors disabled:opacity-40"
          >
            {previewLoading ? (
              <span className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin block" />
            ) : 'Preview'}
          </button>
        </div>

        {error && (
          <p className="font-display font-700 text-xs text-red-400 uppercase tracking-widest">{error}</p>
        )}

        {preview && (
          <div className="flex gap-4 bg-[#0a1220] rounded-xl p-4 border border-[var(--border)]">
            {preview.thumbnail_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.thumbnail_url} alt="" className="w-20 h-20 object-cover rounded-lg shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-display font-800 text-xs text-[var(--accent)] uppercase tracking-widest mb-1">{preview.author}</p>
              <p className="font-display font-700 text-sm text-white/80 leading-snug line-clamp-3">{preview.caption}</p>
            </div>
          </div>
        )}

        {preview && (
          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-[var(--accent)] py-2.5 rounded-xl font-display font-800 text-sm uppercase tracking-wider text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Opslaan…' : 'Toevoegen — 24 uur zichtbaar'}
          </button>
        )}
      </div>

      {/* Active highlights */}
      {active.length > 0 && (
        <section className="space-y-3">
          <p className="font-display font-700 text-xs uppercase tracking-widest text-[var(--accent)]">
            Actief ({active.length})
          </p>
          {active.map(h => (
            <div key={h.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex gap-4">
              {h.thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={h.thumbnail_url} alt="" className="w-16 h-16 object-cover rounded-lg shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-display font-800 text-xs text-[var(--accent)] uppercase tracking-widest">
                    {h.author} · Nog {timeLeft(h.expires_at)}
                  </p>
                  <button onClick={() => remove(h.id)}
                    className="font-display font-700 text-[10px] text-[var(--muted)] hover:text-red-400 uppercase tracking-widest shrink-0 transition-colors">
                    Verwijder
                  </button>
                </div>
                <p className="font-display font-700 text-sm text-white/70 leading-snug line-clamp-2">{h.caption}</p>
                <a href={h.instagram_url} target="_blank" rel="noopener noreferrer"
                  className="font-display font-700 text-[10px] text-[var(--muted)] hover:text-white uppercase tracking-widest transition-colors mt-1 inline-block">
                  Instagram →
                </a>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Expired */}
      {expired.length > 0 && (
        <section className="space-y-2">
          <p className="font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)]">
            Verlopen
          </p>
          {expired.map(h => (
            <div key={h.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 flex items-center gap-4 opacity-40">
              <div className="flex-1 min-w-0">
                <p className="font-display font-700 text-xs text-white/50 truncate">{h.author} · {timeAgo(h.created_at)}</p>
                <p className="font-display font-700 text-xs text-white/40 truncate">{h.caption}</p>
              </div>
              <button onClick={() => remove(h.id)}
                className="font-display font-700 text-[10px] text-[var(--muted)] hover:text-red-400 uppercase tracking-widest shrink-0 transition-colors">
                Verwijder
              </button>
            </div>
          ))}
        </section>
      )}

      {active.length === 0 && expired.length === 0 && (
        <p className="font-display font-700 text-[var(--muted)] text-sm uppercase tracking-widest text-center py-10">
          Nog geen highlights geplaatst
        </p>
      )}
    </div>
  )
}
