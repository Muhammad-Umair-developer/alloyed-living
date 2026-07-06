import { NextResponse, type NextRequest } from "next/server"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"

// OAuth (Google) redirect target. Supabase sends the user back here with a
// `code`, which we exchange for a session (cookies are written by the server
// client). Then we forward to `next` (defaults to home).
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
