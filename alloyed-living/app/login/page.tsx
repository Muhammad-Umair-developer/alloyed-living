"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/src/context/AuthContext"

// Maps Supabase / OAuth error conditions to friendly copy.
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes("invalid login credentials")) return "That email or password doesn't match our records."
  if (m.includes("email not confirmed")) return "Please confirm your email address before signing in."
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a moment and try again."
  return message || "Something went wrong. Please try again."
}

function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") ? raw : "/"
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}

const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]

// ─── FloatingInput ────────────────────────────────────────────────────────────

interface FloatingInputProps {
  id:            string
  label:         string
  type?:         string
  value:         string
  onChange:      (val: string) => void
  autoComplete?: string
  suffix?:       React.ReactNode
}

function FloatingInput({
  id, label, type = "text", value, onChange, autoComplete, suffix,
}: FloatingInputProps) {
  const [focused, setFocused] = useState(false)
  const lifted = focused || value.length > 0

  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        // No placeholder — the floating label is the placeholder.
        // A non-empty placeholder=" " causes SSR/client hydration mismatches.
        className="
          w-full bg-transparent
          border-b border-stone-200 pt-6 pb-2
          text-[13px] text-stone-800 tracking-[0.02em]
          outline-none transition-colors duration-300
          pr-7
        "
      />

      {/* Floating label */}
      <label
        htmlFor={id}
        className={`
          absolute left-0 pointer-events-none text-stone-600
          transition-all duration-300
          ${lifted
            ? "top-0 text-[8px] tracking-[0.28em] uppercase text-stone-700"
            : "top-[1.35rem] text-[12px] tracking-wide"
          }
        `}
      >
        {label}
      </label>

      {/* Animated focus underline */}
      <motion.div
        animate={{ scaleX: focused ? 1 : 0 }}
        transition={{ duration: 0.36, ease: EASE_CINEMATIC }}
        className="absolute bottom-0 left-0 right-0 h-px bg-stone-800 origin-left"
      />

      {/* Right-side suffix (visibility toggle, etc.) */}
      {suffix && (
        <div className="absolute right-0 bottom-[0.6rem]">
          {suffix}
        </div>
      )}
    </div>
  )
}

// ─── SocialButton ─────────────────────────────────────────────────────────────

interface SocialButtonProps {
  onClick:  () => void
  icon:     React.ReactNode
  label:    string
  variant?: "light" | "dark"
  disabled?: boolean
}

function SocialButton({ onClick, icon, label, variant = "light", disabled = false }: SocialButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.98 }}
      className={`
        flex items-center justify-center gap-3 w-full py-3
        text-[9px] tracking-[0.3em] uppercase cursor-pointer
        border transition-all duration-300
        disabled:opacity-60 disabled:cursor-not-allowed
        ${variant === "dark"
          ? "bg-stone-900 text-white border-stone-900 hover:bg-stone-700 hover:border-stone-700"
          : "bg-white/80 text-stone-700 border-stone-200 hover:border-stone-400 hover:bg-white"
        }
      `}
    >
      {icon}
      {label}
    </motion.button>
  )
}

// ─── SVG Logos ────────────────────────────────────────────────────────────────

function GoogleLogo() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

// ─── LoginPage ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  // ALL hooks declared unconditionally before any early return (Rules of Hooks)
  const router = useRouter()
  const { supabase } = useAuth()
  const [mounted,  setMounted]  = useState(false)
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Hydration safety gate — fires after mount, preventing SSR/client mismatch
  useEffect(() => setMounted(true), [])

  // Surface a failed/cancelled Google redirect (?error=oauth from the callback).
  useEffect(() => {
    if (!mounted) return
    const params = new URLSearchParams(window.location.search)
    if (params.get("error") === "oauth") {
      setError("Google sign-in was cancelled or could not be completed.")
    }
  }, [mounted])

  if (!mounted) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError("Please enter your email and password.")
      return
    }
    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (signInError) {
      setError(friendlyAuthError(signInError.message))
      setLoading(false)
      return
    }
    // Session is set; forward to the intended destination.
    const next = safeNext(new URLSearchParams(window.location.search).get("next"))
    router.push(next)
    router.refresh()
  }

  const handleGoogle = async () => {
    if (googleLoading) return
    setError(null)
    setGoogleLoading(true)
    const next = new URLSearchParams(window.location.search).get("next")
    const redirectTo = `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    })
    if (oauthError) {
      setError(friendlyAuthError(oauthError.message))
      setGoogleLoading(false)
    }
    // On success the browser redirects to Google — nothing else to do here.
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6
                     bg-gradient-to-br from-stone-50 via-[#faf9f7] to-stone-100">

      {/* Ambient depth blobs */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-40 w-[580px] h-[580px] rounded-full
                        bg-stone-200/30 blur-[120px]" />
        <div className="absolute -bottom-44 -left-24 w-[500px] h-[500px] rounded-full
                        bg-amber-50/50 blur-[100px]" />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: EASE_CINEMATIC }}
        className="relative w-full max-w-md"
      >
        <div className="
          backdrop-blur-md bg-white/60 p-12 rounded-xl
          border border-white/20
          shadow-[0_4px_24px_rgba(0,0,0,0.06),0_20px_64px_rgba(0,0,0,0.05)]
        ">

          {/* Brand mark */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE_CINEMATIC, delay: 0.1 }}
          >
            <Link
              href="/"
              style={EDITORIAL}
              className="block text-[11px] tracking-[0.44em] uppercase text-stone-600
                         hover:text-stone-800 transition-colors duration-500 mb-10"
            >
              Alloyed Living
            </Link>
          </motion.div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE_CINEMATIC, delay: 0.15 }}
            className="mb-10"
          >
            <h1
              style={EDITORIAL}
              className="text-[2.8rem] font-light text-stone-900 leading-[1.05]
                         tracking-[-0.01em] mb-2.5"
            >
              Welcome<br />Back.
            </h1>
            <p className="text-[9px] tracking-[0.32em] uppercase text-stone-600">
              Sign in to continue
            </p>
          </motion.div>

          {/* ── Email / password form ── */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: EASE_CINEMATIC, delay: 0.28 }}
            className="space-y-8"
            noValidate
          >
            {error && (
              <div className="border border-red-200 bg-red-50/60 px-4 py-3">
                <p className="text-[10px] tracking-[0.08em] text-red-500 leading-relaxed">{error}</p>
              </div>
            )}

            <FloatingInput
              id="email"
              label="Email Address"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />

            <FloatingInput
              id="password"
              label="Password"
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? "Hide password" : "Show password"}
                  className="cursor-pointer text-stone-500 hover:text-stone-600
                             transition-colors duration-300"
                >
                  {showPwd
                    ? <EyeOff size={13} strokeWidth={1.5} />
                    : <Eye    size={13} strokeWidth={1.5} />
                  }
                </button>
              }
            />

            {/* Forgot password */}
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-[8px] tracking-[0.22em] uppercase text-stone-600
                           hover:text-stone-900 transition-colors duration-500
                           underline underline-offset-2"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign in */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="
                w-full py-4
                bg-stone-900 text-white
                text-[9px] tracking-[0.46em] uppercase
                cursor-pointer disabled:opacity-60
                hover:bg-stone-700 transition-colors duration-500
                flex items-center justify-center gap-3
              "
            >
              {loading ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="block w-3 h-3 border border-white/30 border-t-white rounded-full"
                  />
                  Signing In
                </>
              ) : (
                "Sign In"
              )}
            </motion.button>
          </motion.form>

          {/* ── Social auth ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, ease: EASE_CINEMATIC, delay: 0.38 }}
          >
            {/* Divider */}
            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-stone-100" />
              <span className="text-[8px] tracking-[0.24em] uppercase text-stone-700">
                or continue with
              </span>
              <div className="flex-1 h-px bg-stone-100" />
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-1 gap-3">
              <SocialButton
                icon={<GoogleLogo />}
                label={googleLoading ? "Connecting…" : "Google"}
                variant="light"
                onClick={handleGoogle}
                disabled={googleLoading}
              />
            </div>
          </motion.div>

          {/* ── Sign up link ── */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, ease: EASE_CINEMATIC, delay: 0.5 }}
            className="text-center text-[9px] tracking-[0.18em] text-stone-600 mt-8"
          >
            New to Alloyed Living?{" "}
            <Link
              href="/signup"
              className="text-stone-700 underline underline-offset-2
                         hover:text-stone-900 transition-colors duration-500"
            >
              Create an account
            </Link>
          </motion.p>

        </div>
      </motion.div>
    </main>
  )
}
