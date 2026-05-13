'use client'

import { useState, useEffect, useRef } from 'react'
import { ROSTERS } from '@/lib/rosters-data'

const ALL_PLAYERS = Object.entries(ROSTERS)
  .flatMap(([teamId, roster]) =>
    roster.players.map(p => ({ name: p.name, teamId }))
  )
  .sort((a, b) => a.name.localeCompare(b.name))

const TEAM_NAMES: Record<string, string> = {
  neptunus: 'Neptunus', pirates: 'Pirates', kinheim: 'Kinheim',
  hcaw: 'HCAW', twins: 'Twins', pioniers: 'Pioniers', uvv: 'UVV',
}

type PlayerPhoto = { player_name: string; banner_url: string | null; headshot_url: string | null }

function PhotoThumb({ url, shape }: { url: string | null; shape: 'banner' | 'round' }) {
  if (!url) return (
    <div className={`bg-[#0f1e2e] border border-[var(--border)] flex items-center justify-center text-[10px] text-[var(--muted)] uppercase ${shape === 'banner' ? 'w-24 h-12 rounded' : 'w-10 h-10 rounded-full'}`}>
      —
    </div>
  )
  return shape === 'banner'
    ? <img src={url} alt="" className="w-24 h-12 object-cover rounded border border-[var(--border)]" />
    : <img src={url} alt="" className="w-10 h-10 object-cover rounded-full border border-[var(--border)]" />
}

function UploadButton({
  label, uploading, onFile,
}: { label: string; uploading: boolean; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <label className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-display font-700 text-xs uppercase transition-colors ${uploading ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-white'}`}>
      {uploading ? (
        <span className="w-3 h-3 border border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      )}
      {label}
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => { if (e.target.files?.[0]) { onFile(e.target.files[0]); e.target.value = '' } }} />
    </label>
  )
}

export default function AdminPhotosPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [savedPw, setSavedPw] = useState('')
  const [photos, setPhotos] = useState<PlayerPhoto[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem('admin-pw')
    if (stored) { setSavedPw(stored); setAuthed(true); loadPhotos(stored) }
  }, [])

  async function loadPhotos(password: string) {
    const res = await fetch('/api/admin/photos', { headers: { 'x-admin-password': password } })
    if (res.ok) setPhotos(await res.json())
  }

  async function login() {
    const res = await fetch('/api/admin/photos', { headers: { 'x-admin-password': pw } })
    if (res.ok) {
      sessionStorage.setItem('admin-pw', pw)
      setSavedPw(pw)
      setAuthed(true)
      setPhotos(await res.json())
    } else {
      alert('Verkeerd wachtwoord')
    }
  }

  async function upload(playerName: string, teamId: string, photoType: 'banner' | 'headshot', file: File) {
    const key = `${playerName}-${photoType}`
    setUploading(key)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('playerName', playerName)
    fd.append('teamId', teamId)
    fd.append('photoType', photoType)

    const res = await fetch('/api/admin/upload-photo', {
      method: 'POST',
      headers: { 'x-admin-password': savedPw },
      body: fd,
    })

    if (res.ok) {
      setSuccess(playerName)
      setTimeout(() => setSuccess(null), 2000)
      await loadPhotos(savedPw)
    } else {
      const e = await res.json()
      alert(`Upload mislukt: ${e.error}`)
    }
    setUploading(null)
  }

  async function remove(playerName: string, photoType: 'banner' | 'headshot') {
    if (!confirm(`Verwijder ${photoType} van ${playerName}?`)) return
    await fetch('/api/admin/photos', {
      method: 'DELETE',
      headers: { 'x-admin-password': savedPw, 'content-type': 'application/json' },
      body: JSON.stringify({ playerName, photoType }),
    })
    await loadPhotos(savedPw)
  }

  const filtered = filter
    ? ALL_PLAYERS.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || TEAM_NAMES[p.teamId]?.toLowerCase().includes(filter.toLowerCase()))
    : ALL_PLAYERS

  const withPhotos = filtered.filter(p => {
    const ph = photos.find(x => x.player_name.toLowerCase() === p.name.toLowerCase())
    return ph?.banner_url || ph?.headshot_url
  })
  const without = filtered.filter(p => {
    const ph = photos.find(x => x.player_name.toLowerCase() === p.name.toLowerCase())
    return !ph?.banner_url && !ph?.headshot_url
  })

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 w-full max-w-sm space-y-4">
          <div>
            <p className="font-display font-700 text-[var(--accent)] text-xs uppercase tracking-widest mb-1">Admin</p>
            <h1 className="font-display font-800 italic text-3xl uppercase text-white">Player Photos</h1>
          </div>
          <input
            type="password"
            placeholder="Wachtwoord"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            className="w-full bg-[var(--bg)] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg px-4 py-3 text-white outline-none font-display font-700 text-sm"
          />
          <button
            onClick={login}
            className="w-full bg-[var(--accent)] py-3 rounded-lg font-display font-800 text-sm uppercase tracking-wider text-white hover:bg-[var(--accent)]/80 transition-colors"
          >
            Inloggen →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-display font-700 text-[var(--accent)] text-xs uppercase tracking-widest mb-1">Admin</p>
          <h1 className="font-display font-800 italic text-4xl uppercase text-white">Player Photos</h1>
          <p className="font-display font-700 text-[var(--muted)] text-sm mt-1 uppercase tracking-wider">
            {photos.filter(p => p.banner_url || p.headshot_url).length} van {ALL_PLAYERS.length} spelers hebben foto&apos;s
          </p>
        </div>
        <input
          type="search"
          placeholder="Zoek speler of team..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="bg-[var(--card)] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg px-4 py-2.5 text-white outline-none font-display font-700 text-sm w-64"
        />
      </div>

      {/* Players with photos */}
      {withPhotos.length > 0 && (
        <section>
          <p className="font-display font-700 text-xs uppercase tracking-widest text-[var(--accent)] mb-3">Met foto&apos;s</p>
          <div className="space-y-2">
            {withPhotos.map(({ name, teamId }) => {
              const photo = photos.find(p => p.player_name.toLowerCase() === name.toLowerCase())
              return (
                <PlayerRow
                  key={name} name={name} teamId={teamId} photo={photo ?? null}
                  uploading={uploading} success={success}
                  onUpload={(type, file) => upload(name, teamId, type, file)}
                  onRemove={(type) => remove(name, type)}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Players without photos */}
      {without.length > 0 && (
        <section>
          <p className="font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)] mb-3">Zonder foto&apos;s</p>
          <div className="space-y-2">
            {without.map(({ name, teamId }) => (
              <PlayerRow
                key={name} name={name} teamId={teamId} photo={null}
                uploading={uploading} success={success}
                onUpload={(type, file) => upload(name, teamId, type, file)}
                onRemove={(type) => remove(name, type)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function PlayerRow({
  name, teamId, photo, uploading, success, onUpload, onRemove,
}: {
  name: string
  teamId: string
  photo: PlayerPhoto | null
  uploading: string | null
  success: string | null
  onUpload: (type: 'banner' | 'headshot', file: File) => void
  onRemove: (type: 'banner' | 'headshot') => void
}) {
  const isSuccess = success === name
  return (
    <div className={`bg-[var(--card)] border rounded-xl px-4 py-3 flex items-center gap-4 flex-wrap transition-colors ${isSuccess ? 'border-green-500/50' : 'border-[var(--border)]'}`}>
      {/* Name */}
      <div className="flex-1 min-w-[160px]">
        <p className="font-display font-800 text-sm uppercase text-white leading-none">{name}</p>
        <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mt-0.5">{TEAM_NAMES[teamId] ?? teamId}</p>
      </div>

      {/* Banner */}
      <div className="flex items-center gap-2">
        <PhotoThumb url={photo?.banner_url ?? null} shape="banner" />
        <div className="flex flex-col gap-1">
          <UploadButton
            label="Banner"
            uploading={uploading === `${name}-banner`}
            onFile={f => onUpload('banner', f)}
          />
          {photo?.banner_url && (
            <button onClick={() => onRemove('banner')}
              className="text-[10px] font-display font-700 text-[var(--muted)] hover:text-red-400 uppercase tracking-widest text-left transition-colors">
              Verwijder
            </button>
          )}
        </div>
      </div>

      {/* Headshot */}
      <div className="flex items-center gap-2">
        <PhotoThumb url={photo?.headshot_url ?? null} shape="round" />
        <div className="flex flex-col gap-1">
          <UploadButton
            label="Headshot"
            uploading={uploading === `${name}-headshot`}
            onFile={f => onUpload('headshot', f)}
          />
          {photo?.headshot_url && (
            <button onClick={() => onRemove('headshot')}
              className="text-[10px] font-display font-700 text-[var(--muted)] hover:text-red-400 uppercase tracking-widest text-left transition-colors">
              Verwijder
            </button>
          )}
        </div>
      </div>

      {isSuccess && (
        <span className="font-display font-700 text-xs text-green-400 uppercase tracking-widest shrink-0">Opgeslagen</span>
      )}
    </div>
  )
}
