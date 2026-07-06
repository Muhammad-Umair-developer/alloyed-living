import "server-only"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseEnv, getServiceRoleKey } from "./env"

// Service-role Supabase client for privileged, server-only operations such as
// `auth.admin.inviteUserByEmail`. It authenticates as the service role and
// bypasses RLS, so it must NEVER run in the browser.
//
// The `import "server-only"` above is a build-time guard: if this module is ever
// pulled into a Client Component's import graph, the build fails. It is only
// imported by server actions and server-side data modules — never a component
// marked "use client".
//
// No session is persisted or refreshed — this client is not a signed-in user.
export function createSupabaseAdminClient() {
  const { url } = getSupabaseEnv()
  return createClient(url, getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
