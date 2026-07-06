import "server-only"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { canAccessDashboard, type DashboardRole } from "./roles"

// Server-side authorization guard for mutating server actions. The proxy gates
// page NAVIGATION, but server-action POSTs are separate requests that must not
// rely on it (its own header comment says so) — middleware must never be the
// only auth layer. Every action that writes through the service-role client
// calls this first; it throws on any non-admin caller, and the generic Error
// message is safe for the client to see.
export async function requireDashboardUser(): Promise<{ userId: string; role: DashboardRole }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized — please sign in again.")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!canAccessDashboard(profile?.role)) {
    throw new Error("Forbidden — dashboard access required.")
  }
  return { userId: user.id, role: profile!.role as DashboardRole }
}
