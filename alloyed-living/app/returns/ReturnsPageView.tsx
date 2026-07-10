"use client"

import { useState, useId } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRight, CheckCircle, Package, RotateCcw, AlertCircle, X, ChevronDown,
} from "lucide-react"
import Link from "next/link"
import Header from "@/src/components/layout/Header"
import type { ReturnsPageContent } from "@/src/lib/data/types"

// ── Design tokens ─────────────────────────────────────────────────────────────
const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}
const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]
const SPRING_HOVER = { type: "spring", stiffness: 300, damping: 28 } as const

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
}
const itemVar = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_CINEMATIC } },
}

// Splits "Hassle-Free Returns." into a lead line and an emphasised last word,
// matching the original two-line editorial hero treatment.
function splitHeroTitle(title: string): { lead: string; emphasis: string } {
  const words = title.trim().split(" ")
  const emphasis = words.pop() ?? ""
  return { lead: words.join(" "), emphasis }
}

// ── Static demo data — not admin-managed content, just the interactive mock ──
const MOCK_ITEMS = [
  { id: "i1", name: "Meridian Brass Side Table", material: "Solid Brass & Walnut", price: "PKR 186,000" },
  { id: "i2", name: "Onyx Console Cabinet",      material: "Matte Black Steel",    price: "PKR 274,000" },
] as const

const RETURN_REASONS = [
  "Changed my mind",
  "Item arrived damaged",
  "Wrong item received",
  "Not as described",
  "Quality concern",
  "Ordered by mistake",
] as const

// ── Shared floating label input ────────────────────────────────────────────────
function FloatingInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label:    string
  value:    string
  onChange: (v: string) => void
  type?:    string
}) {
  const id                    = useId()
  const [focused, setFocused] = useState(false)
  const lifted                = focused || value.length > 0

  return (
    <div className="relative pt-5">
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`
          w-full bg-transparent py-2 pr-2 text-[13px] text-stone-700 tracking-[0.02em]
          border-b outline-none transition-colors duration-400
          ${focused ? "border-stone-500" : "border-stone-200"}
        `}
      />
      <motion.label
        htmlFor={id}
        animate={
          lifted
            ? { y: -20, scale: 0.78, color: focused ? "#57534e" : "#a8a29e" }
            : { y: 0,   scale: 1,    color: "#a8a29e" }
        }
        transition={{ ease: EASE_CINEMATIC, duration: 0.26 }}
        style={{ originX: 0 }}
        className="absolute left-0 top-[1.62rem] text-[13px] pointer-events-none"
      >
        {label}
      </motion.label>
    </div>
  )
}

// ── Step Tracker ───────────────────────────────────────────────────────────────
function StepTracker({ steps }: { steps: ReturnsPageContent["steps"] }) {
  return (
    <motion.div
      className="relative"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {/* Horizontal connector line visible on desktop */}
      <div className="hidden md:block absolute top-8 left-0 right-0 h-px bg-stone-100" aria-hidden />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 relative">
        {steps.map((step, i) => (
          <motion.div key={step.n} variants={itemVar} className="flex flex-col gap-4">
            {/* Number box */}
            <div className="relative flex items-center justify-center w-16 h-16 bg-[#faf9f7] border border-stone-100 self-start">
              <span
                style={EDITORIAL}
                className="text-[1.5rem] font-light text-stone-200 leading-none select-none"
              >
                {step.n}
              </span>

              {/* Vertical connector between steps on mobile */}
              {i < steps.length - 1 && (
                <div className="md:hidden absolute -bottom-[2.55rem] left-1/2 -translate-x-1/2 w-px h-10 bg-stone-100" />
              )}
            </div>

            <div>
              <p className="text-[7.5px] tracking-[0.46em] uppercase text-stone-600 mb-1.5">
                {step.label}
              </p>
              <p className="text-[11px] text-stone-600 leading-relaxed max-w-[13rem]">
                {step.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// ── Return Portal (multi-step) ─────────────────────────────────────────────────
type PortalStep = "lookup" | "select" | "confirm"

function ReturnPortal() {
  const [step,     setStep]     = useState<PortalStep>("lookup")
  const [orderId,  setOrderId]  = useState("")
  const [email,    setEmail]    = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [reason,   setReason]   = useState("")
  const [loading,  setLoading]  = useState(false)

  // Stable label computed once on mount
  const [returnLabel] = useState(
    () => "RL-" + Math.random().toString(36).slice(2, 8).toUpperCase()
  )

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!orderId.trim() || !email.trim()) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1400))
    setLoading(false)
    setStep("select")
  }

  async function handleSubmitReturn() {
    if (!selected.length || !reason) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    setLoading(false)
    setStep("confirm")
  }

  function reset() {
    setStep("lookup")
    setOrderId("")
    setEmail("")
    setSelected([])
    setReason("")
  }

  function toggleItem(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="bg-[#f7f5f2] border border-stone-100 p-8 md:p-10">
      <p className="text-[7.5px] tracking-[0.5em] uppercase text-stone-600 mb-8">Return Portal</p>

      <AnimatePresence mode="wait">

        {/* ── Step 1: Order Lookup ── */}
        {step === "lookup" && (
          <motion.form
            key="lookup"
            onSubmit={handleLookup}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{   opacity: 0, x:  14 }}
            transition={{ duration: 0.32, ease: EASE_CINEMATIC }}
            className="flex flex-col gap-8"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <FloatingInput
                label="Order Number"
                value={orderId}
                onChange={setOrderId}
              />
              <FloatingInput
                label="Email Address"
                value={email}
                onChange={setEmail}
                type="email"
              />
            </div>

            <p className="text-[10px] text-stone-600 leading-relaxed bg-stone-50 border border-stone-100 p-4">
              Your order number appears in your confirmation email or SMS.{" "}
              <span className="text-stone-700">For demo purposes, enter any text and email.</span>
            </p>

            <motion.button
              type="submit"
              disabled={loading || !orderId.trim() || !email.trim()}
              whileHover={{ scale: 1.01, transition: SPRING_HOVER }}
              whileTap={{ scale: 0.99 }}
              className="group self-start inline-flex items-center gap-4 bg-stone-900 text-white
                         px-8 py-4 text-[8px] tracking-[0.44em] uppercase
                         disabled:opacity-40 disabled:cursor-not-allowed
                         hover:bg-stone-700 transition-colors duration-400 cursor-pointer"
            >
              {loading ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                  className="w-3 h-3 border border-white/40 border-t-white rounded-full block"
                />
              ) : (
                <>
                  Find Order
                  <ArrowRight
                    size={10}
                    strokeWidth={1.5}
                    className="group-hover:translate-x-1 transition-transform duration-400"
                  />
                </>
              )}
            </motion.button>
          </motion.form>
        )}

        {/* ── Step 2: Item Selection ── */}
        {step === "select" && (
          <motion.div
            key="select"
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{   opacity: 0, x: -14 }}
            transition={{ duration: 0.32, ease: EASE_CINEMATIC }}
          >
            {/* Order summary header */}
            <div className="mb-7 p-4 bg-white border border-stone-100 flex items-center justify-between">
              <div>
                <p className="text-[7.5px] tracking-[0.32em] uppercase text-stone-600">Order Found</p>
                <p style={EDITORIAL} className="text-[1rem] font-light text-stone-800 mt-0.5">
                  {orderId || "AL-2024-00123"} · 14 June 2026
                </p>
              </div>
              <button
                onClick={reset}
                aria-label="Start over"
                className="text-stone-500 hover:text-stone-700 transition-colors duration-300 cursor-pointer"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>

            <p className="text-[7.5px] tracking-[0.46em] uppercase text-stone-600 mb-4">
              Select Item(s) to Return
            </p>

            {/* Selectable item cards */}
            <div className="space-y-2.5 mb-7">
              {MOCK_ITEMS.map((it) => {
                const checked = selected.includes(it.id)
                return (
                  <motion.label
                    key={it.id}
                    whileHover={{ x: 2, transition: SPRING_HOVER }}
                    className="flex items-center gap-4 p-4 bg-white border cursor-pointer
                               transition-colors duration-300"
                    style={{ borderColor: checked ? "#5c6b4a" : "#e7e5e4" }}
                  >
                    {/* Custom animated checkbox */}
                    <div
                      className="w-5 h-5 border flex items-center justify-center flex-shrink-0
                                 transition-colors duration-300"
                      style={{
                        borderColor:     checked ? "#5c6b4a" : "#d6d3d1",
                        backgroundColor: checked ? "#f0f2ec" : "transparent",
                      }}
                    >
                      <AnimatePresence>
                        {checked && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{   scale: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: EASE_CINEMATIC }}
                          >
                            <CheckCircle size={11} strokeWidth={2} className="text-[#5c6b4a]" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleItem(it.id)}
                    />

                    <div className="flex-1 min-w-0">
                      <p style={EDITORIAL} className="text-[0.88rem] font-light text-stone-800 leading-snug">
                        {it.name}
                      </p>
                      <p className="text-[8.5px] tracking-[0.22em] uppercase text-stone-600 mt-0.5">
                        {it.material}
                      </p>
                    </div>

                    <p className="text-[10px] tracking-[0.08em] text-stone-700 flex-shrink-0">
                      {it.price}
                    </p>
                  </motion.label>
                )
              })}
            </div>

            {/* Reason dropdown */}
            <div className="relative border-b border-stone-300 mb-8">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-transparent py-3 pr-8 text-[12px] text-stone-700
                           outline-none cursor-pointer appearance-none tracking-[0.02em]"
              >
                <option value="">Select a reason for return…</option>
                {RETURN_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown
                size={12}
                strokeWidth={1.5}
                className="absolute right-1 top-3.5 text-stone-600 pointer-events-none"
              />
            </div>

            <motion.button
              onClick={handleSubmitReturn}
              disabled={!selected.length || !reason || loading}
              whileHover={{ scale: 1.01, transition: SPRING_HOVER }}
              whileTap={{ scale: 0.99 }}
              className="group inline-flex items-center gap-4 bg-stone-900 text-white
                         px-8 py-4 text-[8px] tracking-[0.44em] uppercase
                         disabled:opacity-40 disabled:cursor-not-allowed
                         hover:bg-stone-700 transition-colors duration-400 cursor-pointer"
            >
              {loading ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                  className="w-3 h-3 border border-white/40 border-t-white rounded-full block"
                />
              ) : (
                <>
                  Submit Return Request
                  <ArrowRight
                    size={10}
                    strokeWidth={1.5}
                    className="group-hover:translate-x-1 transition-transform duration-400"
                  />
                </>
              )}
            </motion.button>
          </motion.div>
        )}

        {/* ── Step 3: Confirmation ── */}
        {step === "confirm" && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE_CINEMATIC }}
            className="text-center py-6"
          >
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.12 }}
              className="w-16 h-16 rounded-full bg-[#f0f2ec] border border-[#c8d4bc]
                         flex items-center justify-center mx-auto mb-8"
            >
              <CheckCircle size={22} strokeWidth={1.3} className="text-[#5c6b4a]" />
            </motion.div>

            <p style={EDITORIAL} className="text-[2rem] font-light text-stone-800 mb-2">
              Request Submitted
            </p>
            <p className="text-[7.5px] tracking-[0.44em] uppercase text-stone-600 mb-8">
              Return Label:{" "}
              <span className="text-stone-700 font-medium">{returnLabel}</span>
            </p>
            <p className="text-[11px] text-stone-700 leading-relaxed max-w-sm mx-auto mb-10">
              A prepaid return label has been sent to{" "}
              <span className="text-stone-700">{email}</span>. Please drop off your package
              within 7 days. Our team will confirm receipt within 24 hours.
            </p>

            <button
              onClick={reset}
              className="text-[8px] tracking-[0.4em] uppercase text-stone-600 border-b border-stone-200 pb-0.5
                         hover:text-stone-800 hover:border-stone-600 transition-colors duration-400 cursor-pointer"
            >
              Start Another Return
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

// ── Policy Tabs ────────────────────────────────────────────────────────────────
function PolicySection({ policies }: { policies: ReturnsPageContent["policies"] }) {
  const [active, setActive] = useState(policies[0]?.id ?? "")
  const policy = policies.find((p) => p.id === active) ?? policies[0]

  return (
    <div>
      <motion.div
        className="mb-14"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: EASE_CINEMATIC }}
      >
        <span className="block text-[7.5px] tracking-[0.52em] uppercase text-stone-600 mb-3">
          Return Policies
        </span>
        <h2
          style={EDITORIAL}
          className="text-[clamp(1.9rem,3.5vw,3.2rem)] font-light text-stone-900 leading-tight"
        >
          Your Options, Explained
        </h2>
      </motion.div>

      {/* Tab strip with animated underline via layoutId */}
      <motion.div
        className="relative flex border-b border-stone-100 mb-10"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE_CINEMATIC }}
      >
        {policies.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p.id)}
            className={`
              relative flex items-center gap-2 px-5 py-4 text-[7.5px] tracking-[0.4em] uppercase
              transition-colors duration-300 cursor-pointer
              ${active === p.id ? "text-stone-900" : "text-stone-600 hover:text-stone-600"}
            `}
          >
            {p.label}
            {p.badge && (
              <span
                className="hidden sm:block text-[6px] tracking-[0.18em] uppercase
                           px-1.5 py-0.5 bg-[#5c6b4a] text-white leading-tight"
              >
                {p.badge}
              </span>
            )}
            {active === p.id && (
              <motion.div
                layoutId="policy-underline"
                className="absolute bottom-0 inset-x-0 h-px bg-stone-900"
                transition={{ ease: EASE_CINEMATIC, duration: 0.4 }}
              />
            )}
          </button>
        ))}
      </motion.div>

      {/* Panel — fades between tabs */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{   opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: EASE_CINEMATIC }}
          className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20"
        >
          {/* Eligibility conditions */}
          <div>
            <p className="text-[7.5px] tracking-[0.46em] uppercase text-stone-600 mb-6">
              Eligibility Conditions
            </p>
            <ul className="space-y-4">
              {policy.conditions.map((c, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-4 h-4 border border-stone-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-1 h-1 rounded-full bg-stone-400" />
                  </div>
                  <p className="text-[11.5px] text-stone-700 leading-relaxed">{c}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Notes + caveat */}
          <div className="flex flex-col gap-5">
            <div className="p-6 bg-[#f7f5f2] border border-stone-100">
              <p className="text-[7.5px] tracking-[0.42em] uppercase text-stone-600 mb-3">
                Important Note
              </p>
              <p className="text-[11.5px] text-stone-600 leading-relaxed">{policy.note}</p>
            </div>

            <div className="flex items-start gap-3 p-4 border border-amber-100/70 bg-amber-50/30">
              <AlertCircle size={11} strokeWidth={1.5} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-stone-700 leading-relaxed">
                Custom, made-to-order, and final-sale items are excluded from all return and exchange policies.
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  RETURNS PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function ReturnsPageView({ content }: { content: ReturnsPageContent }) {
  const { lead, emphasis } = splitHeroTitle(content.heroTitle)

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#faf9f7] pt-24 md:pt-28">

        {/* ════ Hero ════════════════════════════════════════════════════════ */}
        <section
          className="px-6 md:px-16 py-28 md:py-40 border-b border-stone-100"
          aria-label="Returns hero"
        >
          <div className="max-w-5xl">
            <motion.span
              className="block text-[8px] tracking-[0.58em] uppercase text-stone-600 mb-7"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_CINEMATIC, delay: 0.1 }}
            >
              Returns & Exchanges
            </motion.span>

            <motion.h1
              style={EDITORIAL}
              className="text-[clamp(3rem,8vw,7rem)] font-light text-stone-900
                         leading-[0.93] tracking-[-0.01em] mb-10 max-w-3xl"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, ease: EASE_CINEMATIC, delay: 0.22 }}
            >
              {lead}
              <br />
              <em className="not-italic font-extralight italic text-stone-700">{emphasis}</em>
            </motion.h1>

            <motion.div
              className="w-16 h-px bg-stone-200 mb-14"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.9, ease: EASE_CINEMATIC, delay: 0.58 }}
              style={{ transformOrigin: "left" }}
            />

            <motion.p
              style={EDITORIAL}
              className="text-[clamp(0.95rem,1.4vw,1.08rem)] font-light italic text-stone-700
                         max-w-sm leading-relaxed"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_CINEMATIC, delay: 0.46 }}
            >
              {content.heroSubtitle}
            </motion.p>
          </div>
        </section>

        {/* ════ Process Steps ═══════════════════════════════════════════════ */}
        <section className="px-6 md:px-16 py-24 md:py-32 border-b border-stone-100">
          <motion.div
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: EASE_CINEMATIC }}
          >
            <span className="block text-[7.5px] tracking-[0.52em] uppercase text-stone-600 mb-3">
              How It Works
            </span>
            <h2
              style={EDITORIAL}
              className="text-[clamp(1.9rem,3.5vw,3.2rem)] font-light text-stone-900 leading-tight"
            >
              The Return Process
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: EASE_CINEMATIC, delay: 0.1 }}
          >
            <StepTracker steps={content.steps} />
          </motion.div>
        </section>

        {/* ════ Return Portal ═══════════════════════════════════════════════ */}
        <section className="px-6 md:px-16 py-24 md:py-32 border-b border-stone-100">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-14 lg:gap-24">

            {/* Left — explainer copy */}
            <motion.div
              className="flex flex-col gap-6 justify-start"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: EASE_CINEMATIC }}
            >
              <span className="block text-[7.5px] tracking-[0.52em] uppercase text-stone-600">
                Initiate a Return
              </span>
              <h2
                style={EDITORIAL}
                className="text-[clamp(1.9rem,3vw,2.8rem)] font-light text-stone-900 leading-tight"
              >
                Start Your Return or Exchange
              </h2>
              <div className="w-10 h-px bg-stone-200" />
              <p className="text-[11.5px] text-stone-600 leading-relaxed max-w-xs">
                Enter your order number and registered email to locate your order, then select the items you wish to return or exchange.
              </p>

              <ul className="space-y-3 mt-2">
                {[
                  { Icon: CheckCircle, text: "Prepaid return labels emailed instantly" },
                  { Icon: Package,     text: "Free collection for White Glove orders"  },
                  { Icon: RotateCcw,   text: `Refunds processed in 5–7 business days`  },
                ].map(({ Icon, text }) => (
                  <li key={text} className="flex items-center gap-3">
                    <Icon size={11} strokeWidth={1.5} className="text-[#5c6b4a] flex-shrink-0" />
                    <p className="text-[10px] tracking-[0.06em] text-stone-600">{text}</p>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Right — interactive portal */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: EASE_CINEMATIC, delay: 0.1 }}
            >
              <ReturnPortal />
            </motion.div>
          </div>
        </section>

        {/* ════ Policy Breakdown ════════════════════════════════════════════ */}
        <section className="px-6 md:px-16 py-24 md:py-36 border-b border-stone-100">
          <PolicySection policies={content.policies} />
        </section>

        {/* ════ Bottom CTA ══════════════════════════════════════════════════ */}
        <section className="px-6 md:px-16 py-20">
          <motion.div
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 max-w-4xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, ease: EASE_CINEMATIC }}
          >
            <div>
              <p className="text-[7.5px] tracking-[0.5em] uppercase text-stone-600 mb-2">
                Need Assistance?
              </p>
              <p
                style={EDITORIAL}
                className="text-[clamp(1rem,1.5vw,1.25rem)] font-light text-stone-700 leading-snug"
              >
                Our support team is available Mon–Sat, 10 AM – 7 PM (PKT).
              </p>
            </div>

            <div className="flex gap-4 flex-wrap">
              <Link
                href="/contact"
                className="group inline-flex items-center gap-3 border border-stone-800
                           px-8 py-3.5 text-[8px] tracking-[0.44em] uppercase text-stone-800
                           hover:bg-stone-900 hover:text-stone-100 transition-all duration-500"
              >
                Contact Us
                <ArrowRight
                  size={10}
                  strokeWidth={1.5}
                  className="group-hover:translate-x-1 transition-transform duration-400"
                />
              </Link>
              <Link
                href="/shipping"
                className="group inline-flex items-center gap-3 text-[8px] tracking-[0.44em]
                           uppercase text-stone-700 border-b border-stone-200 pb-0.5
                           hover:text-stone-900 hover:border-stone-700 transition-colors duration-400"
              >
                Shipping Info
                <ArrowRight
                  size={10}
                  strokeWidth={1.5}
                  className="group-hover:translate-x-1 transition-transform duration-400"
                />
              </Link>
            </div>
          </motion.div>
        </section>

      </main>
    </>
  )
}
