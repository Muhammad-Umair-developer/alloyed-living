"use client"

import { useState, useId, type ChangeEvent, type FocusEvent } from "react"
import { motion } from "framer-motion"
import { ArrowRight, Mail, MessageCircle, Clock } from "lucide-react"
import Header from "@/src/components/layout/Header"
import type { ContactPageContent } from "@/src/lib/data/types"
import { sendContactMessageAction } from "@/src/actions/contact-actions"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── Design tokens ──────────────────────────────────────────────────────────────
const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}
const SPRING = { type: "spring", stiffness: 40, damping: 22 } as const
const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { ...SPRING, delay },
  }
}

// Splits "Let's Talk." into a lead line and an emphasised last word,
// matching the original two-line editorial hero treatment.
function splitHeroTitle(title: string): { lead: string; emphasis: string } {
  const words = title.trim().split(" ")
  const emphasis = words.pop() ?? ""
  return { lead: words.join(" "), emphasis }
}

// ── Floating Label Input ───────────────────────────────────────────────────────
interface FloatingInputProps {
  label: string
  type?: string
  name: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  delay?: number
}

function FloatingInput({
  label,
  type = "text",
  name,
  value,
  onChange,
  delay = 0,
}: FloatingInputProps) {
  const [focused, setFocused] = useState(false)
  const id = useId()
  const lifted = focused || value.length > 0

  return (
    <motion.div className="relative" {...fadeUp(delay)}>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        autoComplete="off"
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={(e: FocusEvent<HTMLInputElement>) =>
          setFocused(e.target.value.length > 0)
        }
        className="peer w-full bg-transparent border-b border-stone-300
                   pt-6 pb-2.5 px-0 text-[0.9rem] text-stone-900
                   outline-none caret-stone-700
                   focus:border-stone-700
                   transition-colors duration-500 placeholder-transparent"
        placeholder={label}
      />
      <label
        htmlFor={id}
        className="absolute left-0 top-0 pointer-events-none select-none
                   transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          ...EDITORIAL,
          fontSize: lifted ? "0.62rem" : "0.9rem",
          letterSpacing: lifted ? "0.28em" : "0.04em",
          top: lifted ? "0px" : "22px",
          textTransform: lifted ? "uppercase" : "none",
          color: focused ? "#1c1917" : "#78716c",
        }}
      >
        {label}
      </label>
      <motion.div
        className="absolute bottom-0 left-0 h-px bg-stone-800"
        animate={{ scaleX: focused ? 1 : 0 }}
        initial={{ scaleX: 0 }}
        transition={{ duration: 0.45, ease: EASE_CINEMATIC }}
        style={{ transformOrigin: "left", width: "100%" }}
      />
    </motion.div>
  )
}

// ── Floating Label Textarea ────────────────────────────────────────────────────
interface FloatingTextareaProps {
  label: string
  name: string
  value: string
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
  delay?: number
}

function FloatingTextarea({
  label,
  name,
  value,
  onChange,
  delay = 0,
}: FloatingTextareaProps) {
  const [focused, setFocused] = useState(false)
  const id = useId()
  const lifted = focused || value.length > 0

  return (
    <motion.div className="relative" {...fadeUp(delay)}>
      <textarea
        id={id}
        name={name}
        value={value}
        rows={5}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={(e: FocusEvent<HTMLTextAreaElement>) =>
          setFocused(e.target.value.length > 0)
        }
        className="peer w-full bg-transparent border-b border-stone-300
                   pt-6 pb-2.5 px-0 text-[0.9rem] text-stone-900
                   outline-none caret-stone-700 resize-none leading-relaxed
                   focus:border-stone-700
                   transition-colors duration-500 placeholder-transparent"
        placeholder={label}
      />
      <label
        htmlFor={id}
        className="absolute left-0 pointer-events-none select-none
                   transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          ...EDITORIAL,
          fontSize: lifted ? "0.62rem" : "0.9rem",
          letterSpacing: lifted ? "0.28em" : "0.04em",
          top: lifted ? "0px" : "22px",
          textTransform: lifted ? "uppercase" : "none",
          color: focused ? "#1c1917" : "#78716c",
        }}
      >
        {label}
      </label>
      <motion.div
        className="absolute bottom-0 left-0 h-px bg-stone-800"
        animate={{ scaleX: focused ? 1 : 0 }}
        initial={{ scaleX: 0 }}
        transition={{ duration: 0.45, ease: EASE_CINEMATIC }}
        style={{ transformOrigin: "left", width: "100%" }}
      />
    </motion.div>
  )
}

// ── Contact Form ───────────────────────────────────────────────────────────────
function ContactForm() {
  const [fields, setFields] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  })
  const [submitted, setSubmitted] = useState(false)
  const [status, setStatus] = useState<"idle" | "sending">("idle")
  const [error, setError] = useState<string | null>(null)

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    if (error) setError(null)
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const name = fields.name.trim()
    const email = fields.email.trim()
    const message = fields.message.trim()
    if (!name || !email || !message) {
      setError("Please fill in your name, email, and message.")
      return
    }
    if (!EMAIL_RE.test(email)) {
      setError("Please enter a valid email address.")
      return
    }

    setStatus("sending")
    const result = await sendContactMessageAction(fields)
    if (result.ok) {
      setSubmitted(true)
    } else {
      setError(result.error ?? "Something went wrong. Please try again.")
      setStatus("idle")
    }
  }

  if (submitted) {
    return (
      <motion.div
        className="flex flex-col items-start justify-center min-h-[380px] gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
      >
        <div className="w-10 h-px bg-stone-800" />
        <h3
          style={EDITORIAL}
          className="text-[clamp(1.8rem,3vw,2.6rem)] font-light text-stone-900 leading-tight"
        >
          Message Received.
        </h3>
        <p className="text-[0.85rem] text-stone-600 leading-relaxed max-w-xs">
          We will get back to you within one working day. Thank you for reaching out.
        </p>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      <FloatingInput
        label="Full Name"
        name="name"
        value={fields.name}
        onChange={handleChange}
        delay={0.28}
      />
      <FloatingInput
        label="Email Address"
        type="email"
        name="email"
        value={fields.email}
        onChange={handleChange}
        delay={0.38}
      />
      <FloatingInput
        label="Phone Number"
        type="tel"
        name="phone"
        value={fields.phone}
        onChange={handleChange}
        delay={0.48}
      />
      <FloatingTextarea
        label="Your Message or Query"
        name="message"
        value={fields.message}
        onChange={handleChange}
        delay={0.58}
      />

      {error && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          className="-mt-4 text-[0.72rem] tracking-[0.02em] text-red-700/80 leading-relaxed"
        >
          {error}
        </motion.p>
      )}

      <motion.div {...fadeUp(0.7)}>
        <button
          type="submit"
          disabled={status === "sending"}
          className="group inline-flex items-center gap-4
                     bg-stone-900 text-white
                     px-10 py-4 text-[8.5px] tracking-[0.44em] uppercase
                     hover:bg-stone-700 disabled:opacity-60 disabled:cursor-not-allowed
                     transition-colors duration-500 mt-2"
        >
          {status === "sending" ? "Sending" : "Send Message"}
          <ArrowRight
            size={11}
            strokeWidth={1.5}
            className="translate-x-0 group-hover:translate-x-2 transition-transform duration-500"
          />
        </button>
      </motion.div>
    </form>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ContactPageView({ content }: { content: ContactPageContent }) {
  const { lead, emphasis } = splitHeroTitle(content.heroTitle)

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#f8f6f3]">

        {/* ── Two-column layout ── */}
        <div className="flex flex-col lg:flex-row min-h-screen">

          {/* ──── Left panel: Header + info ──── */}
          <div
            className="w-full lg:w-[42%] bg-stone-900 text-white
                       px-8 md:px-14 pt-36 pb-20
                       flex flex-col justify-between gap-16"
          >
            {/* Header copy */}
            <div className="flex flex-col gap-6">
              <motion.span
                className="block text-[8px] tracking-[0.52em] uppercase text-stone-200"
                {...fadeUp(0.05)}
              >
                Get in Touch
              </motion.span>

              <motion.h1
                style={EDITORIAL}
                className="text-[clamp(3rem,6vw,5.5rem)] font-light leading-[0.95]
                           tracking-[0.03em] text-white"
                {...fadeUp(0.14)}
              >
                {lead}
                <br />
                <em className="not-italic italic font-extralight text-stone-100">
                  {emphasis}
                </em>
              </motion.h1>

              <motion.div
                className="w-10 h-px bg-stone-600 mt-2"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.9, ease: EASE_CINEMATIC, delay: 0.35 }}
                style={{ transformOrigin: "left" }}
              />

              <motion.p
                style={EDITORIAL}
                className="text-[clamp(1rem,1.4vw,1.12rem)] font-light italic
                           text-stone-100 max-w-xs leading-relaxed mt-2"
                {...fadeUp(0.24)}
              >
                {content.heroSubtitle}
              </motion.p>
            </div>

            {/* Alternative contact links */}
            <motion.div className="flex flex-col gap-5" {...fadeUp(0.38)}>
              <span className="text-[7.5px] tracking-[0.44em] uppercase text-stone-300">
                Or reach us directly
              </span>

              <a
                href={`mailto:${content.email}`}
                className="group inline-flex items-center gap-4
                           text-[0.82rem] text-stone-100
                           hover:text-white transition-colors duration-400"
              >
                <span
                  className="w-8 h-8 rounded-full border border-stone-700 flex items-center justify-center
                             group-hover:border-stone-400 transition-colors duration-400 shrink-0"
                >
                  <Mail size={13} strokeWidth={1.5} />
                </span>
                {content.email}
              </a>

              <a
                href={content.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-4
                           text-[0.82rem] text-stone-100
                           hover:text-white transition-colors duration-400"
              >
                <span
                  className="w-8 h-8 rounded-full border border-stone-700 flex items-center justify-center
                             group-hover:border-stone-400 transition-colors duration-400 shrink-0"
                >
                  <MessageCircle size={13} strokeWidth={1.5} />
                </span>
                WhatsApp Chat
              </a>

              <div className="flex items-center gap-4 text-[0.78rem] text-stone-200">
                <span className="w-8 h-8 rounded-full border border-stone-700 flex items-center justify-center shrink-0">
                  <Clock size={13} strokeWidth={1.5} />
                </span>
                {content.hours}
              </div>
            </motion.div>
          </div>

          {/* Vertical divider — desktop */}
          <motion.div
            className="hidden lg:block w-px bg-stone-200 self-stretch shrink-0"
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease: EASE_CINEMATIC, delay: 0.2 }}
            style={{ transformOrigin: "top" }}
          />

          {/* ──── Right panel: Form ──── */}
          <div
            className="w-full lg:flex-1 bg-[#f8f6f3]
                       px-8 md:px-14 pt-36 pb-20
                       flex flex-col justify-start"
          >
            <motion.div className="mb-12" {...fadeUp(0.18)}>
              <span className="block text-[8px] tracking-[0.46em] uppercase text-stone-700 mb-3">
                Send a Message
              </span>
              <h2
                style={EDITORIAL}
                className="text-[clamp(1.5rem,2.4vw,2.2rem)] font-light text-stone-900 leading-tight"
              >
                Fill in the form below
              </h2>
            </motion.div>

            <div className="max-w-md w-full">
              <ContactForm />
            </div>
          </div>
        </div>

      </main>
    </>
  )
}
