"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useAuth } from "@/src/context/AuthContext"

// Reasonable client-side email shape check (server is the source of truth).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── Constants (shared visual language with /login) ─────────────────────────────

const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}

const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]

// ─── FloatingInput (matches /login) ─────────────────────────────────────────────

interface FloatingInputProps {
  id:            string
  label:         string
  type?:         string
  value:         string
  onChange:      (val: string) => void
  autoComplete?: string
}

function FloatingInput({
  id, label, type = "text", value, onChange, autoComplete,
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
        className="
          w-full bg-transparent
          border-b border-stone-200 pt-6 pb-2
          text-[13px] text-stone-800 tracking-[0.02em]
          outline-none transition-colors duration-300
          pr-7
        "
      />

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

      <motion.div
        animate={{ scaleX: focused ? 1 : 0 }}
        transition={{ duration: 0.36, ease: EASE_CINEMATIC }}
        className="absolute bottom-0 left-0 right-0 h-px bg-stone-800 origin-left"
      />
    </div>
  )
}

// ─── ForgotPasswordPage ─────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
  const { supabase } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [email,   setEmail]   = useState("")
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // Hydration safety gate — mirrors /login.
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const em = email.trim()
    if (!EMAIL_RE.test(em)) {
      setError("Please enter a valid email address.")
      return
    }
    setLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(em, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resetError) throw resetError
      // Always confirm success — never reveal whether the email is registered.
      setSent(true)
    } catch (err) {
      const msg = (err instanceof Error ? err.message : "").toLowerCase()
      if (msg.includes("rate limit") || msg.includes("too many")) {
        setError("Too many attempts. Please wait a moment and try again.")
      } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to")) {
        setError("Network error. Please check your connection and try again.")
      } else {
        setError("Something went wrong. Please try again.")
      }
    } finally {
      setLoading(false)
    }
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
              Reset<br />Password.
            </h1>
            <p className="text-[9px] tracking-[0.32em] uppercase text-stone-600">
              {sent ? "Check your inbox" : "We'll email you a link"}
            </p>
          </motion.div>

          {sent ? (
            /* ── Success state ── */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, ease: EASE_CINEMATIC }}
              className="space-y-8"
            >
              <div className="border border-stone-200 bg-white/70 px-4 py-3">
                <p className="text-[10px] tracking-[0.08em] text-stone-600 leading-relaxed">
                  If an account exists for that address, we&apos;ve sent a reset link.
                  Check your email and follow the link to choose a new password.
                </p>
              </div>
              <Link
                href="/login"
                className="block text-center text-[9px] tracking-[0.18em] text-stone-700
                           underline underline-offset-2 hover:text-stone-900
                           transition-colors duration-500"
              >
                Back to sign in
              </Link>
            </motion.div>
          ) : (
            /* ── Request form ── */
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
                    Sending
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </motion.button>

              <p className="text-center text-[9px] tracking-[0.18em] text-stone-600">
                Remembered it?{" "}
                <Link
                  href="/login"
                  className="text-stone-700 underline underline-offset-2
                             hover:text-stone-900 transition-colors duration-500"
                >
                  Sign in
                </Link>
              </p>
            </motion.form>
          )}

        </div>
      </motion.div>
    </main>
  )
}
