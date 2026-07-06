import { createBrowserClient } from "@supabase/ssr"

// Browser Supabase client for the dashboard. Uses the anon key only — the
// service_role key must never reach client-side code.
export function createSupabaseBrowserClient(url: string, anonKey: string) {
  return createBrowserClient(url, anonKey)
}
