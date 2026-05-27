'use client'

import { useState } from 'react'
import Link from 'next/link'
import AdminGate from '@/components/AdminGate'

const LINKS = [
  { href: '/admin/photos',    label: "Photos",    sub: "Player headshots & banners" },
  { href: '/admin/streams',   label: "Streams",   sub: "Manage livestream links" },
  { href: '/admin/analytics', label: "Analytics", sub: "Vercel web analytics" },
]

export default function AdminPage() {
  const [savedPw, setSavedPw] = useState('')

  return (
    <AdminGate
      checkAuth={async pw => {
        const res = await fetch('/api/admin/photos', { headers: { 'x-admin-password': pw } })
        return res.ok
      }}
      onAuth={pw => setSavedPw(pw)}
    >
      <div className="min-h-screen flex items-center justify-center bg-[#04080f] py-16 px-4">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <p className="font-display font-700 text-[var(--accent)] uppercase tracking-[0.35em] text-xs mb-2">Admin Panel</p>
            <h1 className="font-display font-800 italic text-5xl uppercase text-white leading-none">
              <strong>Dashboard</strong>
            </h1>
          </div>

          <div className="w-12 h-[2px] bg-[var(--accent)]/50 rounded-full" />

          <div className="space-y-3">
            {LINKS.map(({ href, label, sub }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between w-full bg-[#0a1525] border border-[var(--border)] hover:border-[var(--accent)]/60 hover:bg-[#0d1a2e] transition-all px-6 py-4 rounded-xl group"
              >
                <div>
                  <p className="font-display font-800 text-sm uppercase text-white tracking-wide">{label}</p>
                  <p className="font-display font-700 text-xs text-[var(--muted)] mt-0.5">{sub}</p>
                </div>
                <span className="font-display font-800 text-[var(--accent)] text-lg group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            ))}
          </div>

          <button
            onClick={() => { localStorage.removeItem('admin-pw'); window.location.reload() }}
            className="font-display font-700 text-xs text-[var(--muted)] hover:text-white uppercase tracking-widest transition-colors mt-4"
          >
            Log out ↩
          </button>
        </div>
      </div>
    </AdminGate>
  )
}
