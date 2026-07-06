import { getSettings } from "@/src/lib/data/settings"
import { listAdmins } from "@/src/lib/data/admins"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { canInviteAdmins } from "@/src/lib/auth/roles"
import PageHeader from "@/src/components/ui/PageHeader"
import SettingsView from "./SettingsView"

// Store settings are edited from this page — always read fresh.
export const dynamic = "force-dynamic"

// Resolve whether the signed-in user may invite admins (owners only), using the
// same session + profile-role check the rest of the app relies on.
async function resolveCanInvite(): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  return canInviteAdmins(profile?.role)
}

export default async function SettingsPage() {
  const [settings, admins, canInvite] = await Promise.all([
    getSettings(),
    listAdmins(),
    resolveCanInvite(),
  ])

  return (
    <div>
      <PageHeader title="Settings" description="Store details, admin roles, and API access." />
      <SettingsView settings={settings} admins={admins} canInvite={canInvite} />
    </div>
  )
}
