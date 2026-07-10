"use client"

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, UploadCloud, X, FileText, Check, Sparkles, PencilRuler, ChevronDown, Package } from "lucide-react"
import Header from "@/src/components/layout/Header"
import type { CustomOrderPageContent } from "@/src/lib/data/types"

export interface ProductOption {
  id: string
  name: string
  image: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── Design tokens (site palette) ───────────────────────────────────────────────
const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}
const SPRING = { type: "spring", stiffness: 40, damping: 22 } as const
const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]

const MAX_FILES = 10
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB per file — mirrors the API route

// Built-in copy used when the "custom-order" content row hasn't been seeded yet.
// Kept in sync with CUSTOM_ORDER_DEFAULT_FIELDS in the dashboard content layer.
export const CUSTOM_ORDER_DEFAULT: CustomOrderPageContent = {
  eyebrow: "Bespoke",
  heroTitle: "Made For You Alone",
  heroSubtitle:
    "You imagined something the world doesn't have yet — be proud of that. Share your idea and our craftsmen will forge it into a piece that is yours, and yours alone.",
  steps: [
    {
      title: "Share Your Vision",
      description: "Describe the piece you dream of — a brand-new idea, or a bold twist on something you already love.",
    },
    {
      title: "We Shape It Together",
      description: "Our craftsmen turn your concept into a plan — materials, dimensions and finish — and send it back for your blessing.",
    },
    {
      title: "Built By Hand",
      description: "Your one-of-a-kind piece is forged by hand in our Lahore workshop and delivered to your door.",
    },
  ],
  formHeading: "Start Your Commission",
  formSubheading: "Tell us what you have in mind",
}

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { ...SPRING, delay },
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Card-style labelled inputs (distinct from the Contact page) ─────────────────
const labelCls = "block text-[10px] tracking-[0.18em] uppercase text-stone-500 mb-2"
const controlCls =
  "w-full bg-transparent border border-stone-200 rounded-md px-3.5 py-2.5 text-[0.9rem] text-stone-900 outline-none focus:border-stone-800 transition-colors duration-300"

type RequestType = "new" | "modify"

// ── Product picker — a styled dropdown of every catalog item ────────────────────
function ProductSelect({
  products,
  value,
  onChange,
}: {
  products: ProductOption[]
  value: string
  onChange: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = products.find((p) => p.name === value)

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-3 w-full text-left rounded-md border px-3 py-2.5
                    transition-colors duration-300 cursor-pointer
                    ${open ? "border-stone-800" : "border-stone-200 hover:border-stone-400"}`}
      >
        {selected ? (
          <img src={selected.image} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 bg-stone-100" />
        ) : (
          <span className="w-8 h-8 rounded bg-stone-100 flex items-center justify-center flex-shrink-0">
            <Package size={14} strokeWidth={1.5} className="text-stone-400" />
          </span>
        )}
        <span className={`flex-1 min-w-0 truncate text-[0.9rem] ${selected ? "text-stone-900" : "text-stone-400"}`}>
          {selected ? selected.name : "Choose a product…"}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          className={`text-stone-500 flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: EASE_CINEMATIC }}
            className="absolute z-30 mt-2 w-full max-h-64 overflow-auto rounded-md border border-stone-200
                       bg-white shadow-[0_16px_44px_rgba(0,0,0,0.12)] py-1.5"
          >
            {products.length === 0 && (
              <li className="px-3 py-3 text-[0.82rem] text-stone-500">No products available yet.</li>
            )}
            {products.map((p) => {
              const active = p.name === value
              return (
                <li key={p.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(p.name)
                      setOpen(false)
                    }}
                    className={`flex items-center gap-3 w-full text-left px-3 py-2 cursor-pointer
                                transition-colors duration-200
                                ${active ? "bg-stone-50" : "hover:bg-stone-50"}`}
                  >
                    <img src={p.image} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0 bg-stone-100" />
                    <span className={`flex-1 min-w-0 truncate text-[0.85rem] ${active ? "text-stone-900 font-medium" : "text-stone-700"}`}>
                      {p.name}
                    </span>
                    {active && <Check size={14} strokeWidth={2.5} className="text-stone-900 flex-shrink-0" />}
                  </button>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Form ────────────────────────────────────────────────────────────────────────
function CustomOrderForm({ products }: { products: ProductOption[] }) {
  const [fields, setFields] = useState({
    fullName: "",
    email: "",
    phone: "",
    existingProduct: "",
    description: "",
  })
  const [requestType, setRequestType] = useState<RequestType>("new")
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState<"idle" | "sending">("idle")
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (error) setError(null)
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function addFiles(incoming: FileList | File[]) {
    if (error) setError(null)
    const list = Array.from(incoming)
    const tooBig = list.find((f) => f.size > MAX_FILE_BYTES)
    if (tooBig) {
      setError(`"${tooBig.name}" is too large — each file must be under 10MB.`)
      return
    }
    setFiles((prev) => {
      const merged = [...prev]
      for (const f of list) {
        if (!merged.some((m) => m.name === f.name && m.size === f.size)) merged.push(f)
      }
      if (merged.length > MAX_FILES) {
        setError(`Please attach at most ${MAX_FILES} files.`)
        return merged.slice(0, MAX_FILES)
      }
      return merged
    })
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const fullName = fields.fullName.trim()
    const email = fields.email.trim()
    const description = fields.description.trim()
    if (!fullName || !email || !description) {
      setError("Please fill in your name, email, and project description.")
      return
    }
    if (!EMAIL_RE.test(email)) {
      setError("Please enter a valid email address.")
      return
    }
    if (requestType === "modify" && !fields.existingProduct.trim()) {
      setError("Please tell us which existing product you'd like to modify.")
      return
    }

    const body = new FormData()
    body.append("fullName", fullName)
    body.append("email", email)
    body.append("phone", fields.phone.trim())
    body.append("requestType", requestType)
    body.append("existingProduct", fields.existingProduct.trim())
    body.append("description", description)
    files.forEach((f) => body.append("files", f))

    setStatus("sending")
    try {
      const res = await fetch("/api/custom-order", { method: "POST", body })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.ok) {
        setFields({ fullName: "", email: "", phone: "", existingProduct: "", description: "" })
        setRequestType("new")
        setFiles([])
        setSubmitted(true)
      } else {
        setError(data?.error ?? "Something went wrong. Please try again.")
        setStatus("idle")
      }
    } catch {
      setError("Something went wrong. Please try again.")
      setStatus("idle")
    }
  }

  if (submitted) {
    return (
      <motion.div
        className="flex flex-col items-center text-center justify-center min-h-[440px] gap-6 px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
      >
        <div className="w-14 h-14 rounded-full bg-[#f5f3ef] border border-[#9c9c7d]/30 flex items-center justify-center">
          <Check size={22} strokeWidth={1.5} className="text-[#5c6b4a]" />
        </div>
        <h3 style={EDITORIAL} className="text-[clamp(1.9rem,3vw,2.6rem)] font-light text-stone-900 leading-tight">
          Request Received.
        </h3>
        <p className="text-[0.92rem] text-stone-700 leading-relaxed max-w-sm">
          Your custom order request has been received. Our team will get in touch with you within one
          day.
        </p>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-7">
      {/* Client info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label htmlFor="co-name" className={labelCls}>Full Name</label>
          <input id="co-name" name="fullName" value={fields.fullName} onChange={handleChange} className={controlCls} placeholder="Your name" autoComplete="off" />
        </div>
        <div>
          <label htmlFor="co-email" className={labelCls}>Email</label>
          <input id="co-email" name="email" type="email" value={fields.email} onChange={handleChange} className={controlCls} placeholder="you@email.com" autoComplete="off" />
        </div>
        <div>
          <label htmlFor="co-phone" className={labelCls}>Phone</label>
          <input id="co-phone" name="phone" type="tel" value={fields.phone} onChange={handleChange} className={controlCls} placeholder="+92…" autoComplete="off" />
        </div>
      </div>

      {/* Request type — visual cards */}
      <div>
        <span className={labelCls}>What are you commissioning?</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              { value: "new", icon: Sparkles, title: "Completely New Design", desc: "A fresh idea, from a blank page." },
              { value: "modify", icon: PencilRuler, title: "Modify an Existing Product", desc: "Adapt a piece you already love." },
            ] as const
          ).map((opt) => {
            const active = requestType === opt.value
            const Icon = opt.icon
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  if (error) setError(null)
                  setRequestType(opt.value)
                }}
                aria-pressed={active}
                className={`relative text-left rounded-md border px-4 py-4 transition-all duration-300 cursor-pointer
                            ${active
                              ? "border-stone-900 bg-stone-50 ring-1 ring-stone-900"
                              : "border-stone-200 hover:border-stone-400"}`}
              >
                {active && (
                  <span className="absolute top-3 right-3 w-4 h-4 rounded-full bg-stone-900 flex items-center justify-center">
                    <Check size={11} strokeWidth={3} className="text-white" />
                  </span>
                )}
                <Icon size={18} strokeWidth={1.5} className={active ? "text-stone-900" : "text-stone-500"} />
                <p className={`mt-2.5 text-[0.82rem] font-medium ${active ? "text-stone-900" : "text-stone-700"}`}>
                  {opt.title}
                </p>
                <p className="mt-1 text-[0.72rem] text-stone-500 leading-snug">{opt.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Conditional: existing product — pick from the live catalog */}
      {requestType === "modify" && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <span className={labelCls}>Which product would you like to modify?</span>
          <ProductSelect
            products={products}
            value={fields.existingProduct}
            onChange={(name) => {
              if (error) setError(null)
              setFields((prev) => ({ ...prev, existingProduct: name }))
            }}
          />
        </motion.div>
      )}

      {/* Description */}
      <div>
        <label htmlFor="co-desc" className={labelCls}>Project Description</label>
        <textarea
          id="co-desc"
          name="description"
          value={fields.description}
          onChange={handleChange}
          rows={5}
          className={`${controlCls} resize-none leading-relaxed`}
          placeholder="Tell us your idea — dimensions, materials, finishes, the feeling you're after. Don't hold back."
        />
      </div>

      {/* Image upload — drag & drop */}
      <div>
        <span className={labelCls}>Reference Images / Blueprints</span>
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              fileInputRef.current?.click()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-2 text-center
                      border border-dashed rounded-md px-6 py-9 cursor-pointer transition-colors duration-300
                      ${dragging ? "border-stone-700 bg-stone-100/70" : "border-stone-300 hover:border-stone-500 hover:bg-stone-100/40"}`}
        >
          <UploadCloud size={22} strokeWidth={1.4} className="text-stone-500" />
          <p className="text-[0.8rem] text-stone-700">
            Drag &amp; drop files here, or <span className="underline underline-offset-2">browse</span>
          </p>
          <p className="text-[0.68rem] text-stone-500">
            Images or blueprints · up to {MAX_FILES} files · 10MB each
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files)
            e.target.value = ""
          }}
          className="sr-only"
        />

        {files.length > 0 && (
          <ul className="flex flex-col gap-2 mt-3">
            {files.map((f, i) => (
              <li key={`${f.name}-${f.size}-${i}`} className="flex items-center gap-3 border border-stone-200 rounded-md px-3 py-2">
                <FileText size={14} strokeWidth={1.5} className="text-stone-500 flex-shrink-0" />
                <span className="flex-1 min-w-0 truncate text-[0.78rem] text-stone-700">{f.name}</span>
                <span className="text-[0.68rem] text-stone-500 tabular-nums flex-shrink-0">{formatBytes(f.size)}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label={`Remove ${f.name}`}
                  className="flex-shrink-0 p-1 text-stone-500 hover:text-red-600 transition-colors duration-200 cursor-pointer"
                >
                  <X size={13} strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p role="alert" className="text-[0.72rem] tracking-[0.02em] text-red-700/80 leading-relaxed">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="group inline-flex items-center justify-center gap-4 w-full
                   bg-stone-900 text-white
                   px-10 py-4 text-[8.5px] tracking-[0.44em] uppercase
                   hover:bg-stone-700 disabled:opacity-60 disabled:cursor-not-allowed
                   transition-colors duration-500 mt-1 cursor-pointer"
      >
        {status === "sending" ? "Sending" : "Submit Request"}
        <ArrowRight size={11} strokeWidth={1.5} className="translate-x-0 group-hover:translate-x-2 transition-transform duration-500" />
      </button>
    </form>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CustomOrderPageView({
  content,
  products,
}: {
  content: CustomOrderPageContent
  products: ProductOption[]
}) {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#faf9f7]">
        {/* ══ Hero band — full-bleed dark, asymmetric with custom background image ══ */}
        <section className="relative bg-neutral-950 text-white overflow-hidden">
          {/* Background Image Layer */}
          <div className="absolute inset-0 z-0">
            <img
              src="/img.png" // Replace with your actual image path
              alt="Bespoke Commission Hero Background"
              className="w-full h-full object-cover object-center"
            />
            {/* Cinematic dark overlay mask to maintain structural contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/55 to-neutral-950/45" />
          </div>

          <div
            className="absolute -top-24 -right-24 w-[26rem] h-[26rem] rounded-full
                       bg-[radial-gradient(circle,rgba(212,175,120,0.14),transparent_70%)] pointer-events-none z-10"
            aria-hidden
          />
          
          {/* Elevated Content Layer via z-10 */}
          <div className="relative z-10 px-6 md:px-16 lg:px-24 pt-40 pb-24 lg:pb-32">
            <div className="grid lg:grid-cols-[1.4fr_0.6fr] gap-10 items-end">
              <div>
                <motion.span
                  className="block text-[12px] tracking-[0.5em] uppercase text-amber-300/70 mb-8"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                >
                  {content.eyebrow}
                </motion.span>
                <motion.h1
                  style={EDITORIAL}
                  className="text-[clamp(2.8rem,7vw,6rem)] font-light leading-[0.95] tracking-[0.01em] text-white max-w-4xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                >
                  {content.heroTitle}
                </motion.h1>
                <motion.p
                  className="mt-8 text-[0.98rem] md:text-[1.05rem] text-white/80 leading-relaxed max-w-xl"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: "easeOut", delay: 0.28 }}
                >
                  {content.heroSubtitle}
                </motion.p>
              </div>
            </div>
          </div>
        </section>

        {/* ══ How it works — staggered visual steps ══ */}
        <section className="px-6 md:px-16 lg:px-24 py-20 md:py-28 border-b border-stone-200/70">
          <motion.p
            className="text-[8px] tracking-[0.46em] uppercase text-stone-500 mb-12"
            {...fadeUp(0)}
          >
            How It Works
          </motion.p>
          <div className="grid gap-y-12 md:gap-8 md:grid-cols-3">
            {content.steps.map((step, i) => (
              <motion.div
                key={i}
                className={`flex flex-col gap-3 ${i === 1 ? "md:mt-10" : i === 2 ? "md:mt-20" : ""}`}
                {...fadeUp(0.1 + i * 0.12)}
              >
                <span style={EDITORIAL} className="text-[2.6rem] leading-none font-extralight text-stone-300">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="w-8 h-px bg-stone-800" />
                <h3 style={EDITORIAL} className="text-[1.35rem] font-light text-stone-900 leading-tight">
                  {step.title}
                </h3>
                <p className="text-[0.85rem] text-stone-600 leading-relaxed max-w-xs">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ══ Form block — asymmetric grid, elevated card ══ */}
        <section className="px-6 md:px-16 lg:px-24 py-20 md:py-28">
          <div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-12 lg:gap-20 items-start">
            {/* Left — motivating copy */}
            <motion.div className="lg:sticky lg:top-28" {...fadeUp(0)}>
              <span className="block text-[8px] tracking-[0.46em] uppercase text-stone-500 mb-4">
                {content.formHeading}
              </span>
              <h2
                style={EDITORIAL}
                className="text-[clamp(1.8rem,3.2vw,3rem)] font-light text-stone-900 leading-[1.05] mb-6"
              >
                {content.formSubheading}
              </h2>
              <p className="text-[0.92rem] text-stone-600 leading-relaxed max-w-sm">
                No idea is too ambitious. The pieces we are proudest of all started as a single sketch,
                a rough note, or a photo someone was brave enough to send. Yours could be next.
              </p>
              <div className="mt-8 w-12 h-px bg-stone-800" />
            </motion.div>

            {/* Right — the form card */}
            <motion.div
              className="rounded-xl border border-stone-200 bg-white p-6 md:p-9 shadow-[0_20px_60px_rgba(0,0,0,0.05)]"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ ...SPRING, delay: 0.1 }}
            >
              <CustomOrderForm products={products} />
            </motion.div>
          </div>
        </section>
      </main>
    </>
  )
}