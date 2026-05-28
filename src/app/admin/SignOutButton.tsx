'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <button
      onClick={signOut}
      className="w-full font-display font-700 text-xs uppercase tracking-wider text-[var(--muted)] hover:text-white border border-[#1a2a3a] hover:border-white/20 px-6 py-3 rounded-xl transition-colors"
    >
      Uitloggen
    </button>
  )
}
