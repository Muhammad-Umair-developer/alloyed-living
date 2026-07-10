"use client"

import { useState, useEffect, useMemo, useTransition } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, X, Check } from "lucide-react"
import Header from "@/src/components/layout/Header"
import { useCart } from "@/src/context/CartContext"
import { submitReviewAction, trackViewAction } from "@/src/actions/store-actions"
import { useAuth } from "@/src/context/AuthContext"
import type { Product, ProductColor, Review } from "@/src/lib/data/types"

const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}

const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]

function formatReviewDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "text-base" : "text-sm"
  const rounded = Math.round(rating)
  return (
    <div className="flex items-center gap-px" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`${cls} ${star <= rounded ? "text-amber-500" : "text-stone-200"}`}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </div>
  )
}

// ── Interactive star input for the "Write a Review" form ──
function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hover || value)
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            className={`text-2xl leading-none cursor-pointer transition-colors duration-150
              ${filled ? "text-amber-500" : "text-stone-500 hover:text-amber-300"}`}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}

// ── Write-a-review form (gated behind a signed-in customer) ──
function ReviewForm({
  productId,
  onSubmitted,
}: {
  productId: string
  onSubmitted: (review: Review) => void
}) {
  const { user, displayName } = useAuth()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!user) {
    return (
      <div className="bg-white border border-stone-100 p-8 flex flex-col items-start gap-4">
        <div>
          <p className="text-[8px] tracking-[0.46em] uppercase text-stone-700 mb-2">
            Share Your Experience
          </p>
          <p style={EDITORIAL} className="text-[1.4rem] font-light text-neutral-900">
            Sign in to write a review
          </p>
        </div>
        <Link
          href={`/login?next=/shop/${productId}`}
          className="inline-block py-3.5 px-8 bg-neutral-900 text-white
                     text-[9px] tracking-[0.4em] uppercase font-medium
                     hover:bg-neutral-700 transition-colors duration-300"
        >
          Sign In
        </Link>
      </div>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating < 1) {
      setError("Please select a star rating.")
      return
    }
    if (!comment.trim()) {
      setError("Please write a short comment.")
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const review = await submitReviewAction({
          productId,
          rating,
          comment: comment.trim(),
        })
        onSubmitted(review)
        setRating(0)
        setComment("")
      } catch {
        setError("We couldn't post your review. Please sign in again and retry.")
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-stone-100 p-8 space-y-6"
    >
      <div>
        <p className="text-[8px] tracking-[0.46em] uppercase text-stone-700 mb-2">
          Write a Review
        </p>
        <p className="text-[9px] tracking-[0.2em] text-stone-700">
          Reviewing as{" "}
          <span className="text-stone-900 font-medium">{displayName}</span>
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-[8px] tracking-[0.34em] uppercase text-stone-600">
          Your Rating
        </label>
        <StarInput value={rating} onChange={setRating} />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="review-comment"
          className="block text-[8px] tracking-[0.34em] uppercase text-stone-600"
        >
          Your Review
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={800}
          placeholder="Tell other customers what you loved about this piece…"
          className="w-full bg-[#faf9f7] border border-stone-200 rounded-md p-4
                     text-sm text-neutral-800 leading-relaxed outline-none resize-none
                     focus:border-stone-500 transition-colors duration-300
                     placeholder:text-stone-500"
        />
      </div>

      {error && <p className="text-[11px] text-red-600">{error}</p>}

      <motion.button
        type="submit"
        disabled={isPending}
        whileTap={{ scale: 0.985 }}
        className="py-3.5 px-8 bg-neutral-900 text-white
                   text-[9px] tracking-[0.4em] uppercase font-medium
                   hover:bg-neutral-700 transition-colors duration-300
                   disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
      >
        {isPending ? "Submitting…" : "Submit Review"}
      </motion.button>
    </form>
  )
}

export default function ProductDetailView({
  product,
  reviews: initialReviews,
}: {
  product: Product
  reviews: Review[]
}) {
  const { addToCart, cart } = useCart()

  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  // Re-sync if the server sends a fresh list (e.g. after revalidation).
  useEffect(() => setReviews(initialReviews), [initialReviews])

  // View tracking fires from the client so ISR-cached renders still count —
  // the page itself no longer writes analytics during render.
  useEffect(() => {
    trackViewAction(product.id).catch(() => {})
  }, [product.id])

  const summary = useMemo(() => {
    if (reviews.length === 0) return { count: 0, average: 0 }
    const total = reviews.reduce((sum, r) => sum + r.rating, 0)
    return { count: reviews.length, average: Math.round((total / reviews.length) * 10) / 10 }
  }, [reviews])

  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(
    product.colors?.[0] ?? null
  )
  const [activeIdx, setActiveIdx] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  const gallery = selectedColor?.gallery ?? product.gallery ?? [product.image]
  const inCart = cart.some((i) => i.id === product.id)

  const handleColorSelect = (color: ProductColor) => {
    setSelectedColor(color)
    setActiveIdx(0)
  }

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(id)
  }, [toast])

  const handleAddToCart = () => {
    addToCart({
      id:       product.id,
      name:     product.name,
      material: selectedColor ? selectedColor.name : product.material,
      price:    product.price,
      image:    product.image,
    })
    setToast(`${product.name} · added to your bag`)
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#faf9f7]">

        {/* ── Breadcrumb ── */}
        <div className="px-8 md:px-12 lg:px-20 pt-28 pb-6">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-[8px] tracking-[0.3em] uppercase
                       text-stone-700 hover:text-stone-900 transition-colors duration-300"
          >
            <ArrowLeft size={11} strokeWidth={1.5} />
            Back to Shop
          </Link>
        </div>

        {/* ── Hero ── */}
        <section className="px-8 md:px-12 lg:px-20 pt-2 pb-20
                            lg:grid lg:grid-cols-[55%_1fr] lg:gap-16 lg:items-start">

          {/* ── Gallery column ── */}
          <motion.div
            initial={{ opacity: 0, scale: 1.025 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.0, ease: EASE_CINEMATIC }}
            className="w-full mb-10 lg:mb-0"
          >
            {/* Main image */}
            <div className="relative w-full aspect-[4/5] overflow-hidden bg-stone-100">
              <AnimatePresence mode="wait">
                <motion.img
                  key={`${selectedColor?.name ?? "default"}-${activeIdx}`}
                  src={gallery[activeIdx]}
                  alt={`${product.name} — view ${activeIdx + 1}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE_CINEMATIC }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </AnimatePresence>

              {/* View counter badge */}
              <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm px-3 py-1.5">
                <span className="text-[7px] tracking-[0.28em] uppercase text-stone-600">
                  {activeIdx + 1} / {gallery.length}
                </span>
              </div>
            </div>

            {/* Thumbnail strip */}
            {gallery.length > 1 && (
              <div
                className="grid gap-2 mt-3"
                style={{ gridTemplateColumns: `repeat(${gallery.length}, minmax(0, 1fr))` }}
              >
                {gallery.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    aria-label={`View ${i + 1}`}
                    className={[
                      "aspect-[4/3] overflow-hidden transition-all duration-300 outline-none cursor-pointer",
                      i === activeIdx
                        ? "ring-2 ring-stone-900 ring-offset-2 ring-offset-[#faf9f7] opacity-100"
                        : "ring-1 ring-stone-200 opacity-50 hover:opacity-90 hover:ring-stone-400",
                    ].join(" ")}
                  >
                    <img
                      src={src}
                      alt=""
                      aria-hidden
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* View labels */}
            {gallery.length > 1 && (
              <div
                className="grid gap-2 mt-1.5"
                style={{ gridTemplateColumns: `repeat(${gallery.length}, minmax(0, 1fr))` }}
              >
                {(product.galleryLabels ?? ["Front", "Side", "Detail", "Back"]).slice(0, gallery.length).map((label, i) => (
                  <p
                    key={i}
                    className={`text-center text-[6.5px] tracking-[0.18em] uppercase leading-tight transition-colors duration-300 ${
                      i === activeIdx ? "text-stone-800" : "text-stone-600"
                    }`}
                  >
                    {label}
                  </p>
                ))}
              </div>
            )}
          </motion.div>

          {/* ── Info panel ── */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: EASE_CINEMATIC, delay: 0.12 }}
            className="flex flex-col gap-5 lg:sticky lg:top-[88px]"
          >
            {/* Category */}
            <span className="text-[7px] tracking-[0.42em] uppercase text-stone-700">
              {product.category}
            </span>

            {/* Title */}
            <h1
              style={EDITORIAL}
              className="text-[2.2rem] md:text-[2.75rem] font-light text-neutral-900
                         leading-[1.1] tracking-[-0.01em]"
            >
              {product.name}
            </h1>

            {/* Stars */}
            <div className="flex items-center gap-3">
              {summary.count > 0 ? (
                <>
                  <StarRating rating={summary.average} />
                  <a
                    href="#reviews"
                    className="text-[8px] tracking-[0.2em] text-stone-700 hover:text-stone-800 transition-colors duration-300"
                  >
                    {summary.average.toFixed(1)} · {summary.count}{" "}
                    {summary.count === 1 ? "review" : "reviews"}
                  </a>
                </>
              ) : (
                <a
                  href="#reviews"
                  className="text-[8px] tracking-[0.2em] text-stone-700 hover:text-stone-800 transition-colors duration-300"
                >
                  No reviews yet — be the first
                </a>
              )}
            </div>

            {/* Price */}
            <p className="text-[1.65rem] font-semibold text-neutral-900 tracking-wide">
              PKR {product.price.toLocaleString()}
            </p>

            {/* Material label */}
            <p className="text-[8px] tracking-[0.34em] uppercase text-stone-600 pb-4
                           border-b border-stone-100">
              {product.material}
            </p>

            {/* Color / finish selector */}
            {product.colors && product.colors.length > 0 && (
              <div className="space-y-3">
                <p className="text-[8px] tracking-[0.28em] uppercase text-stone-600">
                  Finish:{" "}
                  <span className="text-stone-900 font-medium normal-case tracking-normal">
                    {selectedColor?.name}
                  </span>
                </p>
                <div className="flex gap-3" role="listbox" aria-label="Select finish">
                  {product.colors.map((color) => {
                    const active = selectedColor?.name === color.name
                    return (
                      <button
                        key={color.name}
                        onClick={() => handleColorSelect(color)}
                        role="option"
                        aria-selected={active}
                        aria-label={color.name}
                        className="group relative focus:outline-none cursor-pointer
                                   focus-visible:ring-2 focus-visible:ring-offset-2
                                   focus-visible:ring-stone-500"
                      >
                        <span
                          className={[
                            "block w-9 h-9 rounded-full transition-all duration-300 ring-offset-[3px] ring-offset-[#faf9f7]",
                            active
                              ? "ring-2 ring-stone-900 scale-110"
                              : "ring-0 group-hover:ring-1 group-hover:ring-stone-400 group-hover:scale-105",
                          ].join(" ")}
                          style={{ backgroundColor: color.hex }}
                        />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Dimensions */}
            <p className="text-[9px] tracking-[0.2em] text-stone-700 leading-relaxed">
              H&nbsp;{product.dimensions.h}&nbsp;·&nbsp;
              W&nbsp;{product.dimensions.w}&nbsp;·&nbsp;
              D&nbsp;{product.dimensions.d}&nbsp;cm
            </p>

            {/* Add to Cart */}
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              onClick={handleAddToCart}
              className="w-full py-4 mt-1 bg-neutral-900 text-white
                         text-[9px] tracking-[0.46em] uppercase font-medium
                         hover:bg-neutral-700 transition-colors duration-300 cursor-pointer"
            >
              {inCart ? "Added to Collection" : "Add to Cart"}
            </motion.button>

            {/* Short description */}
            <p className="text-sm text-neutral-700 leading-relaxed pt-2 border-t border-stone-100">
              {product.description}
            </p>

            {/* Key features */}
            {product.features && product.features.length > 0 && (
              <ul className="space-y-2.5 pt-2 border-t border-stone-100">
                {product.features.map((feat, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-[0.82rem] text-neutral-800 leading-relaxed"
                  >
                    <span className="mt-[0.45rem] flex-shrink-0 w-1.5 h-1.5 rounded-full bg-stone-400" />
                    {feat}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </section>

        {/* ── Full Description ── */}
        <section className="border-t border-stone-100 px-8 md:px-12 lg:px-20 py-16">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: EASE_CINEMATIC }}
          >
            <p className="text-[8px] tracking-[0.46em] uppercase text-stone-700 mb-4">
              About This Piece
            </p>
            <h2
              style={EDITORIAL}
              className="text-[1.75rem] font-light text-neutral-900 mb-6"
            >
              Craftsmanship &amp; Detail
            </h2>

            {product.longDescription ? (
              product.longDescription
                .split(/\n{2,}/)
                .map((para) => para.trim())
                .filter(Boolean)
                .map((para, i) => (
                  <p
                    key={i}
                    className="text-[0.95rem] text-neutral-700 leading-loose max-w-2xl mb-5 whitespace-pre-line"
                  >
                    {para}
                  </p>
                ))
            ) : (
              <>
                <p className="text-[0.95rem] text-neutral-700 leading-loose max-w-2xl mb-5">
                  {product.description}
                </p>
                <p className="text-[0.95rem] text-neutral-600 leading-loose max-w-2xl">
                  Every Alloyed Living piece is made to order and goes through a detailed quality
                  check before delivery. We source materials directly from trusted suppliers and
                  work with craftsmen who have spent decades perfecting their trade.
                  No shortcuts, no compromise.
                </p>
              </>
            )}

            {/* Spec grid */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl">
              {[
                { label: "Material",   value: product.material },
                { label: "Dimensions", value: `H ${product.dimensions.h} × W ${product.dimensions.w} × D ${product.dimensions.d} cm` },
                { label: "Category",   value: product.category },
                { label: "Care",       value: "Dry cloth only" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[7px] tracking-[0.36em] uppercase text-stone-600 mb-1.5">
                    {label}
                  </p>
                  <p className="text-[0.85rem] text-stone-800 leading-snug">{value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── Reviews ── */}
        <section id="reviews" className="border-t border-stone-100 px-8 md:px-12 lg:px-20 py-16 pb-32 scroll-mt-24">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: EASE_CINEMATIC }}
          >
            <div className="flex flex-wrap items-start justify-between gap-6 mb-12">
              <div>
                <p className="text-[8px] tracking-[0.46em] uppercase text-stone-700 mb-3">
                  Customer Reviews
                </p>
                <h2
                  style={EDITORIAL}
                  className="text-[1.75rem] font-light text-neutral-900"
                >
                  What Our Customers Say
                </h2>
              </div>
              {summary.count > 0 && (
                <div className="flex items-center gap-3 pt-1">
                  <StarRating rating={summary.average} size="lg" />
                  <span className="text-[9px] tracking-[0.22em] text-stone-600 tabular-nums">
                    {summary.average.toFixed(1)} / 5 · {summary.count}{" "}
                    {summary.count === 1 ? "review" : "reviews"}
                  </span>
                </div>
              )}
            </div>

            {reviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {reviews.map((review, i) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: Math.min(i, 4) * 0.08, ease: EASE_CINEMATIC }}
                    className="bg-white border border-stone-100 p-7 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[9px] tracking-[0.2em] uppercase text-stone-800 font-medium">
                          {review.author}
                        </p>
                        <p className="text-[8px] tracking-[0.14em] text-stone-600 mt-1">
                          {formatReviewDate(review.createdAt)}
                        </p>
                      </div>
                      <StarRating rating={review.rating} />
                    </div>
                    <p className="text-sm text-stone-700 leading-relaxed">{review.comment}</p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-700 leading-relaxed mb-12 max-w-md">
                No reviews yet. Be the first to share your experience with this piece.
              </p>
            )}

            {/* Write a review */}
            <div className="max-w-2xl">
              <ReviewForm
                productId={product.id}
                onSubmitted={(review) => {
                  setReviews((prev) => [review, ...prev])
                  setToast("Thank you — your review has been posted")
                }}
              />
            </div>
          </motion.div>
        </section>

      </main>

      {/* ── Success toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0  }}
            exit={{    opacity: 0, y: -16 }}
            transition={{ duration: 0.42, ease: EASE_CINEMATIC }}
            className="fixed top-24 left-0 right-0 z-[70] flex justify-center px-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto flex items-center gap-4 px-6 py-4
                         bg-white/85 backdrop-blur-xl border border-stone-200/60
                         shadow-[0_8px_40px_rgba(0,0,0,0.07),0_2px_8px_rgba(0,0,0,0.04)]
                         rounded-full max-w-lg w-full"
            >
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-stone-900
                               flex items-center justify-center">
                <Check size={10} strokeWidth={2.5} className="text-white" />
              </span>
              <p
                style={EDITORIAL}
                className="flex-1 text-[0.95rem] font-light text-neutral-900 leading-none"
              >
                {toast}
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
