// Browser-safe check: is this Supabase access token a password-recovery session?
//
// A recovery session is minted from the emailed OTP link, so its JWT `amr`
// (authentication methods reference) contains no `password` entry. A normal
// sign-in via signInWithPassword always records method "password". This mirrors
// the server-side check in proxy.ts so client and proxy agree on what counts as
// a recovery session.
export function isRecoverySession(accessToken: string): boolean {
  try {
    const payload = accessToken.split(".")[1]
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    const claims = JSON.parse(json) as { amr?: Array<{ method?: string }> }
    const amr = Array.isArray(claims.amr) ? claims.amr : []
    if (amr.length === 0) return false // no method info — treat as a normal session
    return !amr.some((entry) => entry?.method === "password")
  } catch {
    return false // undecodable token — treat as a normal session
  }
}
