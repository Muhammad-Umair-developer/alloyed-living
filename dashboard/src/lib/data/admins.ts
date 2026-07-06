import "server-only"
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin"

// A real dashboard admin, sourced from the profiles table (not mock JSON). An
// invited-but-not-yet-accepted user still has a profile row (the new-user
// trigger creates it at invite time), so `pending` distinguishes those who
// haven't confirmed their invite from active admins.
export interface AdminProfile {
  id: string
  email: string | null
  fullName: string | null
  role: string
  pending: boolean
}

// Lists everyone with a dashboard role. Uses the service-role client so it can
// read all admin profiles regardless of RLS. Server-only.
export async function listAdmins(): Promise<AdminProfile[]> {
  const admin = createSupabaseAdminClient()

  const { data, error } = await admin
    .from("profiles")
    .select("id,email,full_name,role")
    .in("role", ["owner", "admin"])
    .order("role", { ascending: true })
    .order("email", { ascending: true })

  if (error || !data) return []

  const rows = data as Array<{
    id: string
    email: string | null
    full_name: string | null
    role: string
  }>

  // Determine acceptance status per admin (few rows, so per-user lookups are
  // cheap and scale with the number of admins, not total users).
  return Promise.all(
    rows.map(async (r) => {
      let pending = false
      const { data: u } = await admin.auth.admin.getUserById(r.id)
      if (u?.user) {
        pending = !u.user.email_confirmed_at && !u.user.last_sign_in_at
      }
      return {
        id: r.id,
        email: r.email,
        fullName: r.full_name,
        role: r.role,
        pending,
      }
    }),
  )
}
