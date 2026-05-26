'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-sm mb-3">Geen verbinding</p>
        <h1 className="font-display font-800 italic text-4xl uppercase text-white mb-3">
          <strong>Offline</strong>
        </h1>
        <p className="text-[var(--muted)] text-sm max-w-xs leading-relaxed">
          Controleer je internetverbinding en probeer het opnieuw.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 font-display font-800 text-sm uppercase tracking-wider bg-[var(--accent)] text-white px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
        >
          Opnieuw proberen
        </button>
      </div>
    </div>
  )
}
