import { createBrowserClient } from "@supabase/ssr"

// Browser Supabase client. Cookie-backed session storage (via @supabase/ssr)
// keeps the session in sync with the server on every request. URL + anon key
// are passed in from the server (see AuthProvider) so we don't need a
// NEXT_PUBLIC_* variable.
export function createSupabaseBrowserClient(url: string, anonKey: string) {
  return createBrowserClient(url, anonKey)
}
