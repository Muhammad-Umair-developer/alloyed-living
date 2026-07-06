import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseEnv } from "./env"

// Cookie-less anon client for PUBLIC reads (products, content pages, reviews).
// Unlike createSupabaseServerClient it never touches cookies(), so pages that
// use it can be statically rendered / ISR-cached instead of being forced
// dynamic. It authenticates as the anon role only — RLS public-read policies
// decide what it can see. Never use it for user-scoped or privileged queries.
let client: SupabaseClient | null = null

export function createSupabasePublicClient(): SupabaseClient {
  if (!client) {
    const { url, anonKey } = getSupabaseEnv()
    client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}
