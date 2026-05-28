'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type AdminUser = {
  email: string
  name: string | null
  can_photos: boolean
  can_analytics: boolean
  can_livestream: boolean
  can_highlights: boolean
  is_super_admin: boolean
}

const PERMISSIONS = [
  { key: 'can_photos',    label: "Foto's"     },
  { key: 'can_analytics', label: 'Analytics'  },
  { key: 'can_livestream',label: 'Streams'    },
  { key: 'can_highlights',label: 'Highlights' },
  { key: 'is_super_admin',label: 'Super admin'},
] as const

export default function UsersPage() {
  const [users,   setUsers]   = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState<string | null>(null)
  const [newEmail,setNewEmail]= useState('')
  const [adding,  setAdding]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('admin_users').select('*').order('email')
    setUsers((data ?? []) as AdminUser[])
    setLoading(false)
  }

  async function toggle(email: string, key: keyof AdminUser) {
    setSaving(email + key)
    const user = users.find(u => u.email === email)!
    const newVal = !user[key]
    await supabase.from('admin_users').update({ [key]: newVal }).eq('email', email)
    setUsers(prev => prev.map(u => u.email === email ? { ...u, [key]: newVal } : u))
    setSaving(null)
  }

  async function addUser() {
    if (!newEmail.trim()) return
    setAdding(true)
    setError(null)
    const { error } = await supabase.from('admin_users').insert({
      email: newEmail.trim().toLowerCase(),
      name: null,
      can_photos: false,
      can_analytics: false,
      can_livestream: false,
      can_highlights: false,
      is_super_admin: false,
    })
    if (error) {
      setError(error.message)
    } else {
      setNewEmail('')
      load()
    }
    setAdding(false)
  }

  async function removeUser(email: string) {
    if (!confirm(`${email} verwijderen?`)) return
    await supabase.from('admin_users').delete().eq('email', email)
    setUsers(prev => prev.filter(u => u.email !== email))
  }

  return (
    <div className="min-h-screen bg-[#06101e] px-4 pt-20 pb-16">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <Link href="/admin" className="font-display font-700 text-xs text-[var(--muted)] hover:text-white uppercase tracking-wider transition-colors mb-2 block">
              ← Terug
            </Link>
            <h1 className="font-display font-800 italic text-4xl uppercase text-white">Gebruikers</h1>
            <p className="font-display font-700 text-sm text-[var(--muted)] mt-1 uppercase tracking-wider">Toegang & rollen beheren</p>
          </div>
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

        {/* Users table */}
        <div className="bg-[#0a1220] border border-[#1a2a3a] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="grid border-b border-[#1a2a3a] px-6 py-3"
            style={{ gridTemplateColumns: '1fr repeat(5, 80px) 40px' }}>
            <span className="font-display font-700 text-[10px] uppercase tracking-widest text-[var(--muted)]">Email</span>
            {PERMISSIONS.map(p => (
              <span key={p.key} className="font-display font-700 text-[10px] uppercase tracking-widest text-[var(--muted)] text-center">{p.label}</span>
            ))}
            <span />
          </div>

          {loading && (
            <div className="px-6 py-8 text-center">
              <p className="font-display font-700 text-sm text-[var(--muted)] uppercase tracking-wider animate-pulse">Laden…</p>
            </div>
          )}

          {!loading && users.length === 0 && (
            <div className="px-6 py-8 text-center">
              <p className="font-display font-700 text-sm text-[var(--muted)] uppercase tracking-wider">Geen gebruikers</p>
            </div>
          )}

          {users.map((user, i) => (
            <div key={user.email}
              className={`grid items-center px-6 py-4 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}
              style={{ gridTemplateColumns: '1fr repeat(5, 80px) 40px' }}>

              <div className="min-w-0">
                <p className="font-display font-800 text-sm text-white truncate">{user.email}</p>
                {user.name && <p className="font-display font-700 text-xs text-[var(--muted)]">{user.name}</p>}
              </div>

              {PERMISSIONS.map(p => {
                const val = user[p.key as keyof AdminUser] as boolean
                const isSaving = saving === user.email + p.key
                return (
                  <div key={p.key} className="flex justify-center">
                    <button
                      onClick={() => toggle(user.email, p.key as keyof AdminUser)}
                      disabled={!!saving}
                      className={`w-10 h-6 rounded-full transition-colors relative ${val ? 'bg-[var(--accent)]' : 'bg-[#1a2a3a]'} ${isSaving ? 'opacity-50' : ''}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${val ? 'left-5' : 'left-1'}`} />
                    </button>
                  </div>
                )
              })}

              <button
                onClick={() => removeUser(user.email)}
                className="text-[var(--muted)] hover:text-red-400 transition-colors font-display font-800 text-sm justify-self-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
