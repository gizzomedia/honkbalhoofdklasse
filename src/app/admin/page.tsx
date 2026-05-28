import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminUser } from './layout'
import SignOutButton from './SignOutButton'

export default async function AdminPage() {
  const user = await getAdminUser()

  if (!user) {
    redirect('/admin/login')
  }

  const sections = [
    {
      href: '/admin/photos',
      label: "Foto's",
      desc: 'Speler headshots & banners',
      allowed: user.can_photos || user.is_super_admin,
    },
    {
      href: '/admin/analytics',
      label: 'Analytics',
      desc: 'Vercel web analytics',
      allowed: user.can_analytics || user.is_super_admin,
    },
    {
      href: '/admin/streams',
      label: 'Streams',
      desc: 'Livestream links beheren',
      allowed: user.can_livestream || user.is_super_admin,
    },
    {
      href: '/admin/highlights',
      label: 'Highlights',
      desc: 'Media & video beheren',
      allowed: user.can_highlights || user.is_super_admin,
    },
    {
      href: '/admin/users',
      label: 'Gebruikers',
      desc: 'Toegang & rollen beheren',
      allowed: user.is_super_admin,
    },
  ].filter(s => s.allowed)

  return (
    <div className="min-h-screen bg-[#06101e] px-4 pt-20 pb-16">
      <div className="max-w-sm mx-auto">

        {/* Header */}
        <div className="mb-8">
          <p className="font-display font-700 text-[var(--accent)] uppercase tracking-widest text-xs mb-1">Beheerportaal</p>
          <h1 className="font-display font-800 italic text-4xl uppercase text-white">Admin</h1>
          <p className="font-display font-700 text-sm text-[var(--muted)] mt-1 uppercase tracking-wider">
            Welkom, {user.name ?? user.email}
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {sections.map(s => (
            <Link key={s.href} href={s.href}
              className="flex items-center justify-between w-full bg-[#0a1220] border border-[#1a2a3a] hover:border-[var(--accent)] transition-colors px-6 py-4 rounded-xl group">
              <div>
                <p className="font-display font-800 text-sm uppercase text-white tracking-wide">{s.label}</p>
                <p className="font-display font-700 text-xs text-[var(--muted)] mt-0.5">{s.desc}</p>
              </div>
              <span className="font-display font-800 text-[var(--accent)] text-lg group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          ))}

          {sections.length === 0 && (
            <div className="bg-[#0a1220] border border-[#1a2a3a] rounded-xl px-6 py-8 text-center">
              <p className="font-display font-700 text-sm text-[var(--muted)] uppercase tracking-wider">
                Nog geen toegang tot secties.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8">
          <SignOutButton />
        </div>
      </div>
    </AdminGate>
  )
}
