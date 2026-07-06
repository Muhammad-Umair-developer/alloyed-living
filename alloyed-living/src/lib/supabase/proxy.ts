import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { getSupabaseEnv } from "./env"

// Refreshes the Supabase auth session for an incoming request and returns the
// (possibly updated) response with refreshed cookies, plus the resolved user.
// Called from the root `proxy.ts` (the Next.js 16 replacement for middleware).
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { url, anonKey } = getSupabaseEnv()

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  // Touching getUser() refreshes the token and writes new cookies if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, supabase, user }
}
