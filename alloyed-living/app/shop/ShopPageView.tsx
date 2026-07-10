"use client"

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  memo,
} from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SlidersHorizontal, X, ChevronDown, Check } from "lucide-react"
import Link from "next/link"
import Header from "@/src/components/layout/Header"
import { useCart } from "@/src/context/CartContext"
import type { Product, ShopPageContent } from "@/src/lib/data/types"

type SortKey = "new" | "price-asc" | "price-desc"

interface FilterState {
  priceMin: number
  priceMax: number
  materials: string[]
  dimH: string
  dimW: string
  dimD: string
  sort: SortKey
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}

const PRICE_MIN = 20000
const PRICE_MAX = 150000

const SPRING_DRAWER = { type: "spring", stiffness: 350, damping: 38, mass: 1 } as const
const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]

// The category nav is derived from the live catalog (see ShopPageView) so it
// always reflects the products that actually exist — when every product is
// deleted, no categories are shown.
type CategoryNav = string | null

const SORT_LABELS: Record<SortKey, string> = {
  "new":        "New Arrivals",
  "price-asc":  "Price: Low to High",
  "price-desc": "Price: High to Low",
}

const INITIAL_FILTERS: FilterState = {
  priceMin:  PRICE_MIN,
  priceMax:  PRICE_MAX,
  materials: [],
  dimH: "",
  dimW: "",
  dimD: "",
  sort: "new",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPKR(val: number): string {
  if (val >= PRICE_MAX) return "PKR 150,000+"
  return `PKR ${val.toLocaleString()}`
}

function isDefaultFilters(f: FilterState): boolean {
  return (
    f.priceMin  === INITIAL_FILTERS.priceMin &&
    f.priceMax  === INITIAL_FILTERS.priceMax &&
    f.materials.length === 0 &&
    !f.dimH && !f.dimW && !f.dimD
  )
}

// ─── DualRangeSlider ──────────────────────────────────────────────────────────

function DualRangeSlider({
  min, max, low, high, onChange,
}: {
  min: number; max: number; low: number; high: number;
  onChange: (low: number, high: number) => void;
}) {
  const trackRef  = useRef<HTMLDivElement>(null)
  const dragging  = useRef<"low" | "high" | null>(null)
  const stateRef  = useRef({ low, high, onChange })
  stateRef.current = { low, high, onChange }

  const fromPointer = useCallback((clientX: number): number => {
    const el = trackRef.current
    if (!el) return 0
    const { left, width } = el.getBoundingClientRect()
    const raw = min + ((clientX - left) / width) * (max - min)
    return Math.round(Math.max(min, Math.min(max, raw)) / 5000) * 5000
  }, [min, max])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const which = dragging.current
      if (!which) return
      const val = fromPointer(e.clientX)
      const { low: l, high: h, onChange: cb } = stateRef.current
      if (which === "low")  cb(Math.min(val, h - 5000), h)
      else                  cb(l, Math.max(val, l + 5000))
    }
    const onUp = () => { dragging.current = null }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup",   onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup",   onUp)
    }
  }, [fromPointer])

  const lowPct  = ((low  - min) / (max - min)) * 100
  const highPct = ((high - min) / (max - min)) * 100

  const Thumb = ({ which, pct }: { which: "low" | "high"; pct: number }) => (
    <div
      onPointerDown={(e) => { e.preventDefault(); dragging.current = which }}
      role="slider"
      tabIndex={0}
      aria-valuenow={which === "low" ? low : high}
      aria-valuemin={which === "low" ? min : low + 5000}
      aria-valuemax={which === "low" ? high - 5000 : max}
      aria-label={which === "low" ? "Minimum price" : "Maximum price"}
      onKeyDown={(e) => {
        const { low: l, high: h, onChange: cb } = stateRef.current
        if (which === "low") {
          if (e.key === "ArrowRight") cb(Math.min(l + 5000, h - 5000), h)
          if (e.key === "ArrowLeft")  cb(Math.max(l - 5000, min), h)
        } else {
          if (e.key === "ArrowRight") cb(l, Math.min(h + 5000, max))
          if (e.key === "ArrowLeft")  cb(l, Math.max(h - 5000, l + 5000))
        }
      }}
      className="absolute top-1/2 z-10 w-3.5 h-3.5 rounded-full bg-stone-900
                 ring-[3px] ring-[#faf9f7] shadow-md
                 cursor-grab active:cursor-grabbing touch-none select-none
                 focus:outline-none focus-visible:ring-stone-400
                 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${pct}%` }}
    />
  )

  return (
    <div className="pt-1 pb-5">
      {/* Rolling price labels */}
      <div className="flex justify-between mb-6">
        <motion.span
          key={low}
          initial={{ opacity: 0.5, y: 2 }}
          animate={{ opacity: 1,   y: 0 }}
          transition={{ duration: 0.18 }}
          className="text-[10px] tracking-[0.16em] text-stone-600 tabular-nums"
        >
          {formatPKR(low)}
        </motion.span>
        <motion.span
          key={high}
          initial={{ opacity: 0.5, y: 2 }}
          animate={{ opacity: 1,   y: 0 }}
          transition={{ duration: 0.18 }}
          className="text-[10px] tracking-[0.16em] text-stone-600 tabular-nums"
        >
          {formatPKR(high)}
        </motion.span>
      </div>

      {/* Track */}
      <div ref={trackRef} className="relative h-px bg-stone-200 mx-1.5">
        <div
          className="absolute inset-y-0 bg-stone-800"
          style={{ left: `${lowPct}%`, right: `${100 - highPct}%` }}
        />
        <Thumb which="low"  pct={lowPct}  />
        <Thumb which="high" pct={highPct} />
      </div>
    </div>
  )
}

// ─── FilterPanel ──────────────────────────────────────────────────────────────

interface FilterPanelProps {
  filters:          FilterState
  onChange:         <K extends keyof FilterState>(key: K, val: FilterState[K]) => void
  onClearAll:       () => void
  categories:       string[]
  materialOptions:  string[]
  activeCategory:   CategoryNav
  onCategoryChange: (cat: CategoryNav) => void
}

const FilterPanel = memo(function FilterPanel({
  filters, onChange, onClearAll, categories, materialOptions, activeCategory, onCategoryChange,
}: FilterPanelProps) {
  const [dimOpen, setDimOpen] = useState(false)

  const toggleMaterial = (id: string) => {
    const next = filters.materials.includes(id)
      ? filters.materials.filter((m) => m !== id)
      : [...filters.materials, id]
    onChange("materials", next)
  }

  const dirty = !isDefaultFilters(filters)

  return (
    <div className="space-y-10">

      {/* ── Category Navigation ── */}
      {categories.length > 0 && (
        <div className="space-y-4 mb-8 pb-8 border-b border-stone-100">
          {categories.map((cat) => {
            const isActive = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => onCategoryChange(isActive ? null : cat)}
                className={`
                  block w-full text-left cursor-pointer
                  font-semibold text-lg tracking-tight
                  transition-all duration-300
                  ${isActive
                    ? "text-neutral-900 underline underline-offset-[5px] decoration-[1.5px] translate-x-1"
                    : "text-neutral-900 hover:translate-x-1 hover:text-neutral-500"
                  }
                `}
              >
                {cat}
              </button>
            )
          })}
        </div>
      )}

      {/* Section header */}
      <div className="flex items-baseline justify-between">
        <p className="text-[9px] tracking-[0.46em] uppercase text-stone-600 font-light">Filters</p>
        <AnimatePresence>
          {dirty && (
            <motion.button
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{    opacity: 0, x: 8 }}
              transition={{ duration: 0.22 }}
              onClick={onClearAll}
              className="text-[8px] tracking-[0.26em] uppercase text-stone-600
                         hover:text-stone-800 transition-colors duration-500
                         underline underline-offset-2"
            >
              Clear All
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Price Range */}
      <section>
        <p className="text-[8px] tracking-[0.38em] uppercase text-stone-600 mb-5">Price Range</p>
        <DualRangeSlider
          min={PRICE_MIN}
          max={PRICE_MAX}
          low={filters.priceMin}
          high={filters.priceMax}
          onChange={(l, h) => {
            onChange("priceMin", l)
            onChange("priceMax", h)
          }}
        />
      </section>

      {/* Material — a clean checkbox list built from the materials products
          actually use (empty when there are none). */}
      {materialOptions.length > 0 && (
        <section>
          <p className="text-[8px] tracking-[0.38em] uppercase text-stone-600 mb-4">Material</p>
          <div className="space-y-1">
            {materialOptions.map((mat) => {
              const active = filters.materials.includes(mat)
              return (
                <button
                  key={mat}
                  onClick={() => toggleMaterial(mat)}
                  aria-pressed={active}
                  className="group flex items-center gap-2.5 w-full text-left py-1 focus:outline-none"
                >
                  <span
                    className={`
                      flex-shrink-0 w-4 h-4 rounded-[3px] border flex items-center justify-center
                      transition-colors duration-300
                      ${active
                        ? "bg-stone-800 border-stone-800"
                        : "bg-transparent border-stone-300 group-hover:border-stone-500"}
                    `}
                  >
                    {active && <Check size={11} strokeWidth={2.5} className="text-white" />}
                  </span>
                  <span
                    className={`
                      text-[11px] tracking-[0.02em] leading-snug
                      transition-colors duration-300
                      ${active ? "text-stone-900 font-medium" : "text-stone-600 group-hover:text-stone-800"}
                    `}
                  >
                    {mat}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Spatial Dimensions */}
      <section>
        <button
          onClick={() => setDimOpen((o) => !o)}
          className="flex items-center justify-between w-full focus:outline-none group"
        >
          <p className="text-[8px] tracking-[0.38em] uppercase text-stone-600">Dimensions</p>
          <ChevronDown
            size={11}
            strokeWidth={1.5}
            className={`text-stone-500 transition-transform duration-400 ${dimOpen ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {dimOpen && (
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              exit={{    scaleY: 0, opacity: 0 }}
              transition={{ duration: 0.36, ease: EASE_CINEMATIC }}
              style={{ transformOrigin: "top", overflow: "hidden", willChange: "transform, opacity" }}
            >
              <div className="pt-5 grid grid-cols-3 gap-4">
                {(["dimH", "dimW", "dimD"] as const).map((key) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label
                      htmlFor={`dim-${key}`}
                      className="text-[7px] tracking-[0.28em] uppercase text-stone-700"
                    >
                      {key === "dimH" ? "H" : key === "dimW" ? "W" : "D"}&nbsp;<span className="normal-case text-[6px]">cm</span>
                    </label>
                    <input
                      id={`dim-${key}`}
                      type="number"
                      value={filters[key]}
                      onChange={(e) => onChange(key, e.target.value)}
                      placeholder="—"
                      min={0}
                      className="
                        w-full bg-transparent border-b border-stone-200 py-1.5
                        text-[11px] text-stone-600 tracking-wide
                        placeholder:text-stone-200 outline-none
                        focus:border-stone-500 transition-colors duration-300
                        [appearance:textfield]
                        [&::-webkit-inner-spin-button]:appearance-none
                        [&::-webkit-outer-spin-button]:appearance-none
                      "
                    />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[7px] text-stone-700 tracking-wide leading-relaxed">
                Shows pieces with min. H · W · D in cm
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Sort */}
      <section>
        <p className="text-[8px] tracking-[0.38em] uppercase text-stone-600 mb-4">Sort By</p>
        <div className="space-y-3">
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => {
            const active = filters.sort === key
            return (
              <button
                key={key}
                onClick={() => onChange("sort", key)}
                className={`flex items-center gap-3 w-full text-left transition-colors duration-300
                  ${active ? "text-stone-900" : "text-stone-500 hover:text-stone-700"}`}
              >
                <span
                  className={`
                    w-1 h-1 rounded-full flex-shrink-0 transition-all duration-300
                    ${active ? "bg-stone-900 scale-125" : "border border-stone-400"}
                  `}
                />
                <span className="text-[9px] tracking-[0.18em]">{SORT_LABELS[key]}</span>
              </button>
            )
          })}
        </div>
      </section>

    </div>
  )
})

// ─── ProductCard ──────────────────────────────────────────────────────────────

interface ProductCardProps {
  product:  Product
  onSelect: (product: Product) => void
}

const ProductCard = memo(function ProductCard({ product, onSelect }: ProductCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0  }}
      exit={{    opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.48, ease: EASE_CINEMATIC }}
      whileHover={{
        y: -8,
        transition: { type: "spring", stiffness: 60, damping: 22 },
      }}
      whileTap={{ scale: 1.03, transition: { duration: 0.18 } }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => onSelect(product)}
      className="group cursor-pointer"
    >
      {/* Product image */}
      <div className="relative w-full aspect-[4/5] overflow-hidden mb-5">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Category badge */}
        <div className="absolute top-4 left-4 z-10">
          <span className="text-[7px] tracking-[0.28em] uppercase text-stone-700
                           bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full">
            {product.category}
          </span>
        </div>

        {/* Hover CTA — View Product */}
        <div className="absolute inset-0 flex items-center justify-center bg-stone-900/[0.04]">
          <AnimatePresence>
            {hovered && (
              <motion.button
                key="view-btn"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.28, ease: EASE_CINEMATIC }}
                onClick={(e) => { e.stopPropagation(); onSelect(product) }}
                className="bg-neutral-900 text-white px-6 py-3 text-sm font-medium
                           tracking-wider uppercase shadow-lg cursor-pointer"
              >
                View Product
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1.5">
        <h3
          style={EDITORIAL}
          className="text-[1.05rem] font-light text-stone-700 leading-snug tracking-[0.01em]
                     group-hover:text-stone-900 transition-colors duration-500"
        >
          {product.name}
        </h3>
        <p className="text-[8px] tracking-[0.26em] uppercase text-stone-600">
          {product.material}
        </p>
        <p className="text-[10px] tracking-[0.18em] text-stone-700 pt-0.5">
          PKR {product.price.toLocaleString()}
        </p>
        <div onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/shop/${product.id}`}
            className="inline-block text-[7px] tracking-[0.28em] uppercase
                       text-stone-700 hover:text-stone-900 transition-colors duration-300
                       underline underline-offset-[3px] mt-1"
          >
            View Details
          </Link>
        </div>
      </div>
    </motion.article>
  )
})

// ─── ActiveChips ──────────────────────────────────────────────────────────────

interface Chip {
  id:    string
  label: string
  clear: () => void
}

function ActiveChips({
  chips, onClearAll,
}: {
  chips: Chip[]; onClearAll: () => void;
}) {
  if (chips.length === 0) return null
  return (
    <motion.div
      initial={{ opacity: 0, scaleY: 0 }}
      animate={{ opacity: 1, scaleY: 1 }}
      exit={{    opacity: 0, scaleY: 0 }}
      transition={{ duration: 0.3, ease: EASE_CINEMATIC }}
      style={{ transformOrigin: "top", overflow: "hidden", willChange: "transform, opacity" }}
      className="mb-8"
    >
      <div className="flex flex-wrap gap-2 pt-px">
        <AnimatePresence mode="popLayout">
          {chips.map((chip) => (
            <motion.button
              key={chip.id}
              layout
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1    }}
              exit={{    opacity: 0, scale: 0.88 }}
              transition={{ duration: 0.2 }}
              onClick={chip.clear}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-full
                         bg-stone-100 border border-stone-200/70
                         hover:border-stone-300 hover:bg-stone-50
                         transition-colors duration-300"
            >
              <span className="text-[8px] tracking-[0.16em] uppercase text-stone-700">
                {chip.label}
              </span>
              <X
                size={8}
                strokeWidth={2}
                className="text-stone-600 group-hover:text-stone-700 transition-colors duration-300"
              />
            </motion.button>
          ))}

          {chips.length > 1 && (
            <motion.button
              key="clear-all"
              layout
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1    }}
              exit={{    opacity: 0, scale: 0.88 }}
              transition={{ duration: 0.2 }}
              onClick={onClearAll}
              className="flex items-center px-3 py-1.5 text-[8px] tracking-[0.16em]
                         uppercase text-stone-600 hover:text-stone-700
                         transition-colors duration-300 underline underline-offset-2"
            >
              Clear All
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ─── ShopPageView ─────────────────────────────────────────────────────────────

export default function ShopPageView({ products, content }: { products: Product[]; content: ShopPageContent }) {
  const [filters,        setFilters]        = useState<FilterState>(INITIAL_FILTERS)
  const [drawerOpen,      setDrawerOpen]      = useState(false)
  const [activeCategory,  setActiveCategory]  = useState<CategoryNav>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const { cart, addToCart } = useCart()
  const [toast, setToast]   = useState<string | null>(null)

  const setFilter = useCallback(<K extends keyof FilterState>(key: K, val: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: val }))
  }, [])

  const clearAll = useCallback(() => setFilters(INITIAL_FILTERS), [])

  // Category nav reflects the live catalog — distinct, non-empty categories in
  // the order products first introduce them. Empty when there are no products.
  const categoryNav = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
    [products],
  )

  // Material filter options — distinct, non-empty materials in the live catalog.
  const materialNav = useMemo(
    () => Array.from(new Set(products.map((p) => p.material).filter(Boolean))),
    [products],
  )

  // Derived: filtered + sorted products
  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (activeCategory && p.category !== activeCategory) return false
      // Only bound by price when the slider is actually moved off its extremes.
      // At the floor/ceiling the range means "and below"/"and above" (the max
      // label already shows "150,000+"), so products priced outside the nominal
      // 20k–150k catalog range aren't silently hidden.
      if (filters.priceMin > PRICE_MIN && p.price < filters.priceMin) return false
      if (filters.priceMax < PRICE_MAX && p.price > filters.priceMax) return false
      if (filters.materials.length > 0 && !filters.materials.includes(p.material)) return false
      if (filters.dimH && p.dimensions.h < Number(filters.dimH)) return false
      if (filters.dimW && p.dimensions.w < Number(filters.dimW)) return false
      if (filters.dimD && p.dimensions.d < Number(filters.dimD)) return false
      return true
    })
    if (filters.sort === "price-asc")  list = [...list].sort((a, b) => a.price - b.price)
    if (filters.sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price)
    return list
  }, [products, filters, activeCategory])

  // Derived: active chips for dismissed display
  const chips = useMemo<Chip[]>(() => {
    const out: Chip[] = []
    const priceChanged =
      filters.priceMin !== INITIAL_FILTERS.priceMin ||
      filters.priceMax !== INITIAL_FILTERS.priceMax
    if (priceChanged) {
      out.push({
        id:    "price",
        label: `${formatPKR(filters.priceMin)} – ${formatPKR(filters.priceMax)}`,
        clear: () => setFilters((p) => ({ ...p, priceMin: PRICE_MIN, priceMax: PRICE_MAX })),
      })
    }
    filters.materials.forEach((m) =>
      out.push({
        id:    `mat-${m}`,
        label: m,
        clear: () => setFilters((p) => ({ ...p, materials: p.materials.filter((x) => x !== m) })),
      })
    )
    if (filters.dimH) out.push({ id: "dimH", label: `H ≥ ${filters.dimH} cm`, clear: () => setFilter("dimH", "") })
    if (filters.dimW) out.push({ id: "dimW", label: `W ≥ ${filters.dimW} cm`, clear: () => setFilter("dimW", "") })
    if (filters.dimD) out.push({ id: "dimD", label: `D ≥ ${filters.dimD} cm`, clear: () => setFilter("dimD", "") })
    return out
  }, [filters, setFilter])

  // Close drawer on escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false)
        setSelectedProduct(null)
        setToast(null)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(id)
  }, [toast])

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#faf9f7]">

        {/* ── Page hero ── */}
        <div className="px-8 md:px-12 lg:px-20 pt-36 pb-12 border-b border-stone-100">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ duration: 0.8, ease: EASE_CINEMATIC }}
            className="text-[8px] tracking-[0.52em] uppercase text-stone-600 mb-4"
          >
            {content.eyebrow}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ duration: 1.1, ease: EASE_CINEMATIC, delay: 0.07 }}
            style={EDITORIAL}
            className="text-4xl md:text-[2.9rem] lg:text-[3.4rem] font-light text-stone-800
                       leading-[1.08] tracking-[-0.01em]"
          >
            {content.title}
          </motion.h1>
        </div>

        {/* ── Two-column layout ── */}
        <div className="lg:grid lg:grid-cols-[280px_1fr]">

          {/* ════ Desktop sidebar ════ */}
          <aside className="hidden lg:block border-r border-stone-100">
            <div
              className="sticky top-[72px] h-[calc(100vh-72px)] overflow-y-auto
                         px-10 py-12 overscroll-contain"
            >
              <FilterPanel
                filters={filters}
                onChange={setFilter}
                onClearAll={clearAll}
                categories={categoryNav}
                materialOptions={materialNav}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
              />
            </div>
          </aside>

          {/* ════ Product column ════ */}
          <div className="px-6 md:px-10 lg:px-14 py-10 pb-32">

            {/* Active chips */}
            <AnimatePresence>
              {chips.length > 0 && (
                <ActiveChips chips={chips} onClearAll={clearAll} />
              )}
            </AnimatePresence>

            {/* Results meta */}
            <div className="flex items-baseline justify-between mb-10">
              <motion.p
                key={filtered.length}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="text-[9px] tracking-[0.32em] uppercase text-stone-600"
              >
                {filtered.length} {filtered.length === 1 ? "Piece" : "Pieces"}
              </motion.p>
            </div>

            {/* Grid */}
            <AnimatePresence mode="popLayout">
              {filtered.length > 0 ? (
                <motion.div
                  key="grid"
                  layout
                  className="relative grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3
                             gap-x-8 gap-y-16 pb-24"
                >
                  <AnimatePresence mode="popLayout">
                    {filtered.map((product) => (
                      <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} />
                    ))}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0  }}
                  exit={{    opacity: 0        }}
                  transition={{ duration: 0.5, ease: EASE_CINEMATIC }}
                  className="flex flex-col items-center justify-center py-40 gap-6 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border border-stone-200" />
                  </div>
                  <p className="text-[8px] tracking-[0.42em] uppercase text-stone-600">No Items Found</p>
                  <p style={EDITORIAL} className="text-lg font-light text-stone-700 max-w-[220px] leading-relaxed">
                    Try adjusting your filters to find more pieces
                  </p>
                  <button
                    onClick={clearAll}
                    className="text-[8px] tracking-[0.28em] uppercase text-stone-600
                               underline underline-offset-2 hover:text-stone-900
                               transition-colors duration-300"
                  >
                    Clear All
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </main>

      {/* ════ Success toast ════ */}
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
            <div
              className="pointer-events-auto flex items-center gap-4 px-6 py-4
                         bg-white/85 backdrop-blur-xl border border-stone-200/60
                         shadow-[0_8px_40px_rgba(0,0,0,0.07),0_2px_8px_rgba(0,0,0,0.04)]
                         rounded-full max-w-lg w-full"
            >
              {/* Check mark */}
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-stone-900 flex items-center justify-center">
                <Check size={10} strokeWidth={2.5} className="text-white" />
              </span>

              {/* Message */}
              <p className="flex-1 text-[9px] tracking-[0.18em] uppercase text-stone-700 leading-none">
                <span style={EDITORIAL} className="text-[0.95rem] font-light text-neutral-900 normal-case tracking-normal not-italic">
                  {toast}
                </span>
                <span className="mx-2 text-stone-600">·</span>
                added to your bag
              </p>

              {/* Dismiss */}
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

      {/* ════ Mobile filter pill ════ */}
      <div className="lg:hidden fixed bottom-6 inset-x-0 flex justify-center z-40 pointer-events-none">
        <motion.button
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          transition={{ ...SPRING_DRAWER, delay: 0.6 }}
          style={{ willChange: "transform, opacity" }}
          onClick={() => setDrawerOpen(true)}
          className="pointer-events-auto flex items-center gap-2.5 px-6 py-3.5 rounded-full
                     backdrop-blur-md bg-white/75 border border-white/40
                     shadow-[0_8px_32px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.06)]
                     text-stone-700 hover:shadow-[0_12px_40px_rgba(0,0,0,0.14)]
                     transition-shadow duration-500"
        >
          <SlidersHorizontal size={14} strokeWidth={1.5} />
          <span className="text-[9px] tracking-[0.32em] uppercase">Filter &amp; Sort</span>
          <AnimatePresence>
            {chips.length > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{    scale: 0, opacity: 0 }}
                transition={SPRING_DRAWER}
                className="flex items-center justify-center w-4 h-4 rounded-full
                           bg-stone-800 text-white text-[7px] leading-none"
              >
                {chips.length}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* ════ Product detail modal ════ */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm
                       flex items-center justify-center p-4"
            onClick={() => setSelectedProduct(null)}
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
                onClick={() => setSelectedProduct(null)}
                aria-label="Close"
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center
                           text-neutral-600 hover:text-neutral-900 transition-colors duration-300 cursor-pointer"
              >
                <X size={16} strokeWidth={1.5} />
              </button>

              {/* Image */}
              <div className="w-full md:w-[48%] aspect-[4/5] flex-shrink-0 overflow-hidden rounded-md">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Details */}
              <div className="flex flex-col justify-center gap-4 flex-1 pt-4 md:pt-0">
                <div className="space-y-1.5">
                  <h2
                    style={EDITORIAL}
                    className="text-[1.7rem] font-light text-neutral-900 leading-snug tracking-tight"
                  >
                    {selectedProduct.name}
                  </h2>
                  <p className="text-[8px] tracking-[0.3em] uppercase text-neutral-600">
                    {selectedProduct.material}
                  </p>
                </div>

                <p className="text-neutral-600 text-sm leading-relaxed mb-6 line-clamp-2">
                  {selectedProduct.description}
                </p>

                <p className="text-[9px] tracking-[0.18em] text-neutral-700 leading-relaxed">
                  H&nbsp;{selectedProduct.dimensions.h}&nbsp;·&nbsp;
                  W&nbsp;{selectedProduct.dimensions.w}&nbsp;·&nbsp;
                  D&nbsp;{selectedProduct.dimensions.d}&nbsp;cm
                </p>

                <p className="text-xl font-semibold tracking-wider text-neutral-900">
                  {selectedProduct.discountPrice != null && selectedProduct.discountPrice > 0 ? (
                    <>
                      <span className="line-through font-normal text-neutral-400 mr-2">
                        PKR {selectedProduct.price.toLocaleString()}
                      </span>
                      PKR {selectedProduct.discountPrice.toLocaleString()}
                    </>
                  ) : (
                    <>PKR {selectedProduct.price.toLocaleString()}</>
                  )}
                </p>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const item = selectedProduct
                    addToCart({
                      id:       item.id,
                      name:     item.name,
                      material: item.material,
                      price:    item.price,
                      image:    item.image,
                    })
                    setSelectedProduct(null)
                    setToast(item.name)
                  }}
                  className="mt-1 w-full py-4 bg-neutral-900 text-white
                             text-[9px] tracking-[0.4em] uppercase font-medium
                             hover:bg-neutral-700 transition-colors duration-300 cursor-pointer"
                >
                  {cart.some((i) => i.id === selectedProduct.id) ? "Added to Collection" : "Add to Cart"}
                </motion.button>

                <Link
                  href={`/shop/${selectedProduct.id}`}
                  onClick={() => setSelectedProduct(null)}
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

      {/* ════ Mobile filter drawer ════ */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="filter-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{    opacity: 0 }}
              transition={{ duration: 0.32 }}
              style={{ willChange: "opacity" }}
              className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] lg:hidden"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />

            {/* Panel */}
            <motion.div
              key="filter-panel"
              role="dialog"
              aria-label="Filter and sort"
              aria-modal="true"
              initial={{ y: "100%" }}
              animate={{ y: 0         }}
              exit={{    y: "100%" }}
              transition={SPRING_DRAWER}
              style={{ willChange: "transform" }}
              className="fixed inset-x-0 bottom-0 z-[60] lg:hidden
                         max-h-[90vh] flex flex-col rounded-t-3xl
                         backdrop-blur-md bg-white/70 border-t border-white/30
                         shadow-[0_-20px_60px_rgba(0,0,0,0.10)]"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-4 pb-2 flex-shrink-0">
                <div className="w-10 h-[3px] rounded-full bg-stone-200" />
              </div>

              {/* Drawer header */}
              <div className="flex items-center justify-between px-7 pt-2 pb-5
                              border-b border-stone-100/60 flex-shrink-0">
                <p className="text-[9px] tracking-[0.44em] uppercase text-stone-700">Filter &amp; Sort</p>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close filters"
                  className="w-7 h-7 flex items-center justify-center rounded-full
                             text-stone-600 hover:text-stone-800 hover:bg-stone-100/50
                             transition-colors duration-300"
                >
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>

              {/* Scrollable filters */}
              <div className="overflow-y-auto overscroll-contain px-7 py-8 flex-1">
                <FilterPanel
                  filters={filters}
                  onChange={setFilter}
                  onClearAll={clearAll}
                  categories={categoryNav}
                  materialOptions={materialNav}
                  activeCategory={activeCategory}
                  onCategoryChange={setActiveCategory}
                />
              </div>

              {/* Apply CTA */}
              <div className="px-7 pb-8 pt-5 border-t border-stone-100/60 flex-shrink-0">
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-full py-4 bg-stone-900 text-white
                             text-[9px] tracking-[0.4em] uppercase
                             hover:bg-stone-700 transition-colors duration-500"
                >
                  View {filtered.length} {filtered.length === 1 ? "Piece" : "Pieces"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
