import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/src/lib/supabase/proxy"

// Next.js 16 renamed the `middleware` convention to `proxy`. On the storefront
// this keeps the Supabase session fresh (refreshing tokens + cookies) so
// Server Components and Server Actions see an up-to-date session, and — the
// one redirect this proxy does perform — rescues a stray Supabase auth `code`
// that lands anywhere other than the dedicated callback route.
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // SECURITY: a Supabase auth `code` (PKCE grant from a magic link, password
  // reset, or OAuth redirect) must be exchanged server-side by
  // app/auth/callback/route.ts and never sit in a rendered, public URL. Every
  // redirectTo/emailRedirectTo in this app already points at /auth/callback,
  // but Supabase silently falls back to the project's configured Site URL
  // (typically the bare domain) if a redirect target isn't on its allow-list —
  // still attaching ?code= — which would otherwise land an unconsumed,
  // single-use, short-lived auth code on the public homepage. Catch that here,
  // before any page renders, and hand it to the callback route instead. This
  // runs before the auth-cookie check below, since an unexchanged code never
  // has a session cookie yet.
  if (searchParams.has("code") && pathname !== "/auth/callback") {
    const target = new URL("/auth/callback", request.url)
    target.search = request.nextUrl.search
    return NextResponse.redirect(target)
  }

  // Most storefront traffic is anonymous. updateSession() makes a network call
  // to Supabase Auth, so skip it entirely when the request carries no Supabase
  // auth cookies — there is no session to refresh.
  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-"))
  if (!hasAuthCookie) return NextResponse.next()

  const { response } = await updateSession(request)
  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico)$).*)",
  ],
}
