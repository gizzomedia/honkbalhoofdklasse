import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'

export type AdminUser = {
  email: string
  name: string | null
  can_photos: boolean
  can_analytics: boolean
  can_livestream: boolean
  can_highlights: boolean
  is_super_admin: boolean
}

async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  const { data } = await supabaseAdmin
    .from('admin_users')
    .select('*')
    .eq('email', user.email)
    .single()

  return data ?? null
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Login and callback pages skip the role check
  return <>{children}</>
}

// Utility for admin pages to get the current user + role
export { getAdminUser }
