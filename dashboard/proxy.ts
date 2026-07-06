import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/src/lib/supabase/proxy"
import { canAccessDashboard } from "@/src/lib/auth/roles"

// Next.js 16 renamed the `middleware` convention to `proxy`. This runs on the
// Node.js runtime and is the primary gate for the admin dashboard:
//   • every route requires a valid Supabase session, AND
//   • the signed-in user's profiles.role must be 'admin'.
// Anything else is redirected to /login.
//
// NOTE: Server Functions (server actions) are POSTed to their own route and a
// proxy matcher can skip them, so mutating actions must independently verify
// admin access (see src/actions/*). This proxy covers page/navigation access.

const PUBLIC_PATHS = ["/login", "/auth", "/reset-password"]

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

// Redirect while preserving any refreshed auth cookies that updateSession wrote
// onto `response`. Returning a bare NextResponse.redirect() would drop those
// Set-Cookie headers, so a session refreshed during this request would be lost
// on the redirect and the browser/server could fall out of sync.
function redirectPreservingCookies(response: NextResponse, url: URL): NextResponse {
  const redirect = NextResponse.redirect(url)
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie)
  return redirect
}

// Is this the temporary session Supabase mints when a password-reset link is
// opened? Such a session is authenticated via the emailed recovery OTP, never a
// password, so its JWT `amr` (authentication methods reference) contains no
// `password` entry. A real dashboard session is always established via
// signInWithPassword, which records `method: "password"`. We therefore treat
// any session lacking a password factor as a recovery session — this does not
// hardcode the recovery method label, so it holds however GoTrue names it.
// The token was already validated by updateSession()'s getUser(); here we only
// read a claim from it.
function isRecoverySession(accessToken: string): boolean {
  try {
    const payload = accessToken.split(".")[1]
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
    const amr: Array<{ method?: string }> = Array.isArray(claims.amr) ? claims.amr : []
    if (amr.length === 0) return false // no method info — treat as normal, never lock out a real admin
    return !amr.some((entry) => entry?.method === "password")
  } catch {
    return false // undecodable token — fail open so a real admin is never stranded
  }
}

export async function proxy(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  if (isPublic(pathname)) return response

  // 1) Must be signed in.
  if (!user) {
    return redirectPreservingCookies(response, new URL("/login", request.url))
  }

  // 1.5) A password-recovery session may ONLY reach /reset-password (a public
  // path, handled above). Supabase establishes a full session the moment the
  // emailed reset link is opened, so without this guard that link alone would
  // grant dashboard access before the password is ever changed. Confine it to
  // /reset-password until the user sets a new password — after which the reset
  // page signs them out and they sign back in normally, re-running the admin
  // check below. This never bypasses the role gate.
  // getSession() reads/parses the session from the request cookies locally — no
  // network round-trip. The token was already validated (and refreshed) by
  // updateSession()'s getUser() above, so we don't call getUser() a second time.
  const { data: { session } } = await supabase.auth.getSession()

  if (session && isRecoverySession(session.access_token)) {
    return redirectPreservingCookies(response, new URL("/reset-password", request.url))
  }

  // 2) Must hold a dashboard role (admin or owner).
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!canAccessDashboard(profile?.role)) {
    const redirectUrl = new URL("/login", request.url)
    redirectUrl.searchParams.set("error", "forbidden")
    return redirectPreservingCookies(response, redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    // Run on everything except static assets and image files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}