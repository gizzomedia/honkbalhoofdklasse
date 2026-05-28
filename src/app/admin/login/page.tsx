'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

function LoginContent() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const next = searchParams.get('next') ?? '/admin'

  useEffect(() => {
    const err = searchParams.get('error')
    const msg = searchParams.get('msg')
    if (err === 'auth' && msg) {
      setError(`Auth fout: ${msg}`)
    } else if (err === 'auth') {
      setError('Je account heeft geen toegang tot het beheerportaal.')
    } else if (err === 'nocode') {
      setError('Geen auth code ontvangen — probeer opnieuw.')
    }
  }, [searchParams])

  async function signInWithGoogle() {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/admin/auth/callback`,
      },
    })
    if (error) {
      setError('Inloggen mislukt. Probeer opnieuw.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-[#06101e]">

      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #fe3d00 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #1e5fa0 0%, transparent 70%)' }} />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Card */}
      <div className="relative w-full max-w-sm">
        <div className="bg-[#0a1220]/80 backdrop-blur-xl border border-[#1a2a3a] rounded-2xl p-8 shadow-2xl">

          {/* Logo + branding */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 mb-4">
              <Image
                src="https://res.cloudinary.com/dqld625sq/image/upload/v1778542430/logo_hk_abi5hm.png"
                alt="Honkbal Hoofdklasse"
                width={80}
                height={80}
                className="object-contain w-full h-full"
              />
            </div>
            <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-xs mb-1">
              Honkbal Hoofdklasse
            </p>
            <h1 className="font-display font-800 italic text-3xl uppercase text-white leading-none">
              Beheer<span className="text-[var(--accent)]">portaal</span>
            </h1>
            <p className="font-display font-700 text-sm text-[var(--muted)] mt-2 uppercase tracking-wider">
              Inloggen met je Google account
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="font-display font-700 text-sm text-red-400 text-center">{error}</p>
            </div>
          )}

          {/* Google sign-in button */}
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-display font-800 text-sm uppercase tracking-wider px-6 py-4 rounded-xl transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {loading ? 'Bezig met inloggen…' : 'Inloggen met Google'}
          </button>

          <p className="text-center font-display font-700 text-xs text-[var(--muted)] mt-6 uppercase tracking-wider">
            Alleen voor geautoriseerde accounts
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
