'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ROSTERS } from '@/lib/rosters-data'
import { TEAM_NAMES } from '@/lib/teams'
import AdminGate from '@/components/AdminGate'

const STATIC_PLAYERS = Object.entries(ROSTERS)
  .flatMap(([teamId, roster]) =>
    roster.players.map(p => ({ name: p.name, teamId }))
  )
  .sort((a, b) => a.name.localeCompare(b.name))

type PlayerPhoto = {
  player_name: string
  banner_url: string | null
  headshot_url: string | null
  banner_focal_x: number | null
  banner_focal_y: number | null
  banner_size_kb: number | null
  headshot_size_kb: number | null
}

// ── Focal point editor ─────────────────────────────────────────────────────

function FocalPointEditor({
  playerName, url, initialX, initialY, savedPw,
  onSaved, onClose,
}: {
  playerName: string
  url: string
  initialX: number
  initialY: number
  savedPw: string
  onSaved: (x: number, y: number) => void
  onClose: () => void
}) {
  const [focal, setFocal] = useState({ x: initialX, y: initialY })
  const [saving, setSaving] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const updateFromPointer = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, (e.clientX - rect.left) / rect.width * 100))
    const y = Math.max(0, Math.min(100, (e.clientY - rect.top) / rect.height * 100))
    setFocal({ x, y })
  }, [])

  async function save() {
    setSaving(true)
    await fetch('/api/admin/photos', {
      method: 'PATCH',
      headers: { 'x-admin-password': savedPw, 'content-type': 'application/json' },
      body: JSON.stringify({ playerName, focalX: focal.x, focalY: focal.y }),
    })
    onSaved(focal.x, focal.y)
    setSaving(false)
  }

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#060e1b] border border-[var(--border)] rounded-2xl w-full max-w-2xl flex flex-col gap-5 p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div>
          <p className="font-display font-700 text-[var(--accent)] text-[10px] uppercase tracking-widest mb-0.5">Bannerpositionering</p>
          <h2 className="font-display font-800 text-xl uppercase text-white leading-none">{playerName}</h2>
          <p className="font-display font-700 text-[11px] text-[var(--muted)] mt-1">Klik of sleep op de foto om het focuspunt in te stellen. De preview toont wat er getoond wordt.</p>
        </div>

        {/* Draggable full image */}
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-xl cursor-crosshair select-none"
          style={{ maxHeight: 320 }}
          onPointerDown={e => {
            dragging.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
            updateFromPointer(e)
          }}
          onPointerMove={e => { if (dragging.current) updateFromPointer(e) }}
          onPointerUp={() => { dragging.current = false }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Banner preview"
            draggable={false}
            className="w-full h-auto block pointer-events-none"
          />
          {/* Focal point crosshair */}
          <div
            className="absolute pointer-events-none"
            style={{ left: `${focal.x}%`, top: `${focal.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            {/* Outer ring */}
            <div className="w-9 h-9 rounded-full border-2 border-white shadow-lg" style={{ background: 'rgba(255,255,255,0.15)' }} />
            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white shadow" />
            </div>
            {/* Cross lines */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute w-px h-5 bg-white/80" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
              <div className="absolute h-px w-5 bg-white/80" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
            </div>
          </div>
        </div>

        {/* 3:1 crop preview */}
        <div>
          <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mb-2">Preview (bannerformaat)</p>
          <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: '3/1' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Crop preview"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
            />
            {/* Dim overlay with label */}
            <div className="absolute inset-0 flex items-end justify-end p-2 pointer-events-none">
              <span className="font-display font-700 text-[9px] text-white/50 uppercase tracking-widest bg-black/40 px-2 py-1 rounded">Preview</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-[var(--accent)] py-2.5 rounded-xl font-display font-800 text-sm uppercase tracking-wider text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Opslaan…' : 'Opslaan'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-display font-800 text-sm uppercase tracking-wider text-[var(--muted)] border border-[var(--border)] hover:text-white transition-colors"
          >
            Annuleren
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Upload button ──────────────────────────────────────────────────────────

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

// ── Player row ─────────────────────────────────────────────────────────────

function PlayerRow({
  name, teamId, photo, uploading, success, savedPw, onUpload, onRemove, onPhotoUpdate,
}: {
  name: string
  teamId: string
  photo: PlayerPhoto | null
  uploading: string | null
  success: string | null
  savedPw: string
  onUpload: (type: 'banner' | 'headshot', file: File) => void
  onRemove: (type: 'banner' | 'headshot') => void
  onPhotoUpdate: (focalX: number, focalY: number) => void
}) {
  const [editingFocal, setEditingFocal] = useState(false)
  const isSuccess = success === name

  const focalX = photo?.banner_focal_x ?? 50
  const focalY = photo?.banner_focal_y ?? 50

  return (
    <>
      <div className={`bg-[var(--card)] border rounded-xl px-4 py-3 flex items-center gap-4 flex-wrap transition-colors ${isSuccess ? 'border-green-500/50' : 'border-[var(--border)]'}`}>
        {/* Name */}
        <div className="flex-1 min-w-[160px]">
          <p className="font-display font-800 text-sm uppercase text-white leading-none">{name}</p>
          <p className="font-display font-700 text-[10px] text-[var(--muted)] uppercase tracking-widest mt-0.5">{TEAM_NAMES[teamId] ?? teamId}</p>
        </div>

        {/* Banner */}
        <div className="flex items-center gap-2">
          {/* Thumbnail — clickable to edit focal if banner exists */}
          {photo?.banner_url ? (
            <button
              onClick={() => setEditingFocal(true)}
              className="relative group overflow-hidden rounded border border-[var(--border)] hover:border-[var(--accent)]/60 transition-colors shrink-0"
              style={{ width: 96, height: 32 }}
              title="Klik om positie aan te passen"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.banner_url}
                alt="Banner"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ objectPosition: `${focalX}% ${focalY}%` }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <span className="font-display font-700 text-[9px] text-white uppercase opacity-0 group-hover:opacity-100 transition-opacity tracking-widest">Positie</span>
              </div>
            </button>
          ) : (
            <div className="bg-[#0f1e2e] border border-[var(--border)] flex items-center justify-center text-[10px] text-[var(--muted)] uppercase rounded shrink-0" style={{ width: 96, height: 32 }}>
              —
            </div>
          )}

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <UploadButton
                label="Banner"
                uploading={uploading === `${name}-banner`}
                onFile={f => onUpload('banner', f)}
              />
              {photo?.banner_size_kb != null && (
                <span className={`font-display font-700 text-[10px] uppercase tracking-widest ${photo.banner_size_kb > 400 ? 'text-yellow-500' : 'text-green-400'}`}>
                  {photo.banner_size_kb} KB
                </span>
              )}
            </div>
            {photo?.banner_url && (
              <div className="flex gap-2">
                <button onClick={() => setEditingFocal(true)}
                  className="text-[10px] font-display font-700 text-[var(--accent)] hover:text-white uppercase tracking-widest transition-colors">
                  Positie
                </button>
                <span className="text-[var(--border)]">·</span>
                <button onClick={() => onRemove('banner')}
                  className="text-[10px] font-display font-700 text-[var(--muted)] hover:text-red-400 uppercase tracking-widest transition-colors">
                  Verwijder
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Headshot */}
        <div className="flex items-center gap-2">
          {photo?.headshot_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.headshot_url} alt="Headshot" className="w-10 h-10 object-cover rounded-full border border-[var(--border)] shrink-0" />
          ) : (
            <div className="bg-[#0f1e2e] border border-[var(--border)] flex items-center justify-center text-[10px] text-[var(--muted)] uppercase w-10 h-10 rounded-full shrink-0">—</div>
          )}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <UploadButton
                label="Headshot"
                uploading={uploading === `${name}-headshot`}
                onFile={f => onUpload('headshot', f)}
              />
              {photo?.headshot_size_kb != null && (
                <span className={`font-display font-700 text-[10px] uppercase tracking-widest ${photo.headshot_size_kb > 400 ? 'text-yellow-500' : 'text-green-400'}`}>
                  {photo.headshot_size_kb} KB
                </span>
              )}
            </div>
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

      {/* Focal point editor modal */}
      {editingFocal && photo?.banner_url && (
        <FocalPointEditor
          playerName={name}
          url={photo.banner_url}
          initialX={focalX}
          initialY={focalY}
          savedPw={savedPw}
          onSaved={(x, y) => {
            onPhotoUpdate(x, y)
            setEditingFocal(false)
          }}
          onClose={() => setEditingFocal(false)}
        />
      )}
    </>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AdminPhotosPage() {
  const [savedPw, setSavedPw] = useState('')
  const [photos, setPhotos] = useState<PlayerPhoto[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [compressing, setCompressing] = useState<{ done: number; total: number } | null>(null)
  const [allPlayers, setAllPlayers] = useState(STATIC_PLAYERS)

  useEffect(() => {
    fetch('/api/all-players')
      .then(r => r.json())
      .then((data: { name: string; teamId: string }[]) => {
        setAllPlayers(data.map(p => ({ name: p.name, teamId: p.teamId })).sort((a, b) => a.name.localeCompare(b.name)))
      })
      .catch(() => {})
  }, [])

  async function loadPhotos(password: string) {
    const res = await fetch('/api/admin/photos', { headers: { 'x-admin-password': password } })
    if (!res.ok) return
    const list: PlayerPhoto[] = await res.json()
    setPhotos(list)

    // For photos without a stored size, fetch it via HEAD request (no recompression)
    const needsSize = list.filter(p =>
      (p.banner_url && p.banner_size_kb == null) ||
      (p.headshot_url && p.headshot_size_kb == null)
    )
    if (needsSize.length === 0) return

    const fetchSize = async (url: string): Promise<number | null> => {
      try {
        const r = await fetch(url, { method: 'HEAD' })
        const cl = r.headers.get('content-length')
        return cl ? Math.round(parseInt(cl) / 1024) : null
      } catch { return null }
    }

    // Fetch in parallel, update state as results come in
    await Promise.all(needsSize.map(async p => {
      const bannerKb  = p.banner_url  && p.banner_size_kb  == null ? await fetchSize(p.banner_url)  : undefined
      const headshotKb = p.headshot_url && p.headshot_size_kb == null ? await fetchSize(p.headshot_url) : undefined

      if (bannerKb != null || headshotKb != null) {
        setPhotos(prev => prev.map(x =>
          x.player_name === p.player_name
            ? {
                ...x,
                ...(bannerKb   != null ? { banner_size_kb:   bannerKb   } : {}),
                ...(headshotKb != null ? { headshot_size_kb: headshotKb } : {}),
              }
            : x
        ))
      }
    }))
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

  async function compressAll() {
    const targets: { playerName: string; photoType: 'banner' | 'headshot' }[] = []
    for (const p of photos) {
      if (p.banner_url)   targets.push({ playerName: p.player_name, photoType: 'banner' })
      if (p.headshot_url) targets.push({ playerName: p.player_name, photoType: 'headshot' })
    }
    if (targets.length === 0) return
    setCompressing({ done: 0, total: targets.length })

    for (let i = 0; i < targets.length; i++) {
      const { playerName, photoType } = targets[i]
      await fetch('/api/admin/compress-photo', {
        method: 'POST',
        headers: { 'x-admin-password': savedPw, 'content-type': 'application/json' },
        body: JSON.stringify({ playerName, photoType }),
      })
      setCompressing({ done: i + 1, total: targets.length })
    }

    setCompressing(null)
    await loadPhotos(savedPw)
  }

  function updateFocal(playerName: string, focalX: number, focalY: number) {
    setPhotos(prev => prev.map(p =>
      p.player_name.toLowerCase() === playerName.toLowerCase()
        ? { ...p, banner_focal_x: focalX, banner_focal_y: focalY }
        : p
    ))
  }

  const filtered = filter
    ? allPlayers.filter(p =>
        p.name.toLowerCase().includes(filter.toLowerCase()) ||
        TEAM_NAMES[p.teamId]?.toLowerCase().includes(filter.toLowerCase())
      )
    : allPlayers

  const withPhotos = filtered.filter(p => {
    const ph = photos.find(x => x.player_name.toLowerCase() === p.name.toLowerCase())
    return ph?.banner_url || ph?.headshot_url
  })
  const without = filtered.filter(p => {
    const ph = photos.find(x => x.player_name.toLowerCase() === p.name.toLowerCase())
    return !ph?.banner_url && !ph?.headshot_url
  })

  return (
    <AdminGate
      checkAuth={async pw => {
        const res = await fetch('/api/admin/photos', { headers: { 'x-admin-password': pw } })
        return res.ok
      }}
      onAuth={pw => { setSavedPw(pw); loadPhotos(pw) }}
    >
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-display font-700 text-[var(--accent)] text-xs uppercase tracking-widest mb-1">Admin</p>
          <h1 className="font-display font-800 italic text-4xl uppercase text-white">Player Photos</h1>
          <p className="font-display font-700 text-[var(--muted)] text-sm mt-1 uppercase tracking-wider">
            {photos.filter(p => p.banner_url || p.headshot_url).length} van {allPlayers.length} spelers hebben foto&apos;s
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="search"
            placeholder="Zoek speler of team..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-[var(--card)] border border-[var(--border)] focus:border-[var(--accent)] rounded-lg px-4 py-2.5 text-white outline-none font-display font-700 text-sm w-64"
          />
          <button
            onClick={compressAll}
            disabled={!!compressing}
            className="flex items-center gap-2 border border-[var(--border)] hover:border-[var(--accent)] text-[var(--muted)] hover:text-white transition-colors rounded-lg px-4 py-2.5 font-display font-800 text-xs uppercase tracking-widest disabled:opacity-50"
          >
            {compressing ? (
              <>
                <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                {compressing.done}/{compressing.total} compressed…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Compress all photos
              </>
            )}
          </button>
        </div>
      </div>

      {withPhotos.length > 0 && (
        <section>
          <p className="font-display font-700 text-xs uppercase tracking-widest text-[var(--accent)] mb-3">Met foto&apos;s</p>
          <div className="space-y-2">
            {withPhotos.map(({ name, teamId }) => {
              const photo = photos.find(p => p.player_name.toLowerCase() === name.toLowerCase())
              return (
                <PlayerRow
                  key={name} name={name} teamId={teamId} photo={photo ?? null}
                  uploading={uploading} success={success} savedPw={savedPw}
                  onUpload={(type, file) => upload(name, teamId, type, file)}
                  onRemove={(type) => remove(name, type)}
                  onPhotoUpdate={(x, y) => updateFocal(name, x, y)}
                />
              )
            })}
          </div>
        </section>
      )}

      {without.length > 0 && (
        <section>
          <p className="font-display font-700 text-xs uppercase tracking-widest text-[var(--muted)] mb-3">Zonder foto&apos;s</p>
          <div className="space-y-2">
            {without.map(({ name, teamId }) => (
              <PlayerRow
                key={name} name={name} teamId={teamId} photo={null}
                uploading={uploading} success={success} savedPw={savedPw}
                onUpload={(type, file) => upload(name, teamId, type, file)}
                onRemove={(type) => remove(name, type)}
                onPhotoUpdate={(x, y) => updateFocal(name, x, y)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
    </AdminGate>
  )
}
