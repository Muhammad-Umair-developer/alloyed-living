"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { updateSettings } from "@/src/lib/data/settings"
import type { Settings } from "@/src/lib/data/types"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin"
import { canInviteAdmins, isAssignableAdminRole } from "@/src/lib/auth/roles"
import { requireDashboardUser } from "@/src/lib/auth/require-admin"

export async function updateSettingsAction(patch: Partial<Settings>): Promise<Settings> {
  await requireDashboardUser()
  const settings = await updateSettings(patch)
  revalidatePath("/settings")
  return settings
}

export interface InviteResult {
  ok: boolean
  message: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Invites a new admin by email with an assigned dashboard role. The role rides
// along as user metadata so the new-user DB trigger sets profiles.role correctly
// when the invitee accepts (see supabase/migrations/*_invite_admin_role.sql).
//
// Authorization mirrors the rest of the app: the caller's identity comes from
// their Supabase session on the server (never trusted from the client), and
// their profiles.role must be "owner". Raw Supabase errors are never returned to
// the client — only friendly, mapped messages.
export async function inviteAdminAction(email: string, role: string): Promise<InviteResult> {
  const cleanEmail = email.trim().toLowerCase()

  // ── Validate input ──
  if (!EMAIL_RE.test(cleanEmail)) {
    return { ok: false, message: "Please enter a valid email address." }
  }
  if (!isAssignableAdminRole(role)) {
    return { ok: false, message: "Please choose a valid role." }
  }

  // ── Authorize: caller must be a signed-in owner ──
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, message: "Your session has expired. Please sign in again." }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!canInviteAdmins(profile?.role)) {
    return { ok: false, message: "Only an owner can invite new admins." }
  }

  // ── Send the invite via the service-role Admin API ──
  // Build an absolute origin so the "Accept Invitation" link returns to this
  // dashboard's /reset-password page (where the invitee sets their password).
  const h = await headers()
  const host = h.get("host")
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https")
  const origin = host ? `${proto}://${host}` : undefined

  const admin = createSupabaseAdminClient()
  const { error } = await admin.auth.admin.inviteUserByEmail(cleanEmail, {
    data: { role },
    ...(origin ? { redirectTo: `${origin}/reset-password` } : {}),
  })

  if (error) {
    const m = error.message.toLowerCase()
    if (m.includes("already") || m.includes("registered") || m.includes("exists")) {
      return { ok: false, message: "That email already has an account." }
    }
    if (m.includes("rate limit") || m.includes("too many")) {
      return { ok: false, message: "Too many invites just now. Please wait a moment and try again." }
    }
    // Log the real error server-side for diagnosis; never leak it to the client.
    console.error("[inviteAdminAction]", error)
    return { ok: false, message: "Could not send the invitation. Please try again." }
  }

  revalidatePath("/settings")
  return { ok: true, message: `Invitation sent to ${cleanEmail}.` }
}
