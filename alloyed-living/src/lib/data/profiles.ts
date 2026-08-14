import "server-only"
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin"

// Mirrors orders.ts/addresses.ts: service-role client, every query explicitly
// scoped by id so a caller can never touch another user's row. Callers derive
// the id from the server-side session (see account-actions.ts) — this module
// never accepts one from client input.

export interface ProfileRecord {
  id: string
  email: string | null
  fullName: string | null
  phone: string | null
  avatarUrl: string | null
  role: string
}

type ProfileRow = Record<string, unknown>

function rowToProfile(r: ProfileRow): ProfileRecord {
  return {
    id: r.id as string,
    email: (r.email as string | null) ?? null,
    fullName: (r.full_name as string | null) ?? null,
    phone: (r.phone as string | null) ?? null,
    avatarUrl: (r.avatar_url as string | null) ?? null,
    role: r.role as string,
  }
}

export interface ProfileUpdateInput {
  fullName?: string
  phone?: string | null
}

export async function updateProfile(userId: string, patch: ProfileUpdateInput): Promise<ProfileRecord | null> {
  const supabase = createSupabaseAdminClient()
  const row: ProfileRow = { updated_at: new Date().toISOString() }
  if (patch.fullName !== undefined) row.full_name = patch.fullName
  if (patch.phone !== undefined) row.phone = patch.phone

  const { data, error } = await supabase
    .from("profiles")
    .update(row)
    .eq("id", userId)
    .select("*")
    .maybeSingle()
  if (error) throw error
  return data ? rowToProfile(data) : null
}
