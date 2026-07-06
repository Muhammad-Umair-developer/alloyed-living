"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Eye, EyeOff, Check, Mail, UserCheck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/src/context/AuthContext"

// Maps Supabase sign-up errors to friendly copy.
function friendlySignupError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already"))
    return "An account with this email already exists. Try signing in instead."
  if (m.includes("password should be") || m.includes("weak") || m.includes("at least"))
    return "Please choose a stronger password (at least 8 characters)."
  if (m.includes("invalid email")) return "Please enter a valid email address."
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a moment and try again."
  return message || "Something went wrong. Please try again."
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
  error?:        string
}

function FloatingInput({
  id, label, type = "text", value, onChange, autoComplete, suffix, error,
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
        className={`
          w-full bg-transparent pt-6 pb-2 pr-7
          text-[13px] text-stone-800 tracking-[0.02em]
          outline-none transition-colors duration-300
          border-b ${error ? "border-red-300" : "border-stone-200"}
        `}
      />

      {/* Floating label */}
      <label
        htmlFor={id}
        className={`
          absolute left-0 pointer-events-none text-stone-400
          transition-all duration-300
          ${lifted
            ? "top-0 text-[8px] tracking-[0.28em] uppercase text-stone-500"
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
        className={`absolute bottom-0 left-0 right-0 h-px origin-left
          ${error ? "bg-red-400" : "bg-stone-800"}`}
      />

      {/* Right-side suffix */}
      {suffix && (
        <div className="absolute right-0 bottom-[0.6rem]">
          {suffix}
        </div>
      )}

      {/* Inline error */}
      {error && (
        <p className="mt-1.5 text-[8px] tracking-[0.16em] text-red-400">{error}</p>
      )}
    </div>
  )
}

// ─── EyeToggle ────────────────────────────────────────────────────────────────

function EyeToggle({ visible, onToggle, label }: {
  visible: boolean; onToggle: () => void; label: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className="cursor-pointer text-stone-300 hover:text-stone-600 transition-colors duration-300"
    >
      {visible
        ? <EyeOff size={13} strokeWidth={1.5} />
        : <Eye    size={13} strokeWidth={1.5} />
      }
    </button>
  )
}

// ─── SocialButton ─────────────────────────────────────────────────────────────

function SocialButton({ onClick, icon, label, variant = "light" }: {
  onClick: () => void; icon: React.ReactNode; label: string; variant?: "light" | "dark"
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={`
        flex items-center justify-center gap-3 w-full py-3
        text-[9px] tracking-[0.3em] uppercase cursor-pointer
        border transition-all duration-300
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

function AppleLogo() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zm3.378-3.066c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702z" />
    </svg>
  )
}

// ─── StatusModal ──────────────────────────────────────────────────────────────

type ModalVariant = "success" | "exists"

function StatusModal({
  variant, email, onSignIn, onDismiss,
}: {
  variant: ModalVariant
  email: string
  onSignIn: () => void
  onDismiss: () => void
}) {
  const isExists = variant === "exists"

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: EASE_CINEMATIC }}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
    >
      {/* Dimmed backdrop — click to dismiss */}
      <div
        onClick={onDismiss}
        className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm"
      />

      {/* Modal card */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: EASE_CINEMATIC, delay: 0.05 }}
        role="dialog"
        aria-modal="true"
        className="
          relative w-full max-w-sm text-center
          backdrop-blur-md bg-white/80 rounded-xl
          px-9 py-12 sm:px-11 sm:py-14
          border border-white/30
          shadow-[0_4px_24px_rgba(0,0,0,0.08),0_28px_80px_rgba(0,0,0,0.12)]
        "
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE_CINEMATIC, delay: 0.2 }}
          className="mx-auto mb-8 flex h-16 w-16 items-center justify-center
                     rounded-full bg-stone-900 text-white"
        >
          {isExists
            ? <UserCheck size={22} strokeWidth={1.5} />
            : <Mail      size={22} strokeWidth={1.5} />
          }
        </motion.div>

        {/* Heading */}
        <h2
          style={EDITORIAL}
          className="text-[2rem] font-light leading-[1.1] tracking-[-0.01em] text-stone-900 mb-3"
        >
          {isExists ? "Account exists." : "Check your inbox."}
        </h2>

        {/* Body */}
        <p className="text-[11px] leading-relaxed tracking-[0.04em] text-stone-500 mb-1.5">
          {isExists
            ? "An account already exists for"
            : "We’ve sent a confirmation link to"}
        </p>
        <p className="text-[12px] tracking-[0.02em] text-stone-800 mb-8 break-all">
          {email}
        </p>
        <p className="text-[10px] leading-relaxed tracking-[0.08em] text-stone-400 mb-9">
          {isExists
            ? "Sign in to continue, or reset your password."
            : "Confirm your email, then sign in to begin."}
        </p>

        {/* Action */}
        <motion.button
          type="button"
          onClick={onSignIn}
          whileTap={{ scale: 0.98 }}
          className="
            w-full py-4
            bg-stone-900 text-white
            text-[9px] tracking-[0.46em] uppercase cursor-pointer
            hover:bg-stone-700 transition-colors duration-500
          "
        >
          Go to Sign In
        </motion.button>

        {/* Secondary action — only for existing accounts */}
        {isExists && (
          <button
            type="button"
            onClick={onDismiss}
            className="mt-5 text-[9px] tracking-[0.24em] uppercase text-stone-400
                       hover:text-stone-700 transition-colors duration-300 cursor-pointer"
          >
            Use a different email
          </button>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── SignUpPage ───────────────────────────────────────────────────────────────

export default function SignUpPage() {
  // ALL hooks declared unconditionally before any early return (Rules of Hooks)
  const router = useRouter()
  const { supabase } = useAuth()
  const [mounted,  setMounted]  = useState(false)
  const [name,     setName]     = useState("")
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [confirm,  setConfirm]  = useState("")
  const [showPwd,  setShowPwd]  = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [agreed,   setAgreed]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [modal,    setModal]    = useState<ModalVariant | null>(null)

  // Hydration safety gate — renders nothing on the server, avoiding SSR/client mismatches
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  // ── Derived validation ────────────────────────────────────────────────────
  const confirmError =
    confirm.length > 0 && password !== confirm ? "Passwords do not match" : undefined

  const canSubmit =
    name.trim() &&
    email.trim() &&
    password.length >= 8 &&
    password === confirm &&
    agreed

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setModal(null)
    if (!canSubmit) {
      if (password.length < 8) setError("Please choose a stronger password (at least 8 characters).")
      return
    }
    setLoading(true)
    // The DB trigger creates the profiles row (role='customer') automatically —
    // we only pass full_name as user metadata for it/the profile to use.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (signUpError) {
      setError(friendlySignupError(signUpError.message))
      setLoading(false)
      return
    }
    if (data.session) {
      // Email confirmation disabled — user is signed in immediately.
      router.push("/")
      router.refresh()
      return
    }
    // Supabase hides "already registered" to prevent email enumeration:
    // it returns a user with an empty `identities` array and no error.
    const alreadyRegistered =
      data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0
    if (alreadyRegistered) {
      setModal("exists")
      setLoading(false)
      return
    }
    // Genuine new signup — email confirmation required.
    setModal("success")
    setLoading(false)
  }

  const handleGoogle = async () => {
    setError(null)
    setModal(null)
    setGoogleLoading(true)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (oauthError) {
      setError(friendlySignupError(oauthError.message))
      setGoogleLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16
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
              Create<br />Account.
            </h1>
            <p className="text-[9px] tracking-[0.32em] uppercase text-stone-600">
              Start your journey
            </p>
          </motion.div>

          {/* ── Form ── */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: EASE_CINEMATIC, delay: 0.28 }}
            className="space-y-7"
            noValidate
          >
            {error && (
              <div className="border border-red-200 bg-red-50/60 px-4 py-3">
                <p className="text-[10px] tracking-[0.08em] text-red-500 leading-relaxed">{error}</p>
              </div>
            )}

            <FloatingInput
              id="name"
              label="Full Name"
              type="text"
              value={name}
              onChange={setName}
              autoComplete="name"
            />

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
              autoComplete="new-password"
              suffix={
                <EyeToggle
                  visible={showPwd}
                  onToggle={() => setShowPwd((v) => !v)}
                  label={showPwd ? "Hide password" : "Show password"}
                />
              }
            />

            <FloatingInput
              id="confirm"
              label="Confirm Password"
              type={showConf ? "text" : "password"}
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              error={confirmError}
              suffix={
                <EyeToggle
                  visible={showConf}
                  onToggle={() => setShowConf((v) => !v)}
                  label={showConf ? "Hide confirm password" : "Show confirm password"}
                />
              }
            />

            {/* Terms checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group mt-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={agreed}
                onClick={() => setAgreed((v) => !v)}
                className={`
                  mt-[1px] flex-shrink-0 w-4 h-4
                  border transition-all duration-300 cursor-pointer
                  flex items-center justify-center
                  ${agreed
                    ? "bg-stone-900 border-stone-900"
                    : "bg-transparent border-stone-300 group-hover:border-stone-500"
                  }
                `}
              >
                {agreed && <Check size={9} strokeWidth={2.5} className="text-white" />}
              </button>
              <span className="text-[9px] tracking-[0.12em] text-stone-600 leading-relaxed">
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="text-stone-600 underline underline-offset-2
                             hover:text-stone-900 transition-colors duration-300"
                >
                  Terms of Use
                </Link>
                {" "}and{" "}
                <Link
                  href="/privacy"
                  className="text-stone-600 underline underline-offset-2
                             hover:text-stone-900 transition-colors duration-300"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={!canSubmit || loading}
              whileTap={{ scale: 0.98 }}
              className="
                w-full py-4 mt-2
                bg-stone-900 text-white
                text-[9px] tracking-[0.46em] uppercase
                cursor-pointer disabled:opacity-40
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
                  Creating Account
                </>
              ) : (
                "Create Account"
              )}
            </motion.button>
          </motion.form>

          {/* ── Social auth ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, ease: EASE_CINEMATIC, delay: 0.38 }}
          >
            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-stone-100" />
              <span className="text-[8px] tracking-[0.24em] uppercase text-stone-500">
                or sign up with
              </span>
              <div className="flex-1 h-px bg-stone-100" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SocialButton
                icon={<GoogleLogo />}
                label={googleLoading ? "Connecting…" : "Google"}
                variant="light"
                onClick={handleGoogle}
              />
              <SocialButton
                icon={<AppleLogo />}
                label="Apple"
                variant="dark"
                onClick={() => { /* Apple OAuth not configured */ }}
              />
            </div>
          </motion.div>

          {/* ── Sign in link ── */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, ease: EASE_CINEMATIC, delay: 0.5 }}
            className="text-center text-[9px] tracking-[0.18em] text-stone-600 mt-8"
          >
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-stone-700 underline underline-offset-2
                         hover:text-stone-900 transition-colors duration-500"
            >
              Sign in
            </Link>
          </motion.p>

        </div>
      </motion.div>

      {/* Status modal — success (confirm email) or existing-account notice */}
      <AnimatePresence>
        {modal && (
          <StatusModal
            variant={modal}
            email={email.trim()}
            onSignIn={() => router.push("/login")}
            onDismiss={() => setModal(null)}
          />
        )}
      </AnimatePresence>
    </main>
  )
}
