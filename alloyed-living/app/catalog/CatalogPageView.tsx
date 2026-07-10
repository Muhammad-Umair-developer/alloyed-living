"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Download, Flame, ShieldCheck, Hammer, Loader2 } from "lucide-react"
import Header from "@/src/components/layout/Header"
import type { CatalogPageContent, Product } from "@/src/lib/data/types"
import { generateCatalogPdf } from "@/src/lib/catalog-pdf"

// ── Design tokens ──────────────────────────────────────────────────────────────
const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}
const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}
const item = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_CINEMATIC } },
}

// Splits "The Full Collection." into a lead line and an emphasised last word.
function splitHeroTitle(title: string): { lead: string; emphasis: string } {
  const words = title.trim().split(" ")
  const emphasis = words.pop() ?? ""
  return { lead: words.join(" "), emphasis }
}

const CRAFT_POINTS = [
  { icon: Flame, label: "Made by hand from strong steel" },
  { icon: Hammer, label: "Finished and put together in our workshop" },
  { icon: ShieldCheck, label: "2-year warranty on the frame" },
]

function DownloadButton({ products, pdfUrl }: { products: Product[]; pdfUrl: string | null }) {
  const [status, setStatus] = useState<"idle" | "generating">("idle")

  // The admin uploaded an exact PDF to serve — link straight to it, no generation needed.
  if (pdfUrl) {
    return (
      <motion.a
        href={pdfUrl}
        download
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ y: -3 }}
        whileTap={{ scale: 0.98 }}
        className="group inline-flex items-center gap-4 bg-stone-900 text-white
                   px-10 py-4 text-[8.5px] tracking-[0.44em] uppercase
                   hover:bg-stone-700 transition-colors duration-500 cursor-pointer"
      >
        Download Full Catalog
        <Download size={12} strokeWidth={1.5} className="group-hover:translate-y-0.5 transition-transform duration-500" />
      </motion.a>
    )
  }

  async function handleDownload() {
    setStatus("generating")
    try {
      await generateCatalogPdf(products)
    } finally {
      setStatus("idle")
    }
  }

  return (
    <motion.button
      onClick={handleDownload}
      disabled={status === "generating"}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className="group inline-flex items-center gap-4 bg-stone-900 text-white
                 px-10 py-4 text-[8.5px] tracking-[0.44em] uppercase
                 hover:bg-stone-700 disabled:opacity-60 disabled:cursor-not-allowed
                 transition-colors duration-500 cursor-pointer"
    >
      {status === "generating" ? (
        <>
          Preparing PDF
          <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />
        </>
      ) : (
        <>
          Download Full Catalog
          <Download size={12} strokeWidth={1.5} className="group-hover:translate-y-0.5 transition-transform duration-500" />
        </>
      )}
    </motion.button>
  )
}

function CatalogProductCard({ product }: { product: Product }) {
  return (
    <motion.article variants={item} className="group">
      <Link href={`/shop/${product.id}`} className="block">
        <div className="relative w-full aspect-[4/5] overflow-hidden mb-5">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute top-4 left-4 z-10">
            <span className="text-[7px] tracking-[0.28em] uppercase text-stone-700
                             bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full">
              {product.category}
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          <h3
            style={EDITORIAL}
            className="text-[1.05rem] font-light text-stone-700 leading-snug tracking-[0.01em]
                       group-hover:text-stone-900 transition-colors duration-500"
          >
            {product.name}
          </h3>
          <p className="text-[8px] tracking-[0.26em] uppercase text-stone-600">{product.material}</p>
          <p className="text-[10px] tracking-[0.18em] text-stone-700 pt-0.5">
            PKR {product.price.toLocaleString()}
          </p>
        </div>
      </Link>
    </motion.article>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function CatalogPageView({ products, content }: { products: Product[]; content: CatalogPageContent }) {
  const { lead, emphasis } = splitHeroTitle(content.heroTitle)

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#faf9f7] pt-24 md:pt-28">

        {/* ════ Hero ════════════════════════════════════════════════════════ */}
        <section
          className="px-6 md:px-16 py-24 md:py-32 text-center border-b border-stone-100"
          aria-label="Catalog hero"
        >
          <motion.span
            className="block text-[8px] tracking-[0.58em] uppercase text-stone-600 mb-7"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_CINEMATIC, delay: 0.1 }}
          >
            Steel Home Decor · Product Catalog
          </motion.span>

          <motion.h1
            style={EDITORIAL}
            className="text-[clamp(2.8rem,7vw,6rem)] font-light text-stone-900
                       leading-[0.95] tracking-[-0.01em] mb-8"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: EASE_CINEMATIC, delay: 0.22 }}
          >
            {lead}
            <br />
            <em className="not-italic font-extralight italic text-stone-700">{emphasis}</em>
          </motion.h1>

          <motion.p
            style={EDITORIAL}
            className="text-[clamp(0.95rem,1.4vw,1.08rem)] font-light italic text-stone-700
                       max-w-lg mx-auto leading-relaxed mb-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_CINEMATIC, delay: 0.4 }}
          >
            {content.heroSubtitle}
          </motion.p>

          <motion.p
            className="text-[0.85rem] text-stone-600 leading-relaxed max-w-xl mx-auto mb-12"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_CINEMATIC, delay: 0.5 }}
          >
            {content.intro}
          </motion.p>

          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_CINEMATIC, delay: 0.62 }}
          >
            <DownloadButton products={products} pdfUrl={content.catalogPdfUrl} />
          </motion.div>

          {/* Craft points */}
          <motion.div
            className="flex flex-wrap justify-center gap-x-10 gap-y-4 mt-14"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_CINEMATIC, delay: 0.74 }}
          >
            {CRAFT_POINTS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 text-[10px] tracking-[0.08em] text-stone-700">
                <Icon size={13} strokeWidth={1.5} className="text-stone-600" />
                {label}
              </div>
            ))}
          </motion.div>
        </section>

        {/* ════ Product grid ═══════════════════════════════════════════════ */}
        <section className="px-6 md:px-16 py-24 md:py-32">
          <motion.div
            className="mb-14 flex items-baseline justify-between flex-wrap gap-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: EASE_CINEMATIC }}
          >
            <h2
              style={EDITORIAL}
              className="text-[clamp(1.9rem,3.5vw,3.2rem)] font-light text-stone-900 leading-tight"
            >
              Every Piece Is Made From Steel
            </h2>
            <p className="text-[9px] tracking-[0.32em] uppercase text-stone-700">
              {products.length} {products.length === 1 ? "Piece" : "Pieces"}
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-16"
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {products.map((product) => (
              <CatalogProductCard key={product.id} product={product} />
            ))}
          </motion.div>
        </section>

      </main>
    </>
  )
}
