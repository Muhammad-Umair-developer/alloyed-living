import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/src/lib/supabase/proxy"

// Next.js 16 renamed the `middleware` convention to `proxy`. On the storefront
// this only keeps the Supabase session fresh (refreshing tokens + cookies) so
// Server Components and Server Actions see an up-to-date session. The site is
// public, so there are no redirects here.
export async function proxy(request: NextRequest) {
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
