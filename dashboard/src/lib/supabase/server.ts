import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { getSupabaseEnv } from "./env"

// Server Supabase client (Server Components, Route Handlers, Server Actions).
// `cookies()` is async in Next.js 16, so this factory is async too. Uses the
// anon key and the caller's session cookies — RLS enforces access.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getSupabaseEnv()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Called from a Server Component — safe to ignore; the proxy refreshes.
        }
      },
    },
  })
}
