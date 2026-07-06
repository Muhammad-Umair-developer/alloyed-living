"use client"

import { useState, useId } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRight, Search, Package, Zap, Truck, Clock, Globe, CheckCircle,
} from "lucide-react"
import Link from "next/link"
import Header from "@/src/components/layout/Header"
import type { ShippingPageContent, ShippingTier } from "@/src/lib/data/types"

// ── Design tokens ─────────────────────────────────────────────────────────────
const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}
const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]
const SPRING_HOVER = { type: "spring", stiffness: 300, damping: 28 } as const

// Stagger variants for tier cards
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
}
const item = {
  hidden:  { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_CINEMATIC } },
}

const TIER_ICONS: Record<string, typeof Package> = {
  "Standard": Package,
  "Express": Zap,
  "White Glove": Truck,
}

// Splits "Delivered with Precision." into a lead line and an emphasised last word,
// matching the original two-line editorial hero treatment.
function splitHeroTitle(title: string): { lead: string; emphasis: string } {
  const words = title.trim().split(" ")
  const emphasis = words.pop() ?? ""
  return { lead: words.join(" "), emphasis }
}

// ── Tracking Input ─────────────────────────────────────────────────────────────
function TrackingInput() {
  const id                    = useId()
  const [value,   setValue]   = useState("")
  const [focused, setFocused] = useState(false)
  const [status,  setStatus]  = useState<null | "found" | "not-found">(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    setStatus(value.trim().length > 3 ? "found" : "not-found")
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <p className="text-[8px] tracking-[0.52em] uppercase text-stone-400 mb-5 text-center">
        Track Your Order
      </p>

      <div className="flex items-end gap-3">
        {/* Input field with animated underline */}
        <div
          className={`flex-1 relative border-b transition-colors duration-400
                      ${focused ? "border-stone-700" : "border-stone-300"}`}
        >
          <label htmlFor={id} className="sr-only">Order number</label>
          <input
            id={id}
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); setStatus(null) }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Order number — e.g. AL-2024-00123"
            className="w-full bg-transparent py-3 pr-3 text-[12px] text-stone-700
                       tracking-[0.02em] outline-none
                       placeholder:text-stone-300 placeholder:text-[10.5px]"
          />
          <motion.div
            className="absolute bottom-0 left-0 h-px bg-stone-800"
            animate={{ scaleX: focused ? 1 : 0 }}
            initial={{ scaleX: 0 }}
            transition={{ duration: 0.4, ease: EASE_CINEMATIC }}
            style={{ transformOrigin: "left", width: "100%" }}
          />
        </div>

        <motion.button
          type="submit"
          aria-label="Track order"
          whileHover={{ scale: 1.06, transition: SPRING_HOVER }}
          whileTap={{ scale: 0.96 }}
          className="flex-shrink-0 w-10 h-10 bg-stone-900 flex items-center justify-center
                     hover:bg-stone-700 transition-colors duration-300 cursor-pointer"
        >
          <Search size={13} strokeWidth={1.5} className="text-white" />
        </motion.button>
      </div>

      {/* Result states */}
      <AnimatePresence>
        {status === "found" && (
          <motion.div
            key="found"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0,  height: "auto" }}
            exit={{   opacity: 0,          height: 0 }}
            transition={{ duration: 0.35, ease: EASE_CINEMATIC }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex items-start gap-3 p-4 bg-[#f0f2ec] border border-[#c8d4bc]">
              <CheckCircle size={12} strokeWidth={1.5} className="text-[#5c6b4a] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[7.5px] tracking-[0.3em] uppercase text-[#5c6b4a] mb-1">Order Found</p>
                <p className="text-[11px] text-stone-700 leading-relaxed">
                  <span className="font-medium">{value}</span>
                  {" "}· In Transit · Expected delivery in 2–3 business days
                </p>
              </div>
            </div>
          </motion.div>
        )}
        {status === "not-found" && (
          <motion.div
            key="not-found"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0,  height: "auto" }}
            exit={{   opacity: 0,          height: 0 }}
            transition={{ duration: 0.35, ease: EASE_CINEMATIC }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-4 bg-stone-50 border border-stone-200">
              <p className="text-[7.5px] tracking-[0.3em] uppercase text-stone-400 mb-1">No Match Found</p>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Double-check your order number, or{" "}
                <Link
                  href="/contact"
                  className="underline underline-offset-2 hover:text-stone-800 transition-colors duration-300"
                >
                  contact our concierge team
                </Link>
                .
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  )
}

// ── Shipping Tier Card ─────────────────────────────────────────────────────────
function TierCard({ tier }: { tier: ShippingTier }) {
  const Icon = TIER_ICONS[tier.label] ?? Package
  return (
    <motion.article
      variants={item}
      whileHover={{ y: -6, transition: SPRING_HOVER }}
      className="relative group flex flex-col gap-7 bg-[#f7f5f2] border border-stone-100 p-8
                 hover:border-stone-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)]
                 transition-all duration-500 cursor-default"
    >
      {/* Top accent hairline */}
      <div className="absolute top-0 inset-x-8 h-px bg-stone-300/35" />

      {/* Icon row */}
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 border border-stone-200 flex items-center justify-center
                     group-hover:border-stone-400 transition-colors duration-400"
        >
          <Icon size={14} strokeWidth={1.2} className="text-stone-500" />
        </div>
        {tier.freeMsg && (
          <span className="text-[7px] tracking-[0.26em] uppercase text-[#5c6b4a]">
            {tier.freeMsg}
          </span>
        )}
      </div>

      {/* Rate + label */}
      <div>
        <p className="text-[7.5px] tracking-[0.5em] uppercase text-stone-400 mb-2">{tier.label}</p>
        <h3
          style={EDITORIAL}
          className="text-[clamp(1.7rem,2.5vw,2.4rem)] font-light text-stone-900 leading-none"
        >
          {tier.rate}
        </h3>
      </div>

      {/* Window + carrier */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2.5">
          <Clock size={10} strokeWidth={1.5} className="text-stone-400 flex-shrink-0" />
          <span className="text-[11px] tracking-[0.03em] text-stone-600">{tier.window}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Truck size={10} strokeWidth={1.5} className="text-stone-400 flex-shrink-0" />
          <span className="text-[11px] tracking-[0.03em] text-stone-600">{tier.carrier}</span>
        </div>
      </div>

      {/* Note */}
      <div className="border-t border-stone-100/80 pt-5">
        <p className="text-[11px] text-stone-500 leading-relaxed">{tier.note}</p>
      </div>
    </motion.article>
  )
}

// ── FAQ Accordion Item ─────────────────────────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-stone-100 last:border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-6 py-5 text-left cursor-pointer group"
        aria-expanded={open}
      >
        <span
          style={EDITORIAL}
          className="text-[clamp(0.95rem,1.4vw,1.12rem)] font-light text-stone-800
                     leading-snug group-hover:text-stone-950 transition-colors duration-300"
        >
          {q}
        </span>
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.25, ease: EASE_CINEMATIC }}
          className="flex-shrink-0 w-6 h-6 border border-stone-200 flex items-center justify-center
                     group-hover:border-stone-400 transition-colors duration-300"
        >
          <span className="text-stone-400 text-base leading-none select-none">+</span>
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{   height: 0, opacity: 0 }}
            transition={{ duration: 0.38, ease: EASE_CINEMATIC }}
            style={{ overflow: "hidden" }}
          >
            <p className="pb-6 text-[0.83rem] text-stone-600 leading-relaxed max-w-2xl">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  SHIPPING PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function ShippingPageView({ content }: { content: ShippingPageContent }) {
  const { lead, emphasis } = splitHeroTitle(content.heroTitle)

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#faf9f7] pt-24 md:pt-28">

        {/* ════ Hero ════════════════════════════════════════════════════════ */}
        <section
          className="px-6 md:px-16 py-28 md:py-40 text-center border-b border-stone-100"
          aria-label="Shipping hero"
        >
          <motion.span
            className="block text-[8px] tracking-[0.58em] uppercase text-stone-400 mb-7"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_CINEMATIC, delay: 0.1 }}
          >
            Shipping & Delivery
          </motion.span>

          <motion.h1
            style={EDITORIAL}
            className="text-[clamp(3rem,8vw,7rem)] font-light text-stone-900
                       leading-[0.93] tracking-[-0.01em] mb-10"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: EASE_CINEMATIC, delay: 0.22 }}
          >
            {lead}
            <br />
            <em className="not-italic font-extralight italic text-stone-500">{emphasis}</em>
          </motion.h1>

          <motion.div
            className="w-16 h-px bg-stone-200 mx-auto mb-14"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.9, ease: EASE_CINEMATIC, delay: 0.58 }}
            style={{ transformOrigin: "center" }}
          />

          <motion.p
            style={EDITORIAL}
            className="text-[clamp(0.95rem,1.4vw,1.08rem)] font-light italic text-stone-500
                       max-w-xs mx-auto leading-relaxed mb-16"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_CINEMATIC, delay: 0.46 }}
          >
            {content.heroSubtitle}
          </motion.p>

          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_CINEMATIC, delay: 0.72 }}
          >
            <TrackingInput />
          </motion.div>
        </section>

        {/* ════ Shipping Tiers ══════════════════════════════════════════════ */}
        <section className="px-6 md:px-16 py-24 md:py-36 border-b border-stone-100">
          <motion.div
            className="mb-16 max-w-xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: EASE_CINEMATIC }}
          >
            <span className="block text-[7.5px] tracking-[0.52em] uppercase text-stone-400 mb-3">
              Delivery Options
            </span>
            <h2
              style={EDITORIAL}
              className="text-[clamp(1.9rem,3.5vw,3.2rem)] font-light text-stone-900 leading-tight"
            >
              Choose Your Shipping Tier
            </h2>
          </motion.div>

          {/* Staggered grid */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6"
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {content.tiers.map((tier) => (
              <TierCard key={tier.label} tier={tier} />
            ))}
          </motion.div>

          {/* Free-shipping threshold callout */}
          <motion.div
            className="mt-10 p-5 bg-[#f0f2ec] border border-[#c8d4bc]
                       flex items-start gap-4 max-w-2xl"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, ease: EASE_CINEMATIC, delay: 0.2 }}
          >
            <CheckCircle size={13} strokeWidth={1.5} className="text-[#5c6b4a] mt-0.5 flex-shrink-0" />
            <p className="text-[10.5px] text-stone-600 leading-relaxed">
              <span className="font-medium text-[#5c6b4a] tracking-[0.06em]">
                Complimentary Standard Shipping
              </span>{" "}
              on all orders above PKR {content.freeShippingThreshold.toLocaleString()} — discount applied automatically at checkout.
            </p>
          </motion.div>
        </section>

        {/* ════ International notice ════════════════════════════════════════ */}
        <section className="px-6 md:px-16 py-16 border-b border-stone-100">
          <motion.div
            className="flex flex-col sm:flex-row items-start sm:items-center gap-7 max-w-4xl"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: EASE_CINEMATIC }}
          >
            <div className="w-11 h-11 border border-stone-200 flex items-center justify-center flex-shrink-0">
              <Globe size={15} strokeWidth={1.2} className="text-stone-400" />
            </div>

            <div className="flex-1">
              <p className="text-[7.5px] tracking-[0.5em] uppercase text-stone-400 mb-1.5">
                International Shipping
              </p>
              <p
                style={EDITORIAL}
                className="text-[clamp(0.95rem,1.5vw,1.2rem)] font-light text-stone-700 leading-snug"
              >
                Currently shipping within Pakistan only. International delivery to UAE, UK &amp; USA — coming Q4 2026.
              </p>
            </div>

            <motion.div className="flex-shrink-0" whileHover={{ x: 3, transition: SPRING_HOVER }}>
              <Link
                href="/contact"
                className="group inline-flex items-center gap-2 text-[7.5px] tracking-[0.4em]
                           uppercase text-stone-500 border-b border-stone-300 pb-0.5
                           hover:text-stone-900 hover:border-stone-700 transition-colors duration-400"
              >
                Notify Me{" "}
                <ArrowRight
                  size={9}
                  strokeWidth={1.5}
                  className="group-hover:translate-x-1 transition-transform duration-400"
                />
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* ════ FAQ Accordion ═══════════════════════════════════════════════ */}
        <section className="px-6 md:px-16 py-24 md:py-36">
          <div className="max-w-3xl">
            <motion.div
              className="mb-14"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: EASE_CINEMATIC }}
            >
              <span className="block text-[7.5px] tracking-[0.52em] uppercase text-stone-400 mb-3">
                Policies & FAQ
              </span>
              <h2
                style={EDITORIAL}
                className="text-[clamp(1.9rem,3.5vw,3.2rem)] font-light text-stone-900 leading-tight"
              >
                Common Questions
              </h2>
            </motion.div>

            <motion.div
              className="border-t border-stone-100"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, ease: EASE_CINEMATIC }}
            >
              {content.faqs.map((faq) => (
                <FAQItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </motion.div>

            {/* Bottom CTAs */}
            <motion.div
              className="mt-14 flex flex-wrap gap-5"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, ease: EASE_CINEMATIC, delay: 0.1 }}
            >
              <Link
                href="/contact"
                className="group inline-flex items-center gap-3 border border-stone-800
                           px-8 py-3.5 text-[8px] tracking-[0.44em] uppercase text-stone-800
                           hover:bg-stone-900 hover:text-stone-100 transition-all duration-500"
              >
                Contact Support
                <ArrowRight
                  size={10}
                  strokeWidth={1.5}
                  className="group-hover:translate-x-1 transition-transform duration-400"
                />
              </Link>
              <Link
                href="/returns"
                className="group inline-flex items-center gap-3 text-[8px] tracking-[0.44em]
                           uppercase text-stone-500 border-b border-stone-200 pb-0.5
                           hover:text-stone-900 hover:border-stone-700 transition-colors duration-400"
              >
                Returns & Exchanges
                <ArrowRight
                  size={10}
                  strokeWidth={1.5}
                  className="group-hover:translate-x-1 transition-transform duration-400"
                />
              </Link>
            </motion.div>
          </div>
        </section>

      </main>
    </>
  )
}
