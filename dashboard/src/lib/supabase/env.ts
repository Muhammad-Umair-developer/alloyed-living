// Accessor for the Supabase connection values. Reads the NEXT_PUBLIC_* variable
// names so the URL + anon (publishable) key are available in BOTH server code
// and the browser bundle (Next.js only exposes NEXT_PUBLIC_* vars client-side).
//
// The service_role key is intentionally NOT read here — it must never be sent
// to the client. If a future server-only feature needs it, read
// process.env.SUPABASE_SERVICE_ROLE_KEY (NO NEXT_PUBLIC_ prefix) inside a
// server module only.

export interface SupabaseEnv {
  url: string
  anonKey: string
}

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in dashboard/.env",
    )
  }
  return { url, anonKey }
}

// Server-only accessor for the service_role key. The service_role key bypasses
// RLS and grants full admin power, so it must NEVER reach the browser. It is
// deliberately read WITHOUT a NEXT_PUBLIC_ prefix — Next only inlines
// NEXT_PUBLIC_* vars into the client bundle, so this value can never be
// statically bundled client-side. Only the server-only admin client
// (src/lib/supabase/admin.ts) is allowed to call this.
export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Set it (server-only, NO NEXT_PUBLIC_ prefix) in dashboard/.env to enable admin operations such as inviting admins.",
    )
  }
  return key
}
