"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight, Flame, Hammer, Ruler, ShieldCheck } from "lucide-react"
import Header from "@/src/components/layout/Header"

// ── Design tokens ──────────────────────────────────────────────────────────────
const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}
const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]
const SPRING_HOVER = { type: "spring", stiffness: 300, damping: 28 } as const

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 26 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.7, ease: EASE_CINEMATIC, delay },
  }
}

const PILLARS = [
  {
    icon: Flame,
    title: "Made By Hand",
    body: "Every frame starts as raw steel. We cut, weld, and shape it by hand in our own workshop.",
  },
  {
    icon: Hammer,
    title: "Finished With Care",
    body: "We smooth every weld and paint every edge by hand. We check every joint before it leaves our workshop.",
  },
  {
    icon: Ruler,
    title: "Made To Fit",
    body: "From one small shelf to a full room set, we build every piece to fit real Pakistani homes.",
  },
  {
    icon: ShieldCheck,
    title: "Built To Last",
    body: "Strong steel does not sag or wear out. What we make today will still be in your home decades from now.",
  },
]

export default function OurStoryPageView() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#faf9f7]">

        {/* ════ Hero ════════════════════════════════════════════════════════ */}
        <section className="relative min-h-[85vh] flex items-end overflow-hidden" aria-label="Our story hero">
          <div className="absolute inset-0 z-0">
            <img
              src="/4.jpg.jpeg"
              alt="Hand-forged steel shelving, welded and finished in the Alloyed Living workshop"
              className="w-full h-full object-cover object-[50%_30%] scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/85 via-neutral-950/35 to-neutral-950/10" />
          </div>

          <div className="relative z-10 px-6 md:px-16 pb-20 md:pb-28 pt-40 w-full">
            <motion.span
              className="block text-[8px] tracking-[0.56em] uppercase text-amber-100/60 mb-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE_CINEMATIC, delay: 0.1 }}
            >
              Our Story
            </motion.span>
            <motion.h1
              style={EDITORIAL}
              className="text-[clamp(2.6rem,7vw,6.4rem)] font-light text-white leading-[0.98]
                         tracking-[-0.01em] max-w-3xl"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE_CINEMATIC, delay: 0.2 }}
            >
              Made by Hand,
              <br />
              <em className="not-italic italic font-extralight text-stone-100">Built to Last.</em>
            </motion.h1>
            <motion.p
              style={EDITORIAL}
              className="text-[clamp(0.95rem,1.4vw,1.1rem)] font-light italic text-stone-100
                         max-w-md leading-relaxed mt-8"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE_CINEMATIC, delay: 0.35 }}
            >
              How a small steel workshop in Lahore became Pakistan&apos;s home
              for steel furniture and decor.
            </motion.p>
          </div>
        </section>

        {/* ════ Origin narrative ════════════════════════════════════════════ */}
        <section className="px-6 md:px-16 py-24 md:py-36 border-b border-stone-100">
          <motion.div className="max-w-2xl mx-auto text-center" {...fadeUp(0)}>
            <span className="block text-[7.5px] tracking-[0.5em] uppercase text-stone-600 mb-8">
              Where It Began
            </span>
            <p
              style={EDITORIAL}
              className="text-[clamp(1.15rem,2vw,1.5rem)] font-light text-stone-800
                         leading-[1.65] mb-8"
            >
              Alloyed Living started on the factory floor, not in an office.
              Before we had a store, we had a welding table in Fategarh,
              Lahore. We believed that steel, made with real skill, could
              feel as warm as wood in your home.
            </p>
            <p className="text-[0.92rem] text-stone-600 leading-relaxed">
              Most furniture brands buy ready-made frames. We build ours from
              raw steel, in our own workshop, by people who know exactly how
              much heat and care one weld needs to last a lifetime. We never
              compromise on the steel — it is heavy-duty, finished by hand,
              and paired with good wood, leather, and stone.
            </p>
          </motion.div>
        </section>

        {/* ════ Pull quote ════════════════════════════════════════════════ */}
        <section className="px-6 md:px-16 py-20 md:py-28 bg-neutral-950 border-b border-stone-100">
          <motion.blockquote
            style={EDITORIAL}
            className="max-w-3xl mx-auto text-center text-[clamp(1.5rem,3.4vw,2.6rem)]
                       font-light italic text-white leading-[1.3]"
            {...fadeUp(0)}
          >
            &ldquo;We don&apos;t just add steel to furniture.
            We turn steel into furniture.&rdquo;
          </motion.blockquote>
          <motion.p
            className="text-center text-[8px] tracking-[0.4em] uppercase text-stone-200 mt-8"
            {...fadeUp(0.1)}
          >
            — The Alloyed Living Workshop
          </motion.p>
        </section>

        {/* ════ Material split ════════════════════════════════════════════ */}
        <section className="grid grid-cols-1 lg:grid-cols-2">
          <motion.div
            className="relative min-h-[420px] lg:min-h-[620px] overflow-hidden"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: EASE_CINEMATIC }}
          >
            <img
              src="/7.jpg.jpeg"
              alt="Steel-framed wardrobe and shelving, styled with everyday home decor"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </motion.div>

          <div className="flex items-center px-6 md:px-16 py-20 lg:py-0 bg-[#f8f6f3]">
            <motion.div className="max-w-md" {...fadeUp(0)}>
              <span className="block text-[7.5px] tracking-[0.5em] uppercase text-stone-600 mb-6">
                The Material
              </span>
              <h2
                style={EDITORIAL}
                className="text-[clamp(1.9rem,3.2vw,2.8rem)] font-light text-stone-900
                           leading-tight mb-6"
              >
                Steel, Because It Lasts.
              </h2>
              <p className="text-[0.9rem] text-stone-600 leading-relaxed mb-4">
                Wood can bend. Cheap board can sag. Steel does not. Every
                Alloyed Living piece starts with a heavy-duty steel frame —
                cut and welded by hand to hold its shape for decades.
              </p>
              <p className="text-[0.9rem] text-stone-600 leading-relaxed">
                We add solid wood, natural stone, and real leather to that
                frame. Every piece is strong enough for daily life, and
                beautiful enough to be the centre of a room.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ════ Pillars grid ════════════════════════════════════════════════ */}
        <section className="px-6 md:px-16 py-24 md:py-36 border-t border-stone-100">
          <motion.div className="mb-16 max-w-xl" {...fadeUp(0)}>
            <span className="block text-[7.5px] tracking-[0.5em] uppercase text-stone-600 mb-3">
              How We Build
            </span>
            <h2
              style={EDITORIAL}
              className="text-[clamp(1.9rem,3.5vw,3.2rem)] font-light text-stone-900 leading-tight"
            >
              What Every Piece Shares
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {PILLARS.map(({ icon: Icon, title, body }, i) => (
              <motion.div
                key={title}
                whileHover={{ y: -6, transition: SPRING_HOVER }}
                className="flex flex-col gap-6 bg-[#f7f5f2] border border-stone-100 p-8
                           hover:border-stone-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)]
                           transition-all duration-500"
                {...fadeUp(i * 0.08)}
              >
                <div className="w-10 h-10 border border-stone-200 flex items-center justify-center">
                  <Icon size={14} strokeWidth={1.2} className="text-stone-600" />
                </div>
                <div>
                  <h3
                    style={EDITORIAL}
                    className="text-[1.05rem] font-normal text-stone-900 leading-snug mb-2.5"
                  >
                    {title}
                  </h3>
                  <p className="text-[12px] text-stone-600 leading-relaxed">{body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ════ Closing CTA ═══════════════════════════════════════════════ */}
        <section className="relative px-6 md:px-16 py-28 md:py-40 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="/6.jpg.jpeg"
              alt="A finished steel and wood entryway shelving unit"
              className="w-full h-full object-cover object-[50%_35%]"
            />
            <div className="absolute inset-0 bg-neutral-950/70" />
          </div>

          <motion.div className="relative z-10 max-w-xl mx-auto text-center" {...fadeUp(0)}>
            <span className="block text-[7.5px] tracking-[0.5em] uppercase text-white/95 mb-6">
              See It In Person
            </span>
            <h2
              style={EDITORIAL}
              className="text-[clamp(2rem,4vw,3.4rem)] font-light text-white leading-tight mb-10"
            >
              Every Piece Has a Story. <br className="hidden sm:block" />
              Come See Where Yours Begins.
            </h2>

            <div className="flex flex-wrap items-center justify-center gap-5">
              <motion.div whileHover={{ y: -3, transition: SPRING_HOVER }}>
                <Link
                  href="/shop"
                  className="group inline-flex items-center gap-3 bg-white text-stone-900
                             px-9 py-3.5 text-[8px] tracking-[0.44em] uppercase
                             hover:bg-stone-200 transition-colors duration-500"
                >
                  Shop Now
                  <ArrowRight size={10} strokeWidth={1.5} className="group-hover:translate-x-1 transition-transform duration-400" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ y: -3, transition: SPRING_HOVER }}>
                <Link
                  href="/factory-location"
                  className="group inline-flex items-center gap-3 border border-white/40 text-white
                             px-9 py-3.5 text-[8px] tracking-[0.44em] uppercase
                             hover:bg-white/10 hover:border-white/70 transition-colors duration-500"
                >
                  Visit Our Workshop
                  <ArrowRight size={10} strokeWidth={1.5} className="group-hover:translate-x-1 transition-transform duration-400" />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </section>

      </main>
    </>
  )
}
