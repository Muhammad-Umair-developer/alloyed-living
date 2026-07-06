"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, ShieldAlert, Check } from "lucide-react"
import { useAuth } from "@/src/context/AuthContext"
import { markAuthedThisLoad, wasAuthedThisLoad } from "@/src/lib/auth/load-guard"
import { canAccessDashboard } from "@/src/lib/auth/roles"

const ACCESS_DENIED = "You do not have access to the admin dashboard."

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const inputCls =
  "w-full px-3 py-2 text-[13px] rounded-md border border-stone-200 bg-white outline-none focus:border-stone-400 transition-colors"

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes("invalid login credentials")) return "That email or password doesn't match our records."
  if (m.includes("email not confirmed")) return "Please confirm your email address before signing in."
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a moment and try again."
  return message || "Something went wrong. Please try again."
}

export default function DashboardLoginPage() {
  const router = useRouter()
  const { supabase, user, profile, isAdmin, loading, signOut } = useAuth()

  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Forgot-password sub-form state.
  const [mode, setMode] = useState<"signin" | "forgot">("signin")
  const [resetEmail, setResetEmail] = useState("")
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  // Show the access message if the proxy bounced a non-admin here.
  useEffect(() => {
    if (!mounted) return
    const params = new URLSearchParams(window.location.search)
    if (params.get("error") === "forbidden") setError(ACCESS_DENIED)
  }, [mounted])

  // React to the resolved session: admins go straight in; a lingering
  // non-admin session is signed out with a clear message.
  //
  // Only sign out once `profile` has actually loaded. Before it resolves,
  // `isAdmin` is false merely because the profile fetch is still in flight —
  // acting on that transient state would sign a valid admin straight back out
  // (wiping the session cookies) the instant they log in.
  useEffect(() => {
    if (loading) return
    // Only act on a session the user established during THIS load. A session
    // restored from a previous load is intentionally ignored here — the dashboard
    // forces a fresh sign-in on every reload (see load-guard / DashboardGate) —
    // so we never auto-forward a stale session into the dashboard.
    if (!wasAuthedThisLoad()) return
    if (user && isAdmin) {
      router.replace("/")
    } else if (user && profile && !isAdmin) {
      setError(ACCESS_DENIED)
      void signOut()
    }
  }, [loading, user, profile, isAdmin, router, signOut])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError("Please enter your email and password.")
      return
    }
    setSubmitting(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (signInError || !data.user) {
      setError(friendlyAuthError(signInError?.message ?? "Sign-in failed."))
      setSubmitting(false)
      return
    }

    // Enforce dashboard-only access: verify the role, and sign non-admins back out.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single()

    if (!canAccessDashboard(profile?.role)) {
      await supabase.auth.signOut()
      setError(ACCESS_DENIED)
      setSubmitting(false)
      return
    }

    // Mark this load as authenticated so DashboardGate admits us and the forced
    // sign-out on the dashboard side leaves this fresh session alone.
    markAuthedThisLoad()
    router.replace("/")
    router.refresh()
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setResetError(null)
    const em = resetEmail.trim()
    if (!EMAIL_RE.test(em)) {
      setResetError("Please enter a valid email address.")
      return
    }
    setResetSubmitting(true)
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(em, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resetErr) throw resetErr
      // Always confirm success — never reveal whether the email is registered.
      setResetSent(true)
    } catch (err) {
      const msg = (err instanceof Error ? err.message : "").toLowerCase()
      if (msg.includes("rate limit") || msg.includes("too many")) {
        setResetError("Too many attempts. Please wait a moment and try again.")
      } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to")) {
        setResetError("Network error. Please check your connection and try again.")
      } else {
        setResetError("Something went wrong. Please try again.")
      }
    } finally {
      setResetSubmitting(false)
    }
  }

  function openForgot() {
    setResetError(null)
    setResetSent(false)
    setResetEmail(email.trim())
    setMode("forgot")
  }

  function backToSignIn() {
    setResetError(null)
    setResetSent(false)
    setMode("signin")
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
          {mode === "signin" ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h1 className="text-[18px] font-semibold tracking-tight text-stone-900">Sign in</h1>
                <p className="text-[12px] text-stone-500 mt-1">Admin access only.</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-[#7a3535]/25 bg-[#f5f0ef] px-3 py-2.5">
                  <ShieldAlert size={14} className="text-[#7a3535] mt-px flex-shrink-0" />
                  <p className="text-[12px] leading-relaxed text-[#5c2e2e]">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-[12px] font-medium text-stone-700 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className={inputCls}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-[12px] font-medium text-stone-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
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
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={openForgot}
                    className="text-[11px] text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 text-[13px] font-medium text-white bg-stone-900 rounded-md hover:bg-stone-700 transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgot} className="space-y-5">
              <div>
                <h1 className="text-[18px] font-semibold tracking-tight text-stone-900">Reset password</h1>
                <p className="text-[12px] text-stone-500 mt-1">We&apos;ll email you a link to set a new one.</p>
              </div>

              {resetSent ? (
                <>
                  <div className="flex items-start gap-2 rounded-md border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-3 py-2.5">
                    <Check size={14} className="text-[var(--accent)] mt-px flex-shrink-0" />
                    <p className="text-[12px] leading-relaxed text-stone-700">
                      If an account exists for that address, a reset link is on its way. Check your email.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={backToSignIn}
                    className="w-full py-2 text-[13px] font-medium text-stone-700 border border-stone-200 rounded-md hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    Back to sign in
                  </button>
                </>
              ) : (
                <>
                  {resetError && (
                    <div className="flex items-start gap-2 rounded-md border border-[#7a3535]/25 bg-[#f5f0ef] px-3 py-2.5">
                      <ShieldAlert size={14} className="text-[#7a3535] mt-px flex-shrink-0" />
                      <p className="text-[12px] leading-relaxed text-[#5c2e2e]">{resetError}</p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="reset-email" className="block text-[12px] font-medium text-stone-700 mb-1.5">
                      Email
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      autoComplete="email"
                      className={inputCls}
                      placeholder="you@example.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="w-full py-2 text-[13px] font-medium text-white bg-stone-900 rounded-md hover:bg-stone-700 transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {resetSubmitting ? "Sending…" : "Send reset link"}
                  </button>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={backToSignIn}
                      className="text-[11px] text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
                    >
                      Back to sign in
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
