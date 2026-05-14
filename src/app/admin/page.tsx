import Link from 'next/link'

export default function AdminPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#06101e]">
      <div className="w-full max-w-sm space-y-4 px-4">
        <h1 className="font-display font-800 italic text-4xl uppercase text-white mb-8">
          <strong>Admin</strong>
        </h1>
        <Link href="/admin/photos"
          className="flex items-center justify-between w-full bg-[#0a1220] border border-[#1a2a3a] hover:border-[var(--accent)] transition-colors px-6 py-4 rounded-xl group">
          <div>
            <p className="font-display font-800 text-sm uppercase text-white tracking-wide">Foto&apos;s</p>
            <p className="font-display font-700 text-xs text-[var(--muted)] mt-0.5">Speler headshots & banners</p>
          </div>
          <span className="font-display font-800 text-[var(--accent)] text-lg group-hover:translate-x-1 transition-transform">→</span>
        </Link>
        <Link href="/admin/streams"
          className="flex items-center justify-between w-full bg-[#0a1220] border border-[#1a2a3a] hover:border-[var(--accent)] transition-colors px-6 py-4 rounded-xl group">
          <div>
            <p className="font-display font-800 text-sm uppercase text-white tracking-wide">Streams</p>
            <p className="font-display font-700 text-xs text-[var(--muted)] mt-0.5">Livestream links beheren</p>
          </div>
          <span className="font-display font-800 text-[var(--accent)] text-lg group-hover:translate-x-1 transition-transform">→</span>
        </Link>
      </div>
    </div>
  )
}
