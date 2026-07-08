"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/src/context/AuthContext"
import { isRecoverySession } from "@/src/lib/auth/recovery"

const MIN_PASSWORD = 8
const REDIRECT_DELAY_MS = 4000

// ─── Constants (shared visual language with /login) ─────────────────────────────

const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}

const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]

// ─── FloatingInput (matches /signup) ────────────────────────────────────────────

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

      <label
        htmlFor={id}
        className={`
          absolute left-0 pointer-events-none text-stone-600
          transition-all duration-300
          ${lifted
            ? "top-0 text-[8px] tracking-[0.28em] uppercase text-stone-500"
            : "top-[1.35rem] text-[12px] tracking-wide"
          }
        `}
      >
        {label}
      </label>

      <motion.div
        animate={{ scaleX: focused ? 1 : 0 }}
        transition={{ duration: 0.36, ease: EASE_CINEMATIC }}
        className={`absolute bottom-0 left-0 right-0 h-px origin-left
          ${error ? "bg-red-400" : "bg-stone-800"}`}
      />

      {suffix && (
        <div className="absolute right-0 bottom-[0.6rem]">
          {suffix}
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-[8px] tracking-[0.16em] text-red-400">{error}</p>
      )}
    </div>
  )
}

function EyeToggle({ visible, onToggle, label }: {
  visible: boolean; onToggle: () => void; label: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className="cursor-pointer text-stone-500 hover:text-stone-600 transition-colors duration-300"
    >
      {visible
        ? <EyeOff size={13} strokeWidth={1.5} />
        : <Eye    size={13} strokeWidth={1.5} />
      }
    </button>
  )
}

// ─── Shell (card + brand mark, shared by every state) ───────────────────────────

function Shell({ eyebrow, title, children }: {
  eyebrow: string; title: React.ReactNode; children: React.ReactNode
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6
                     bg-gradient-to-br from-stone-50 via-[#faf9f7] to-stone-100">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-40 w-[580px] h-[580px] rounded-full
                        bg-stone-200/30 blur-[120px]" />
        <div className="absolute -bottom-44 -left-24 w-[500px] h-[500px] rounded-full
                        bg-amber-50/50 blur-[100px]" />
      </div>

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
              {title}
            </h1>
            <p className="text-[9px] tracking-[0.32em] uppercase text-stone-600">
              {eyebrow}
            </p>
          </motion.div>

          {children}
        </div>
      </motion.div>
    </main>
  )
}

// ─── ResetPasswordPage ──────────────────────────────────────────────────────────

type Status = "checking" | "ready" | "invalid" | "done"

export default function ResetPasswordPage() {
  const router = useRouter()
  const { supabase } = useAuth()

  const [mounted,  setMounted]  = useState(false)
  const [status,   setStatus]   = useState<Status>("checking")
  const [password, setPassword] = useState("")
  const [confirm,  setConfirm]  = useState("")
  const [showPwd,  setShowPwd]  = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [loading,  setLoading]  = useState(false)
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
    const leave   = () => { if (!settled) { settled = true; router.replace("/") } }

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

  const confirmError =
    confirm.length > 0 && password !== confirm ? "Passwords do not match" : undefined

  const handleSubmit = async (e: React.FormEvent) => {
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
    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setStatus("done")
      // Sign out of the recovery session and send them to sign in with the new
      // password after a short confirmation.
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
      setLoading(false)
    }
  }

  if (!mounted) return null

  // ── Verifying the link ──
  if (status === "checking") {
    return (
      <Shell eyebrow="One moment" title={<>Reset<br />Password.</>}>
        <div className="flex items-center gap-3 text-stone-500">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="block w-3 h-3 border border-stone-300 border-t-stone-700 rounded-full"
          />
          <span className="text-[9px] tracking-[0.24em] uppercase">Verifying your link</span>
        </div>
      </Shell>
    )
  }

  // ── Expired / invalid link ──
  if (status === "invalid") {
    return (
      <Shell eyebrow="Link expired" title={<>Reset<br />Password.</>}>
        <div className="space-y-8">
          <div className="border border-red-200 bg-red-50/60 px-4 py-3">
            <p className="text-[10px] tracking-[0.08em] text-red-500 leading-relaxed">
              This reset link is invalid or has expired. Reset links are single-use
              and time-limited — please request a fresh one.
            </p>
          </div>
          <Link
            href="/forgot-password"
            className="
              block w-full py-4 text-center
              bg-stone-900 text-white
              text-[9px] tracking-[0.46em] uppercase
              hover:bg-stone-700 transition-colors duration-500
            "
          >
            Request New Link
          </Link>
          <Link
            href="/login"
            className="block text-center text-[9px] tracking-[0.18em] text-stone-700
                       underline underline-offset-2 hover:text-stone-900
                       transition-colors duration-500"
          >
            Back to sign in
          </Link>
        </div>
      </Shell>
    )
  }

  // ── Success ──
  if (status === "done") {
    return (
      <Shell eyebrow="All set" title={<>Password<br />Updated.</>}>
        <div className="border border-stone-200 bg-white/70 px-4 py-3">
          <p className="text-[10px] tracking-[0.08em] text-stone-600 leading-relaxed">
            Your password has been updated. Redirecting you to sign in…
          </p>
        </div>
      </Shell>
    )
  }

  // ── Set a new password ──
  return (
    <Shell eyebrow="Choose a new password" title={<>Reset<br />Password.</>}>
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
          id="password"
          label="New Password"
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
              Updating
            </>
          ) : (
            "Update Password"
          )}
        </motion.button>
      </motion.form>
    </Shell>
  )
}
