'use client'

import { useRouter } from 'next/navigation'

export default function BackButton({ fallback, label }: { fallback: string; label: string }) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 font-display font-700 text-xs text-[var(--muted)] hover:text-white uppercase tracking-widest transition-colors"
    >
      ← {label}
    </button>
  )
}
