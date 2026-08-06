import { NextResponse, type NextRequest } from "next/server"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"

// Dedicated server-side exchange point for every Supabase auth `code` — OAuth
// (Google), and password recovery (forgot-password redirects here too, then
// on to /reset-password). Supabase sends the user back here with a `code`,
// which we exchange for a session (cookies are written by the server client)
// before ever rendering a page. Then we forward to `next` (defaults to home).
// The root proxy.ts also rescues any `code` that lands elsewhere and routes
// it here, so no auth code is ever left sitting in a public, rendered URL.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const oauthError = searchParams.get("error")
  const nextParam = searchParams.get("next")
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/"

  if (oauthError) {
    return NextResponse.redirect(`${origin}/login?error=oauth`)
  }

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
