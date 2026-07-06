// Accessor for the Supabase connection values. Reads the NEXT_PUBLIC_* variable
// names so the URL + anon (publishable) key are available in BOTH server code
// and the browser bundle (Next.js only exposes NEXT_PUBLIC_* vars client-side).
//
// The anon key is publishable and safe to expose. The service_role key is read
// only by the server-only admin client (src/lib/supabase/admin.ts) via
// getServiceRoleKey() below — it is deliberately NOT prefixed NEXT_PUBLIC_, so
// Next can never inline it into the browser bundle.

export interface SupabaseEnv {
  url: string
  anonKey: string
}

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in alloyed-living/.env",
    )
  }
  return { url, anonKey }
}

// Server-only accessor for the service_role key. The service_role key bypasses
// RLS, so it must NEVER reach the browser. Read WITHOUT a NEXT_PUBLIC_ prefix so
// it cannot be statically bundled client-side. Only the server-only admin client
// (src/lib/supabase/admin.ts) is allowed to call this — used by trusted
// server paths (order creation, the Safepay webhook's payment update, and
// analytics tracking).
export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Set it (server-only, NO NEXT_PUBLIC_ prefix) in alloyed-living/.env to enable order, payment, and analytics writes.",
    )
  }
  return key
}
