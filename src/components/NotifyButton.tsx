'use client'

import { useState, useEffect, useRef } from 'react'

function SubscribeModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'already' | 'error'>('idle')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  async function subscribe() {
    if (!email.includes('@')) return
    setState('loading')
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (res.ok) {
      const d = await res.json()
      setState(d.already ? 'already' : 'done')
    } else {
      setState('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0d1b2e] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="font-display font-800 text-sm uppercase text-white tracking-widest">Notifications</p>
          </div>
          <p className="font-display font-700 text-xs text-[var(--muted)]">
            Get an email when a game goes live or a new Pickle / Immaculate is available.
          </p>
        </div>

        {(state === 'done' || state === 'already') ? (
          <div className="text-center py-4">
            <p className="font-display font-800 text-sm text-green-400 uppercase tracking-widest">
              {state === 'done' ? '✓ Subscribed!' : '✓ Already subscribed'}
            </p>
            <p className="font-display font-700 text-xs text-[var(--muted)] mt-1">
              {state === 'done'
                ? "You'll get an email when a game goes live or a new puzzle drops."
                : 'This email address is already in the list.'}
            </p>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && subscribe()}
              className="w-full bg-[#060e1b] border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-4 py-3 text-white placeholder:text-white/30 outline-none font-display font-700 text-sm [color-scheme:dark]"
            />
            {state === 'error' && (
              <p className="font-display font-700 text-xs text-red-400 uppercase tracking-widest">Subscribe failed, please try again.</p>
            )}
            <button
              onClick={subscribe}
              disabled={state === 'loading' || !email.includes('@')}
              className="w-full bg-[var(--accent)] py-3 rounded-xl font-display font-800 text-sm uppercase tracking-wider text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {state === 'loading' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Subscribing…
                </span>
              ) : 'Subscribe to notifications'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function NotifyButton({ tooltip }: { tooltip: string }) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div className="relative group">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 border border-[var(--border)] hover:border-[var(--accent)] hover:text-white text-[var(--muted)] transition-colors rounded-xl px-3 py-2.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="font-display font-700 text-xs uppercase tracking-widest hidden sm:block">Notify me</span>
        </button>

        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 w-52 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20">
          <div className="bg-[#0d1b2e] border border-[var(--border)] rounded-xl px-3 py-2 shadow-xl">
            <p className="font-display font-700 text-[11px] text-white/70 leading-snug">{tooltip}</p>
          </div>
          {/* Arrow */}
          <div className="absolute top-full right-4 border-4 border-transparent border-t-[var(--border)]" />
        </div>
      </div>

      {showModal && <SubscribeModal onClose={() => setShowModal(false)} />}
    </>
  )
}
