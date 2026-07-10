"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MapPin, Phone, Clock, Flame } from "lucide-react"
import Header from "@/src/components/layout/Header"
import type { FactoryLocationPageContent } from "@/src/lib/data/types"

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

// Splits "Where It's Forged." into a lead line and an emphasised last word,
// matching the site's two-line editorial hero treatment.
function splitHeroTitle(title: string): { lead: string; emphasis: string } {
  const words = title.trim().split(" ")
  const emphasis = words.pop() ?? ""
  return { lead: words.join(" "), emphasis }
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function FactoryLocationPageView({ content }: { content: FactoryLocationPageContent }) {
  const { lead, emphasis } = splitHeroTitle(content.heroTitle)
  const [mapLoaded, setMapLoaded] = useState(false)

  return (
    <>
      {/* Warm up the connection to Google's map servers early so the embed appears faster. */}
      <link rel="preconnect" href="https://www.google.com" />
      <link rel="preconnect" href="https://maps.google.com" />
      <link rel="preconnect" href="https://maps.gstatic.com" crossOrigin="" />

      <Header />

      <main className="min-h-screen bg-[#f8f6f3]">
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
                Factory Location
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

            {/* Location details */}
            <motion.div className="flex flex-col gap-5" {...fadeUp(0.38)}>
              <span className="text-[7.5px] tracking-[0.44em] uppercase text-stone-300">
                Visit The Workshop
              </span>

              <div className="flex items-start gap-4 text-[0.82rem] text-stone-100">
                <span
                  className="w-8 h-8 rounded-full border border-stone-700 flex items-center justify-center
                             shrink-0"
                >
                  <MapPin size={13} strokeWidth={1.5} />
                </span>
                <span className="leading-relaxed pt-1.5">{content.address}</span>
              </div>

              <a
                href={`tel:${content.phone.replace(/\s+/g, "")}`}
                className="group inline-flex items-center gap-4
                           text-[0.82rem] text-stone-100
                           hover:text-white transition-colors duration-400"
              >
                <span
                  className="w-8 h-8 rounded-full border border-stone-700 flex items-center justify-center
                             group-hover:border-stone-400 transition-colors duration-400 shrink-0"
                >
                  <Phone size={13} strokeWidth={1.5} />
                </span>
                {content.phone}
              </a>

              <div className="flex items-center gap-4 text-[0.78rem] text-stone-200">
                <span className="w-8 h-8 rounded-full border border-stone-700 flex items-center justify-center shrink-0">
                  <Clock size={13} strokeWidth={1.5} />
                </span>
                {content.hours}
              </div>

              <div className="flex items-center gap-4 text-[0.78rem] text-stone-200 mt-2 pt-6 border-t border-stone-800">
                <span className="w-8 h-8 rounded-full border border-stone-700 flex items-center justify-center shrink-0">
                  <Flame size={13} strokeWidth={1.5} />
                </span>
                We make every piece from strong steel, right here.
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

          {/* ──── Right panel: Map ──── */}
          <div className="w-full lg:flex-1 relative min-h-[420px] lg:min-h-0 bg-stone-100">
            <AnimatePresence>
              {!mapLoaded && (
                <motion.div
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE_CINEMATIC }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-stone-100"
                >
                  <div className="w-9 h-9 rounded-full border-2 border-stone-300 border-t-stone-600 animate-spin" />
                  <p className="text-[9px] tracking-[0.3em] uppercase text-stone-600">Loading Map</p>
                </motion.div>
              )}
            </AnimatePresence>
            <iframe
              title="Alloyed Living Factory Location"
              src={content.mapEmbedUrl}
              className="absolute inset-0 w-full h-full border-0 grayscale-[15%] contrast-[1.05]"
              referrerPolicy="no-referrer-when-downgrade"
              onLoad={() => setMapLoaded(true)}
            />
          </div>
        </div>
      </main>
    </>
  )
}
