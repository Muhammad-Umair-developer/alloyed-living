"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, ShieldAlert, Check, Loader2 } from "lucide-react"
import { useAuth } from "@/src/context/AuthContext"
import { isRecoverySession } from "@/src/lib/auth/recovery"

const MIN_PASSWORD = 8
const REDIRECT_DELAY_MS = 4000

const inputCls =
  "w-full px-3 py-2 text-[13px] rounded-md border border-stone-200 bg-white outline-none focus:border-stone-400 transition-colors"

type Status = "checking" | "ready" | "invalid" | "done"

export default function DashboardResetPasswordPage() {
  const router = useRouter()
  const { supabase } = useAuth()

  const [mounted,  setMounted]  = useState(false)
  const [status,   setStatus]   = useState<Status>("checking")
  const [password, setPassword] = useState("")
  const [confirm,  setConfirm]  = useState("")
  const [showPwd,  setShowPwd]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  // Activate ONLY for a genuine password-recovery session — never merely because
  // a session exists (that made /reset-password open by default for any signed-in
  // visitor). The browser client (detectSessionInUrl) exchanges the emailed
  // `?code=` on load and emits PASSWORD_RECOVERY; the resulting session's JWT is
  // a recovery token (see isRecoverySession). A normal session, or no recovery
  // link at all, sends the visitor to /login instead.
  useEffect(() => {
    if (!mounted) return

    const search = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""))
    const linkError =
      search.get("error") || search.get("error_code") ||
      hash.get("error") || hash.get("error_code")
    if (linkError) {
      setStatus("invalid")
      return
    }

    // Evidence the visit came from an email link (PKCE `code`, or implicit-flow
    // hash tokens). When present, the recovery session is still being exchanged,
    // so we wait for it rather than judging the (possibly not-yet-set) session.
    const fromLink =
      !!search.get("code") || !!search.get("token_hash") ||
      search.get("type") === "recovery" || hash.get("type") === "recovery" ||
      !!hash.get("access_token")

    let settled = false
    const ready   = () => { if (!settled) { settled = true; setStatus("ready") } }
    const invalid = () => { if (!settled) { settled = true; setStatus("invalid") } }
    const leave   = () => { if (!settled) { settled = true; router.replace("/login") } }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") return ready()
      if (session && isRecoverySession(session.access_token)) ready()
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && isRecoverySession(session.access_token)) return ready()
      if (session) return leave()      // a normal, non-recovery session — not a reset visit
      if (!fromLink) return leave()    // no session and no link — not a reset visit
      // From a link but the session hasn't materialised yet → wait (see timer).
    })

    const timer = setTimeout(() => {
      if (settled) return
      fromLink ? invalid() : leave()
    }, fromLink ? 6000 : 1500)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [mounted, supabase, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`)
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    setSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setStatus("done")
      // Re-enforce the admin gate: never grant dashboard access straight from a
      // recovery session. Sign out and send the user back to /login, where the
      // proxy + login page verify the admin role on a fresh sign-in.
      setTimeout(async () => {
        await supabase.auth.signOut()
        router.replace("/login")
      }, REDIRECT_DELAY_MS)
    } catch (err) {
      const msg = (err instanceof Error ? err.message : "").toLowerCase()
      if (msg.includes("session") || msg.includes("expired") || msg.includes("jwt") || msg.includes("token")) {
        setError("Your reset link has expired. Please request a new one.")
        setStatus("invalid")
      } else if (msg.includes("should be") || msg.includes("at least") || msg.includes("weak")) {
        setError(`Please choose a stronger password (at least ${MIN_PASSWORD} characters).`)
      } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to")) {
        setError("Network error. Please check your connection and try again.")
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      }
      setSubmitting(false)
    }
  }

  if (!mounted) return null

  return (
    <main className="min-h-screen grid place-items-center bg-[var(--background)] px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-[15px] font-semibold tracking-tight text-stone-900">Alloyed Living</p>
          <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mt-0.5">Admin Dashboard</p>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-8 shadow-sm space-y-5">
          {status === "checking" && (
            <div className="flex items-center gap-2.5 text-stone-500">
              <Loader2 size={15} className="animate-spin" />
              <p className="text-[13px]">Verifying your reset link…</p>
            </div>
          )}

          {status === "invalid" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-[18px] font-semibold tracking-tight text-stone-900">Link expired</h1>
                <p className="text-[12px] text-stone-500 mt-1">This reset link is no longer valid.</p>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-[#7a3535]/25 bg-[#f5f0ef] px-3 py-2.5">
                <ShieldAlert size={14} className="text-[#7a3535] mt-px flex-shrink-0" />
                <p className="text-[12px] leading-relaxed text-[#5c2e2e]">
                  Reset links are single-use and time-limited. Please request a new one from the sign-in page.
                </p>
              </div>
              <Link
                href="/login"
                className="block w-full py-2 text-center text-[13px] font-medium text-white bg-stone-900 rounded-md hover:bg-stone-700 transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          )}

          {status === "done" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-[18px] font-semibold tracking-tight text-stone-900">Password updated</h1>
                <p className="text-[12px] text-stone-500 mt-1">You&apos;re all set.</p>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-3 py-2.5">
                <Check size={14} className="text-[var(--accent)] mt-px flex-shrink-0" />
                <p className="text-[12px] leading-relaxed text-stone-700">
                  Your password has been changed. Redirecting you to sign in…
                </p>
              </div>
            </div>
          )}

          {status === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <h1 className="text-[18px] font-semibold tracking-tight text-stone-900">Set a new password</h1>
                <p className="text-[12px] text-stone-500 mt-1">Choose a password with at least {MIN_PASSWORD} characters.</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-[#7a3535]/25 bg-[#f5f0ef] px-3 py-2.5">
                  <ShieldAlert size={14} className="text-[#7a3535] mt-px flex-shrink-0" />
                  <p className="text-[12px] leading-relaxed text-[#5c2e2e]">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-[12px] font-medium text-stone-700 mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                  >
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm" className="block text-[12px] font-medium text-stone-700 mb-1.5">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type={showPwd ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className={inputCls}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 text-[13px] font-medium text-white bg-stone-900 rounded-md hover:bg-stone-700 transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
