'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type AdminUser = {
  email: string
  name: string | null
  can_photos: boolean
  can_analytics: boolean
  can_livestream: boolean
  can_highlights: boolean
  is_super_admin: boolean
  stream_team: string | null
}

const PERMISSIONS = [
  { key: 'can_photos',    label: "Foto's"     },
  { key: 'can_analytics', label: 'Analytics'  },
  { key: 'can_livestream',label: 'Streams'    },
  { key: 'can_highlights',label: 'Highlights' },
  { key: 'is_super_admin',label: 'Super admin'},
] as const

const TEAMS = [
  { id: null,        label: 'Alle teams' },
  { id: 'neptunus',  label: 'Neptunus'   },
  { id: 'pirates',   label: 'Pirates'    },
  { id: 'kinheim',   label: 'Kinheim'    },
  { id: 'hcaw',      label: 'HCAW'       },
  { id: 'twins',     label: 'Twins'      },
  { id: 'pioniers',  label: 'Pioniers'   },
  { id: 'uvv',       label: 'UVV'        },
]

export default function UsersPage() {
  const [users,   setUsers]   = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState<string | null>(null)
  const [newEmail,setNewEmail]= useState('')
  const [adding,  setAdding]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/admin/api/users')
    const data = await res.json()
    setUsers(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function toggle(email: string, key: keyof AdminUser) {
    setSaving(email + key)
    const user = users.find(u => u.email === email)!
    const newVal = !user[key]
    await fetch('/admin/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, key, value: newVal }),
    })
    setUsers(prev => prev.map(u => u.email === email ? { ...u, [key]: newVal } : u))
    setSaving(null)
  }

  async function setStreamTeam(email: string, teamId: string | null) {
    setSaving(email + 'stream_team')
    await fetch('/admin/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, key: 'stream_team', value: teamId }),
    })
    setUsers(prev => prev.map(u => u.email === email ? { ...u, stream_team: teamId } : u))
    setSaving(null)
  }

  async function addUser() {
    if (!newEmail.trim()) return
    setAdding(true)
    setError(null)
    const res = await fetch('/admin/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Toevoegen mislukt')
    } else {
      setNewEmail('')
      load()
    }
    setAdding(false)
  }

  async function removeUser(email: string) {
    if (!confirm(`${email} verwijderen?`)) return
    await fetch('/admin/api/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setUsers(prev => prev.filter(u => u.email !== email))
  }

  return (
    <div className="min-h-screen bg-[#06101e] px-4 pt-20 pb-16">
      <div className="max-w-4xl mx-auto">

        <div className="mb-8">
          <Link href="/admin" className="font-display font-700 text-xs text-[var(--muted)] hover:text-white uppercase tracking-wider transition-colors mb-2 block">
            ← Terug
          </Link>
          <h1 className="font-display font-800 italic text-4xl uppercase text-white">Gebruikers</h1>
          <p className="font-display font-700 text-sm text-[var(--muted)] mt-1 uppercase tracking-wider">Toegang & rollen beheren</p>
        </div>

        {/* Add user */}
        <div className="bg-[#0a1220] border border-[#1a2a3a] rounded-2xl p-6 mb-6">
          <p className="font-display font-800 text-sm uppercase text-white tracking-wide mb-4">Gebruiker toevoegen</p>
          <div className="flex gap-3">
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addUser()}
              placeholder="emailadres@gmail.com"
              className="flex-1 bg-[#06101e] border border-[#1a2a3a] rounded-xl px-4 py-3 font-display font-700 text-sm text-white placeholder:text-[var(--muted)] outline-none focus:border-[var(--accent)] transition-colors"
            />
            <button
              onClick={addUser}
              disabled={adding || !newEmail.trim()}
              className="font-display font-800 text-sm uppercase tracking-wider bg-[var(--accent)] text-white px-6 py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {adding ? '…' : 'Toevoegen'}
            </button>
          </div>
          {error && <p className="font-display font-700 text-xs text-red-400 mt-2">{error}</p>}
        </div>

        {/* Users list */}
        <div className="space-y-3">
          {loading && (
            <div className="bg-[#0a1220] border border-[#1a2a3a] rounded-2xl px-6 py-8 text-center">
              <p className="font-display font-700 text-sm text-[var(--muted)] uppercase tracking-wider animate-pulse">Laden…</p>
            </div>
          )}

          {!loading && users.length === 0 && (
            <div className="bg-[#0a1220] border border-[#1a2a3a] rounded-2xl px-6 py-8 text-center">
              <p className="font-display font-700 text-sm text-[var(--muted)] uppercase tracking-wider">Geen gebruikers</p>
            </div>
          )}

          {users.map(user => (
            <div key={user.email} className="bg-[#0a1220] border border-[#1a2a3a] rounded-2xl p-5">
              {/* Top row: email + delete */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-display font-800 text-sm text-white">{user.email}</p>
                  {user.name && <p className="font-display font-700 text-xs text-[var(--muted)] mt-0.5">{user.name}</p>}
                </div>
                <button
                  onClick={() => removeUser(user.email)}
                  className="text-[var(--muted)] hover:text-red-400 transition-colors font-display font-800 text-lg leading-none ml-4"
                >
                  ×
                </button>
              </div>

              {/* Permissions grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PERMISSIONS.map(p => {
                  const val = user[p.key as keyof AdminUser] as boolean
                  const isSaving = saving === user.email + p.key
                  return (
                    <div key={p.key} className="flex items-center gap-3">
                      <button
                        onClick={() => toggle(user.email, p.key as keyof AdminUser)}
                        disabled={!!saving}
                        className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${val ? 'bg-[var(--accent)]' : 'bg-[#1a2a3a]'} ${isSaving ? 'opacity-50' : ''}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${val ? 'left-5' : 'left-1'}`} />
                      </button>
                      <span className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-wider">{p.label}</span>
                    </div>
                  )
                })}
              </div>

              {/* Stream team selector — only shown when can_livestream is on */}
              {user.can_livestream && (
                <div className="mt-4 pt-4 border-t border-[#1a2a3a] flex items-center gap-3">
                  <span className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-wider shrink-0">
                    Stream team:
                  </span>
                  <select
                    value={user.stream_team ?? ''}
                    onChange={e => setStreamTeam(user.email, e.target.value || null)}
                    disabled={saving === user.email + 'stream_team'}
                    className="bg-[#06101e] border border-[#1a2a3a] rounded-lg px-3 py-1.5 font-display font-700 text-xs text-white outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-50"
                  >
                    {TEAMS.map(t => (
                      <option key={t.id ?? ''} value={t.id ?? ''}>{t.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
