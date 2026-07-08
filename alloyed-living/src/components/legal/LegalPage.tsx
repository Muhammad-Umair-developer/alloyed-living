"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { List, ChevronDown } from "lucide-react"
import Header from "@/src/components/layout/Header"

// ── Design tokens (shared with the rest of the storefront) ──────────────────────
const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}
const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]

// ── Content model ───────────────────────────────────────────────────────────────
export interface LegalSubsection {
  title: string
  body: string[]
  /** Mark true when this needs real legal copy — renders a visible placeholder note. */
  placeholder?: boolean
}

export interface LegalSection {
  id: string
  title: string
  body?: string[]
  placeholder?: boolean
  subsections?: LegalSubsection[]
}

export interface LegalPageProps {
  eyebrow: string
  title: string
  lastUpdated: string
  intro?: string
  sections: LegalSection[]
}

// ── Placeholder marker ──────────────────────────────────────────────────────────
// Clearly flags a section that still needs real legal copy. Kept fully visible and
// selectable — it never hides text.
function PlaceholderNote({ label }: { label: string }) {
  return (
    <div className="my-5 border border-dashed border-amber-300 bg-amber-50/60 px-4 py-3">
      <p className="text-[8px] tracking-[0.3em] uppercase text-amber-700 mb-1.5">
        Placeholder — replace with real legal copy
      </p>
      <p className="text-[12px] leading-relaxed text-amber-800/90">
        Insert your finalized <span className="font-medium">{label}</span> text here.
      </p>
    </div>
  )
}

// ── One section block (heading + body + optional subsections) ────────────────────
function SectionBlock({
  section,
  index,
  reduce,
}: {
  section: LegalSection
  index: number
  reduce: boolean
}) {
  return (
    <motion.section
      id={section.id}
      className="scroll-mt-28 md:scroll-mt-32 mb-14 md:mb-20 last:mb-0"
      // When reduced motion is preferred we skip the entrance entirely: the
      // section renders fully visible and static — legal text is never hidden.
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={reduce ? undefined : { duration: 0.55, ease: EASE_CINEMATIC }}
    >
      <h2 className="flex items-baseline gap-3 mb-5">
        <span className="text-[11px] tabular-nums text-stone-600 tracking-[0.1em] pt-1">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          style={EDITORIAL}
          className="text-[clamp(1.5rem,3vw,2.25rem)] font-light text-stone-900 leading-tight"
        >
          {section.title}
        </span>
      </h2>

      <div className="pl-0 sm:pl-8">
        {section.placeholder && <PlaceholderNote label={section.title} />}

        {section.body?.map((para, i) => (
          <p key={i} className="text-[13.5px] leading-[1.85] text-stone-600 mb-4 last:mb-0">
            {para}
          </p>
        ))}

        {section.subsections?.map((sub, i) => (
          <div key={i} className="mt-7 first:mt-6">
            <h3 className="text-[11px] font-medium tracking-[0.18em] uppercase text-stone-500 mb-3">
              {sub.title}
            </h3>
            {sub.placeholder && <PlaceholderNote label={sub.title} />}
            {sub.body.map((para, j) => (
              <p key={j} className="text-[13.5px] leading-[1.85] text-stone-600 mb-4 last:mb-0">
                {para}
              </p>
            ))}
          </div>
        ))}
      </div>
    </motion.section>
  )
}

// ── Legal page shell ─────────────────────────────────────────────────────────────
export default function LegalPage({ eyebrow, title, lastUpdated, intro, sections }: LegalPageProps) {
  const reduce = useReducedMotion() ?? false
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "")
  const [tocOpen, setTocOpen] = useState(false)

  // Scroll-spy: highlight the section currently in view. The TOC itself never
  // animates — only the active-link colour changes instantly.
  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null)
    if (els.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        }
      },
      { rootMargin: "-25% 0px -65% 0px", threshold: 0 },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [sections])

  function jumpTo(e: React.MouseEvent, id: string) {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return
    // Respect reduced motion — no smooth-scroll animation when it's requested.
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
    setActiveId(id)
    setTocOpen(false)
  }

  const activeTitle = sections.find((s) => s.id === activeId)?.title ?? "Contents"

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#faf9f7] pt-24 md:pt-28">
        {/* ════ Hero ════ */}
        <section className="px-6 md:px-16 pt-14 md:pt-20 pb-10 md:pb-14 border-b border-stone-100">
          <div className="mx-auto max-w-6xl">
            <motion.span
              className="block text-[8px] tracking-[0.52em] uppercase text-stone-600 mb-6"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={reduce ? undefined : { duration: 0.6, ease: EASE_CINEMATIC, delay: 0.05 }}
            >
              {eyebrow}
            </motion.span>

            <motion.h1
              style={EDITORIAL}
              className="text-[clamp(2.6rem,7vw,5.5rem)] font-light text-stone-900 leading-[0.95] tracking-[-0.01em]"
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={reduce ? undefined : { duration: 0.8, ease: EASE_CINEMATIC, delay: 0.12 }}
            >
              {title}
            </motion.h1>

            <motion.p
              className="mt-8 text-[10px] tracking-[0.24em] uppercase text-stone-600"
              initial={reduce ? false : { opacity: 0 }}
              animate={reduce ? undefined : { opacity: 1 }}
              transition={reduce ? undefined : { duration: 0.6, ease: EASE_CINEMATIC, delay: 0.3 }}
            >
              Last updated: <span className="text-stone-600">{lastUpdated}</span>
            </motion.p>

            {intro && (
              <p className="mt-6 max-w-2xl text-[13.5px] leading-[1.85] text-stone-600">{intro}</p>
            )}
          </div>
        </section>

        {/* ════ Mobile TOC — collapsible, sticky, instantly usable (no motion) ════ */}
        <div className="lg:hidden sticky top-16 z-30 border-b border-stone-200 bg-[#faf9f7]/95 backdrop-blur-sm">
          <button
            onClick={() => setTocOpen((v) => !v)}
            aria-expanded={tocOpen}
            className="w-full flex items-center justify-between gap-3 px-6 py-3.5 cursor-pointer"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <List size={13} strokeWidth={1.5} className="text-stone-600 shrink-0" />
              <span className="text-[11px] tracking-[0.06em] text-stone-600 truncate">{activeTitle}</span>
            </span>
            <ChevronDown
              size={14}
              strokeWidth={1.5}
              className={`text-stone-600 shrink-0 transition-transform duration-200 ${tocOpen ? "rotate-180" : ""}`}
            />
          </button>
          {tocOpen && (
            <nav aria-label="Table of contents" className="px-6 pb-4 max-h-[60vh] overflow-auto">
              <ol className="space-y-1">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      onClick={(e) => jumpTo(e, s.id)}
                      className={`flex gap-2.5 py-1.5 text-[12px] leading-snug transition-colors duration-150 ${
                        activeId === s.id ? "text-stone-900" : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      <span className="tabular-nums text-stone-600 text-[10px] pt-0.5">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </div>

        {/* ════ Body: sticky TOC (desktop) + sections ════ */}
        <div className="mx-auto max-w-6xl px-6 md:px-16 py-14 md:py-20">
          <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-14 xl:gap-20">
            {/* Desktop TOC */}
            <aside className="hidden lg:block">
              <nav
                aria-label="Table of contents"
                className="sticky top-28 max-h-[calc(100vh-9rem)] overflow-auto pr-2"
              >
                <p className="text-[8px] tracking-[0.4em] uppercase text-stone-600 mb-5">Contents</p>
                <ol className="space-y-2.5">
                  {sections.map((s, i) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        onClick={(e) => jumpTo(e, s.id)}
                        aria-current={activeId === s.id ? "true" : undefined}
                        className={`group flex gap-2.5 text-[11.5px] leading-snug transition-colors duration-150 ${
                          activeId === s.id
                            ? "text-stone-900"
                            : "text-stone-600 hover:text-stone-700"
                        }`}
                      >
                        <span className="tabular-nums text-[10px] pt-0.5 shrink-0">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={`border-l-2 pl-2.5 -ml-px transition-colors duration-150 ${
                            activeId === s.id ? "border-stone-800" : "border-transparent"
                          }`}
                        >
                          {s.title}
                        </span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            {/* Sections */}
            <article className="max-w-3xl">
              {sections.map((section, i) => (
                <SectionBlock key={section.id} section={section} index={i} reduce={reduce} />
              ))}
            </article>
          </div>
        </div>
      </main>
    </>
  )
}
