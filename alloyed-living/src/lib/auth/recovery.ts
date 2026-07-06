// Browser-safe check: is this Supabase access token a password-recovery session?
//
// A recovery session is minted from the emailed OTP link, so its JWT `amr`
// (authentication methods reference) contains no `password` entry. A normal
// sign-in via signInWithPassword always records method "password". We use this
// to make /reset-password activate ONLY for a genuine recovery session, never
// for a visitor who simply happens to be signed in.
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
