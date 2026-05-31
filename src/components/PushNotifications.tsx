'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { TEAM_COLORS, TEAM_LOGOS, TEAM_NAMES } from '@/lib/teams'

const TEAMS = ['neptunus', 'pirates', 'kinheim', 'hcaw', 'twins', 'pioniers', 'uvv']
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

type Status = 'idle' | 'subscribed' | 'unsupported' | 'denied'

export default function PushNotifications() {
  const [status, setStatus]       = useState<Status>('idle')
  const [open, setOpen]           = useState(false)
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [saving, setSaving]       = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported'); return
    }
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        if (sub) { setSubscription(sub); setStatus('subscribed') }
        else if (Notification.permission === 'denied') setStatus('denied')
      })
    })
  }, [])

  async function subscribe() {
    setSaving(true)
    try {
      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') { setStatus('denied'); setSaving(false); return }
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
        })
      }
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), teamIds: selectedTeams }),
      })
      setSubscription(sub)
      setStatus('subscribed')
      setOpen(false)
    } catch { /* ignore */ }
    setSaving(false)
  }

  async function unsubscribe() {
    if (!subscription) return
    setSaving(true)
    await subscription.unsubscribe()
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    })
    setSubscription(null)
    setStatus('idle')
    setSelectedTeams([])
    setSaving(false)
  }

  function toggleTeam(teamId: string) {
    setSelectedTeams(prev =>
      prev.includes(teamId) ? prev.filter(t => t !== teamId) : [...prev, teamId]
    )
  }

  if (status === 'unsupported') return null

  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => status === 'subscribed' ? unsubscribe() : setOpen(true)}
        disabled={saving || status === 'denied'}
        className={`relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
          status === 'subscribed'
            ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
            : 'text-white/50 hover:text-white hover:bg-white/10'
        } disabled:opacity-40`}
        title={status === 'subscribed' ? 'Notificaties uitschakelen' : 'Notificaties inschakelen'}
      >
        <svg className="w-5 h-5" fill={status === 'subscribed' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {status === 'subscribed' && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[var(--accent)] rounded-full" />
        )}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm bg-[#0a1220] border border-[#1a2a3a] rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display font-800 text-lg uppercase text-white">Notifications</h2>
                <p className="font-display font-700 text-xs text-[var(--muted)] mt-0.5 uppercase tracking-wider">
                  Home runs, scores &amp; game updates
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-[var(--muted)] hover:text-white text-xl leading-none">×</button>
            </div>

            <p className="font-display font-700 text-xs text-[var(--muted)] uppercase tracking-widest mb-3">
              Follow specific teams — or leave empty for all teams
            </p>

            <div className="grid grid-cols-2 gap-2 mb-6">
              {TEAMS.map(teamId => {
                const selected = selectedTeams.includes(teamId)
                const color = TEAM_COLORS[teamId] ?? '#1e335a'
                return (
                  <button
                    key={teamId}
                    onClick={() => toggleTeam(teamId)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all ${
                      selected ? 'border-transparent' : 'border-[#1a2a3a] hover:border-white/20'
                    }`}
                    style={selected ? { backgroundColor: color, borderColor: color } : {}}
                  >
                    <div className="w-6 h-6 rounded flex items-center justify-center p-0.5 shrink-0"
                      style={{ backgroundColor: selected ? 'rgba(255,255,255,0.2)' : color }}>
                      <Image src={TEAM_LOGOS[teamId]} alt={teamId} width={18} height={18} className="object-contain w-full h-full" />
                    </div>
                    <span className={`font-display font-800 text-xs uppercase ${selected ? 'text-white' : 'text-white/60'}`}>
                      {TEAM_NAMES[teamId]}
                    </span>
                  </button>
                )
              })}
            </div>

            <button
              onClick={subscribe}
              disabled={saving}
              className="w-full bg-[var(--accent)] text-white font-display font-800 text-sm uppercase tracking-wider py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Enabling…' : selectedTeams.length === 0 ? 'Enable for all teams' : `Enable for ${selectedTeams.length} team${selectedTeams.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
