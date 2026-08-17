"use client"

import { type CSSProperties, useMemo, useState } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { ArrowRight, X } from "lucide-react"
import Header from "@/src/components/layout/Header"
import { useCart } from "@/src/context/CartContext"
import type { HomePageContent, Product } from "@/src/lib/data/types"

// ── Design tokens ──────────────────────────────────────────────────────────────
const EDITORIAL: CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}

// High-damping spring for all hover micro-interactions
const SPRING_HOVER = { type: "spring", stiffness: 300, damping: 28 } as const
const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]

// ── Data ───────────────────────────────────────────────────────────────────────
type FeaturedPiece = Product & { span: "wide" | "narrow" }

// ══════════════════════════════════════════════════════════════════════════════
//  HERO SECTION
// ══════════════════════════════════════════════════════════════════════════════
function HeroSection({ hero }: { hero: HomePageContent["hero"] }) {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center
                 text-center px-6 overflow-hidden"
      aria-label="Hero"
    >
      {/* Media background — overflow-hidden masks edge watermarks; scale-[1.04] pushes outer pixels outside the clip boundary */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0 pointer-events-none bg-neutral-900">
        {hero.mediaType === "video" && hero.videoUrl && (
          <video
            src={hero.videoUrl}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover object-[50%_32%] scale-[1.08]"
            aria-hidden
          />
        )}
        {hero.mediaType === "image" && hero.imageUrl && (
          <Image
            src={hero.imageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="absolute inset-0 w-full h-full object-cover object-[50%_32%] scale-[1.08]"
            aria-hidden
          />
        )}
      </div>

      {/* Dark overlay — keeps headline legible over moving footage */}
      <div className="absolute inset-0 bg-neutral-950/40 z-10" aria-hidden />

      {/* Content — staggered entrance sequence */}
      <div className="relative z-20 flex flex-col items-center">

        {/* Eyebrow */}
        <motion.span
          className="block text-[12px] tracking-[0.58em] uppercase text-white font-semibold mb-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
        >
          {hero.eyebrow}
        </motion.span>

        {/* Main headline — primary entrance animation */}
        <motion.h1
          style={EDITORIAL}
          className="text-[clamp(3.2rem,10vw,9.5rem)] font-light tracking-[0.06em]
                     uppercase text-white leading-[0.9]"
          aria-label={`${hero.titleLine1} ${hero.titleLine2}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        >
          <span className="block">{hero.titleLine1}</span>
          <span className="block font-extralight ">{hero.titleLine2}</span>
        </motion.h1>

        {/* Divider rule */}
        <motion.div
          className="w-20 h-px bg-amber-400/40 mt-9 mb-9"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.85 }}
          style={{ transformOrigin: "center" }}
        />

        {/* Tagline */}
        <motion.p
          style={EDITORIAL}
          className="text-lg font-normal text-white max-w-xs tracking-wide leading-relaxed mb-12"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.75 }}
        >
          {hero.tagline}
        </motion.p>

        {/* CTA — entrance + spring hover lift */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -3, transition: SPRING_HOVER }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 1.05 }}
        >
          <Link
            href="/shop"
            className="group inline-flex items-center gap-3 border border-white/20
                       px-10 py-4 text-[8.5px] tracking-[0.46em] uppercase text-white/90
                       backdrop-blur-sm bg-white/5 cursor-pointer
                       hover:bg-white/12 hover:border-white/40 hover:text-white
                       transition-all duration-700"
          >
            {hero.ctaLabel}
            <ArrowRight
              size={11}
              strokeWidth={1.5}
              className="translate-x-0 group-hover:translate-x-2 transition-transform duration-500"
            />
          </Link>
        </motion.div>
      </div>

    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  EDITORIAL / STORY SECTION
// ══════════════════════════════════════════════════════════════════════════════
function EditorialSection({ story }: { story: HomePageContent["story"] }) {
  return (
    <section className="relative py-36 bg-[#f8f6f3]">
      <motion.div
        className="max-w-5xl mx-auto text-center px-6 md:px-12"
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <span className="block text-[8.5px] tracking-[0.52em] uppercase text-stone-600 mb-10">
          {story.eyebrow}
        </span>

        <h2
          style={EDITORIAL}
          className="text-[clamp(2rem,5vw,4.6rem)] font-light text-neutral-900
                     leading-[1.12] mb-10"
        >
          {story.title}
        </h2>

        <p
          style={EDITORIAL}
          className="text-[clamp(1rem,1.5vw,1.4rem)] font-normal text-neutral-700
                     leading-relaxed max-w-2xl mx-auto mb-14"
        >
          {story.body}
        </p>

        <div className="w-16 h-px bg-stone-300 mx-auto mb-12" />

        <motion.div
          className="inline-block"
          whileHover={{ y: -2, transition: SPRING_HOVER }}
        >
          <Link
            href="/our-story"
            className="inline-flex items-center gap-3 text-[8px] tracking-[0.44em]
                       uppercase text-stone-700 border-b border-stone-400 pb-0.5 cursor-pointer
                       hover:text-stone-950 hover:border-stone-800 transition-colors duration-500"
          >
            {story.ctaLabel} <ArrowRight size={9} strokeWidth={1.5} />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  SHOP THE ROOM SECTION
// ══════════════════════════════════════════════════════════════════════════════
function ShopRoomSection({ shopRoom }: { shopRoom: HomePageContent["shopRoom"] }) {
  return (
    <section
      id="shop-the-room"
      className="relative min-h-[60vh] flex flex-col justify-center overflow-hidden"
    >
      {/* Static room background */}
      <div className="absolute inset-0">
        <Image
          src={shopRoom.backgroundImage}
          alt=""
          fill
          sizes="100vw"
          className="w-full h-full object-cover object-center"
          aria-hidden
        />
        <div className="absolute inset-0 bg-neutral-950/65" aria-hidden />
      </div>

      {/* Scroll-reveal content block */}
      <motion.div
        className="relative z-10 max-w-6xl mx-auto px-6 md:px-16 py-24"
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <span className="block text-[8.5px] tracking-[0.48em] uppercase text-white/95 mb-4">
          {shopRoom.eyebrow}
        </span>
        <h2
          style={EDITORIAL}
          className="text-[clamp(2rem,4.5vw,3.8rem)] font-light text-white leading-tight mb-5"
        >
          {shopRoom.title}
        </h2>
        <p
          style={EDITORIAL}
          className="text-lg font-normal text-white max-w-xs tracking-wide leading-relaxed mb-12"
        >
          {shopRoom.subtitle}
        </p>

        <motion.div
          className="inline-block"
          whileHover={{ y: -3, transition: SPRING_HOVER }}
        >
          <Link
            href="/shop"
            className="group inline-flex items-center gap-3 border border-white/20
                       px-9 py-3.5 text-[8px] tracking-[0.44em] uppercase text-white/95
                       backdrop-blur-sm bg-white/5 cursor-pointer
                       hover:bg-white/12 hover:border-white/40 hover:text-white/90
                       transition-all duration-700"
          >
            {shopRoom.ctaLabel}
            <ArrowRight
              size={10}
              strokeWidth={1.5}
              className="translate-x-0 group-hover:translate-x-2 transition-transform duration-500"
            />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  PRODUCT CARD
// ══════════════════════════════════════════════════════════════════════════════
function ProductCard({ piece, index, onSelect }: { piece: FeaturedPiece; index: number; onSelect: (p: FeaturedPiece) => void }) {
  const [hovered, setHovered] = useState(false)
  const isWide = piece.span === "wide"
  const offset =
    index === 1
      ? "md:mt-28"
      : index === 2
      ? "md:-mt-20"
      : index === 3
      ? "md:mt-24"
      : ""

  return (
    <motion.article
      className={[
        "group flex flex-col cursor-pointer",
        isWide ? "md:col-span-7" : "md:col-span-5",
        offset,
      ].join(" ")}
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      whileHover={{ y: -4, transition: SPRING_HOVER }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      transition={{ duration: 0.6, ease: "easeOut", delay: index % 2 === 1 ? 0.15 : 0 }}
      onClick={() => onSelect(piece)}
    >
      {/* Image */}
      <div
        className={[
          "relative overflow-hidden",
          isWide ? "aspect-[4/3]" : "aspect-[3/4]",
        ].join(" ")}
      >
        <Image
          src={piece.image}
          alt={piece.name}
          fill
          sizes="(min-width: 768px) 40vw, 100vw"
          className="w-full h-full object-cover object-center
                     group-hover:scale-[1.042]
                     transition-transform duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
        />
        {/* Price badge */}
        <div
          className="absolute top-4 right-4 backdrop-blur-md bg-white/80
                      border border-white/30 px-4 py-2"
        >
          <span className="text-[7.5px] tracking-[0.3em] uppercase text-black font-medium">
            PKR {piece.price.toLocaleString()}
          </span>
        </div>

        {/* Hover overlay — View Product CTA */}
        <div className="absolute inset-0 flex items-center justify-center bg-stone-900/[0.04]">
          <AnimatePresence>
            {hovered && (
              <motion.button
                key="view-btn"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => { e.stopPropagation(); onSelect(piece) }}
                className="bg-neutral-900 text-white px-6 py-3 text-sm font-medium
                           tracking-wider uppercase shadow-lg cursor-pointer"
              >
                View Product
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Copy */}
      <div className="pt-5 pb-2 px-0.5">
        <span className="block text-[7.5px] tracking-[0.44em] uppercase text-stone-600 mb-2.5">
          {piece.material}
        </span>
        <h3
          style={EDITORIAL}
          className="text-[clamp(1.2rem,2vw,1.9rem)] font-light text-stone-900
                     leading-tight mb-1.5"
        >
          {piece.name}
        </h3>
        <span className="block text-[7.5px] tracking-[0.28em] text-stone-600 mb-4">
          {piece.category}
        </span>
        <p className="text-[0.78rem] font-semibold text-neutral-800 leading-relaxed mb-5 max-w-sm">
          {piece.description}
        </p>
        <span className="text-[7.5px] tracking-[0.3em] text-stone-600">
          PKR {piece.price.toLocaleString()}
        </span>
      </div>
    </motion.article>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  OBJECTS OF CONSEQUENCE GRID
// ══════════════════════════════════════════════════════════════════════════════
function ObjectsSection({
  featured, pieces, onSelect,
}: {
  featured: HomePageContent["featured"]
  pieces: FeaturedPiece[]
  onSelect: (p: FeaturedPiece) => void
}) {
  return (
    <section className="py-24 md:py-36 px-6 md:px-16 bg-[#faf9f7]">
      <motion.div
        className="mb-16 md:mb-24 max-w-xl"
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <span className="block text-[8.5px] tracking-[0.46em] uppercase text-stone-600 mb-3">
          {featured.eyebrow}
        </span>
        <h2
          style={EDITORIAL}
          className="text-[clamp(2rem,4vw,3.6rem)] font-light text-stone-900 leading-tight"
        >
          {featured.title}
        </h2>
      </motion.div>

      {/* Product grid — each card independently scroll-reveals and spring-hovers */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-x-7 gap-y-12">
        {pieces.map((piece, i) => (
          <ProductCard key={piece.id} piece={piece} index={i} onSelect={onSelect} />
        ))}
      </div>

      <motion.div
        className="mt-24 md:mt-36 flex justify-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div
          className="inline-block"
          whileHover={{ y: -3, transition: SPRING_HOVER }}
        >
          <Link
            href="/shop"
            className="group inline-flex items-center gap-4 border border-stone-800
                       px-12 py-4 text-[8.5px] tracking-[0.44em] uppercase
                       text-stone-800 cursor-pointer
                       hover:bg-stone-900 hover:text-stone-100
                       transition-all duration-700"
          >
            {featured.ctaLabel}
            <ArrowRight
              size={11}
              strokeWidth={1.5}
              className="translate-x-0 group-hover:translate-x-2 transition-transform duration-500"
            />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  PAGE ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function HomePageView({ products, content }: { products: Product[]; content: HomePageContent }) {
  const { cart, addToCart }                   = useCart()
  const [selected, setSelected]               = useState<FeaturedPiece | null>(null)
  const [toast, setToast]                     = useState<string | null>(null)

  const featuredPieces = useMemo<FeaturedPiece[]>(
    () =>
      content.featured.productIds
        .map((id, i) => {
          const product = products.find((p) => p.id === id)
          const span: "wide" | "narrow" = i % 2 === 0 ? "wide" : "narrow"
          return product ? { ...product, span } : null
        })
        .filter((p): p is FeaturedPiece => p !== null),
    [products, content.featured.productIds],
  )

  const handleAddToCart = (piece: FeaturedPiece) => {
    addToCart({
      id:       piece.id,
      name:     piece.name,
      material: piece.material,
      price:    piece.price,
      image:    piece.image,
    })
    setSelected(null)
    setToast(piece.name)
    setTimeout(() => setToast(null), 3500)
  }

  return (
    <>
      <Header />
      <main>
        <HeroSection hero={content.hero} />
        <EditorialSection story={content.story} />
        <ShopRoomSection shopRoom={content.shopRoom} />
        <ObjectsSection featured={content.featured} pieces={featuredPieces} onSelect={setSelected} />
      </main>

      {/* ── Product modal ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm
                       flex items-center justify-center p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              key="modal-box"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{    opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.4, ease: EASE_CINEMATIC }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white max-w-2xl w-full p-8 rounded-lg shadow-2xl
                         relative flex flex-col md:flex-row gap-6"
            >
              {/* Close */}
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center
                           text-neutral-600 hover:text-neutral-900 transition-colors duration-300 cursor-pointer"
              >
                <X size={16} strokeWidth={1.5} />
              </button>

              {/* Image */}
              <div className="relative w-full md:w-[48%] aspect-[4/5] flex-shrink-0 overflow-hidden rounded-md">
                <Image
                  src={selected.image}
                  alt={selected.name}
                  fill
                  sizes="(min-width: 768px) 48vw, 100vw"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Details */}
              <div className="flex flex-col justify-center gap-4 flex-1 pt-4 md:pt-0">
                <div className="space-y-1.5">
                  <p className="text-[7.5px] tracking-[0.36em] uppercase text-neutral-600">
                    {selected.category}
                  </p>
                  <h2
                    style={EDITORIAL}
                    className="text-[1.7rem] font-light text-neutral-900 leading-snug tracking-tight"
                  >
                    {selected.name}
                  </h2>
                  <p className="text-[8px] tracking-[0.3em] uppercase text-neutral-600">
                    {selected.material}
                  </p>
                </div>

                <p className="text-neutral-600 text-sm leading-relaxed line-clamp-2">
                  {selected.description}
                </p>

                <p className="text-[9px] tracking-[0.18em] text-neutral-700">
                  H&nbsp;{selected.dimensions.h}&nbsp;·&nbsp;
                  W&nbsp;{selected.dimensions.w}&nbsp;·&nbsp;
                  D&nbsp;{selected.dimensions.d}&nbsp;cm
                </p>

                <p className="text-xl font-semibold tracking-wider text-neutral-900">
                  PKR {selected.price.toLocaleString()}
                </p>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAddToCart(selected)}
                  className="mt-1 w-full py-4 bg-neutral-950 text-white
                             text-[9px] tracking-[0.4em] uppercase font-medium
                             hover:bg-neutral-700 transition-colors duration-300 cursor-pointer"
                >
                  {cart.some((i) => i.id === selected.id)
                    ? "Added to Bag"
                    : "Add to Cart"}
                </motion.button>

                <Link
                  href={`/shop/${selected.id}`}
                  onClick={() => setSelected(null)}
                  className="block w-full py-4 border border-neutral-900 text-center
                             text-[9px] tracking-[0.4em] uppercase font-medium text-neutral-900
                             hover:bg-neutral-900 hover:text-white transition-colors duration-300"
                >
                  View Full Details
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add-to-cart toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0   }}
            exit={{    opacity: 0, y: -16 }}
            transition={{ duration: 0.42, ease: EASE_CINEMATIC }}
            className="fixed top-24 left-0 right-0 z-[70] flex justify-center px-4 pointer-events-none"
          >
            <div className="pointer-events-auto flex items-center gap-4 px-6 py-4
                            bg-white/85 backdrop-blur-xl border border-stone-200/60
                            shadow-[0_8px_40px_rgba(0,0,0,0.07)] rounded-full max-w-lg w-full">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-stone-900 flex items-center justify-center">
                <ArrowRight size={9} strokeWidth={2.5} className="text-white" />
              </span>
              <p className="flex-1 text-[9px] tracking-[0.18em] uppercase text-stone-700 leading-none">
                <span style={EDITORIAL} className="text-[0.95rem] font-light text-neutral-900 normal-case tracking-normal">
                  {toast}
                </span>
                <span className="mx-2 text-stone-600">·</span>
                added to your bag
              </p>
              <button
                onClick={() => setToast(null)}
                aria-label="Dismiss"
                className="flex-shrink-0 text-stone-600 hover:text-stone-900
                           transition-colors duration-300 cursor-pointer"
              >
                <X size={13} strokeWidth={1.5} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
