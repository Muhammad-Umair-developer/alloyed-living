"use client"

import { useState, useCallback, useMemo, useId, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Lock, ShieldCheck, Truck, Check, ArrowRight } from "lucide-react"
import Header from "@/src/components/layout/Header"
import ToastContainer, { toast } from "@/src/components/ui/ToastAlert"
import { type CartItem, useCart } from "@/src/context/CartContext"
import { useAuth } from "@/src/context/AuthContext"
import { placeOrderAction } from "@/src/actions/store-actions"
import { createSafepayCheckout } from "@/src/actions/safepay-actions"

// ─── Constants ────────────────────────────────────────────────────────────────

const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}

const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]
const SPRING_STD = { type: "spring", stiffness: 50, damping: 20 } as const

// ─── Pakistani geography ──────────────────────────────────────────────────────

const PROVINCES = [
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Islamabad Capital Territory",
  "Azad Kashmir",
  "Gilgit-Baltistan",
] as const

type Province = (typeof PROVINCES)[number]

const CITIES: Record<Province, string[]> = {
  "Punjab": [
    "Lahore", "Rawalpindi", "Faisalabad", "Multan", "Gujranwala", "Sialkot",
    "Bahawalpur", "Sargodha", "Sheikhupura", "Jhang", "Rahim Yar Khan",
    "Gujrat", "Kasur", "Okara", "Wah Cantonment", "Dera Ghazi Khan",
    "Sahiwal", "Mianwali", "Chiniot", "Hafizabad", "Attock", "Chakwal",
  ],
  "Sindh": [
    "Karachi", "Hyderabad", "Sukkur", "Larkana", "Nawabshah",
    "Mirpurkhas", "Jacobabad", "Shikarpur", "Khairpur", "Thatta",
    "Dadu", "Sanghar", "Badin", "Tando Adam", "Tando Allahyar",
  ],
  "Khyber Pakhtunkhwa": [
    "Peshawar", "Abbottabad", "Mardan", "Swat", "Mansehra",
    "Kohat", "Nowshera", "Charsadda", "Bannu", "Dera Ismail Khan",
    "Haripur", "Swabi", "Buner", "Lakki Marwat", "Karak",
  ],
  "Balochistan": [
    "Quetta", "Gwadar", "Turbat", "Khuzdar", "Hub",
    "Chaman", "Zhob", "Loralai", "Sibbi", "Dera Bugti",
    "Kharan", "Panjgur", "Mastung", "Kalat", "Lasbela",
  ],
  "Islamabad Capital Territory": ["Islamabad"],
  "Azad Kashmir":                ["Muzaffarabad", "Mirpur", "Rawalakot", "Bagh", "Kotli", "Bhimber"],
  "Gilgit-Baltistan":            ["Gilgit", "Hunza", "Skardu", "Chilas", "Ghanche", "Astore"],
}

const AREAS: Partial<Record<string, string[]>> = {
  "Lahore":     ["DHA Phase 1–6", "Gulberg III", "Model Town", "Johar Town", "Garden Town", "Bahria Town", "Cantonment", "Shadman"],
  "Karachi":    ["DHA Phase 1–8", "Clifton", "Gulshan-e-Iqbal", "PECHS", "Nazimabad", "Bahria Town", "North Nazimabad", "Malir Cantt"],
  "Islamabad":  ["F-6 / Supermarket", "F-7 / Jinnah Super", "F-8", "G-9", "G-10", "G-11", "Blue Area", "DHA Phase 1–2"],
  "Rawalpindi": ["Bahria Town", "Saddar", "Satellite Town", "Westridge", "Chaklala Scheme 3"],
  "Faisalabad": ["Gulberg Colony", "Madina Town", "Peoples Colony", "Canal Road", "Millat Town"],
  "Peshawar":   ["Hayatabad", "University Road", "Ring Road", "Cantonment", "Peshawar Saddar"],
  "Multan":     ["Cantt", "Shah Rukn-e-Alam", "New Multan", "Qasim Bela"],
  "Quetta":     ["Satellite Town", "Jinnah Road", "Brewery Road", "Airport Road"],
  "Hyderabad":  ["Qasimabad", "Latifabad", "City Area", "Hirabad"],
  "Gujranwala": ["Model Town", "Civil Lines", "Satellite Town", "GT Road"],
  "Abbottabad": ["Shimla Hill", "Mandian", "Havelian Road", "Jinnahabad"],
}

const DELIVERY_THRESHOLD = 100000

// ─── Form types ───────────────────────────────────────────────────────────────

interface FormData {
  fullName:    string
  email:       string
  phone:       string
  street:      string
  apartment:   string
  province:    string
  city:        string
  area:        string
  postalCode:  string
  cardNumber:  string
  cardName:    string
  cardExpiry:  string
  cardCvv:     string
}

type FormErrors = Partial<Record<keyof FormData, string>>
type PaymentMethod = "safepay" | "cod"

// Tab metadata for the payment switcher.
const PAYMENT_TABS: { id: PaymentMethod; label: string; icon: typeof ShieldCheck }[] = [
  { id: "safepay", label: "Safepay", icon: ShieldCheck },
  { id: "cod",     label: "COD",     icon: Truck },
]

const EMPTY_FORM: FormData = {
  fullName: "", email: "", phone: "",
  street: "", apartment: "", province: "", city: "", area: "", postalCode: "",
  cardNumber: "", cardName: "", cardExpiry: "", cardCvv: "",
}

// ─── Floating label input ─────────────────────────────────────────────────────

interface FloatingInputProps {
  label:       string
  name:        keyof FormData
  value:       string
  onChange:    (name: keyof FormData, val: string) => void
  error?:      string
  type?:       string
  maxLength?:  number
  inputMode?:  React.HTMLAttributes<HTMLInputElement>["inputMode"]
  autoComplete?: string
}

function FloatingInput({
  label, name, value, onChange, error, type = "text", maxLength, inputMode, autoComplete,
}: FloatingInputProps) {
  const [focused, setFocused] = useState(false)
  const id      = useId()
  const lifted  = focused || value.length > 0

  return (
    <div className="relative pt-5">
      <input
        id={id}
        type={type}
        name={name}
        value={value}
        maxLength={maxLength}
        inputMode={inputMode}
        autoComplete={autoComplete}
        onChange={(e) => onChange(name, e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-describedby={error ? `${id}-err` : undefined}
        aria-invalid={!!error}
        className={`
          w-full bg-transparent py-2 pr-2 text-[13px] text-stone-700 tracking-[0.02em]
          border-b outline-none transition-colors duration-400
          ${focused   ? "border-stone-500" : "border-stone-200"}
          ${error     ? "border-[#7a3535]/60" : ""}
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

      <AnimatePresence>
        {error && (
          <motion.p
            id={`${id}-err`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{    opacity: 0        }}
            transition={{ duration: 0.22 }}
            className="mt-1 text-[10px] tracking-[0.1em] text-[#7a3535]"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Floating label select ────────────────────────────────────────────────────

interface FloatingSelectProps {
  label:    string
  name:     keyof FormData
  value:    string
  onChange: (name: keyof FormData, val: string) => void
  options:  string[]
  error?:   string
  disabled?: boolean
}

function FloatingSelect({
  label, name, value, onChange, options, error, disabled = false,
}: FloatingSelectProps) {
  const id              = useId()
  const lifted          = value.length > 0
  const [open, setOpen] = useState(false)
  const containerRef    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div className="relative pt-5" ref={containerRef}>
      {/* Trigger */}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={id}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); !disabled && setOpen((o) => !o) }
          if (e.key === "Escape") setOpen(false)
        }}
        className={`
          w-full py-2 pr-8 text-[13px] tracking-[0.02em] outline-none select-none
          border-b transition-colors duration-300
          ${value ? "text-stone-900" : "text-transparent"}
          ${error    ? "border-[#7a3535]/60" : open ? "border-stone-500" : "border-stone-200"}
          ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        {value || " "}
      </div>

      <motion.div
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: 0.22, ease: EASE_CINEMATIC }}
        className="absolute right-0.5 top-[2.15rem] pointer-events-none"
      >
        <ChevronDown
          size={12}
          strokeWidth={1.5}
          className={disabled ? "text-stone-200" : "text-stone-600"}
        />
      </motion.div>

      {/* Floating label */}
      <motion.label
        id={id}
        animate={
          lifted
            ? { y: -20, scale: 0.78, color: "#a8a29e" }
            : { y: 0,   scale: 1,    color: disabled ? "#d6d3d1" : "#a8a29e" }
        }
        transition={{ ease: EASE_CINEMATIC, duration: 0.26 }}
        style={{ originX: 0 }}
        className="absolute left-0 top-[1.62rem] text-[13px] pointer-events-none"
      >
        {label}
      </motion.label>

      {/* Dropdown list — always opens downward */}
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0,  scaleY: 1    }}
            exit={{    opacity: 0, y: -6, scaleY: 0.95 }}
            transition={{ duration: 0.18, ease: EASE_CINEMATIC }}
            style={{ originY: "top" }}
            className="absolute z-50 top-[calc(100%+4px)] left-0 right-0
                       bg-white border border-stone-200 shadow-lg rounded-sm
                       max-h-56 overflow-y-auto"
          >
            {options.map((opt) => (
              <li
                key={opt}
                role="option"
                aria-selected={value === opt}
                onClick={() => { onChange(name, opt); setOpen(false) }}
                className={`
                  px-4 py-2.5 text-[12px] tracking-[0.03em] cursor-pointer
                  transition-colors duration-150
                  ${value === opt
                    ? "bg-stone-100 text-stone-900 font-medium"
                    : "text-stone-800 hover:bg-stone-50 hover:text-stone-900"}
                `}
              >
                {opt}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{    opacity: 0        }}
            transition={{ duration: 0.22 }}
            className="mt-1 text-[10px] tracking-[0.1em] text-[#7a3535]"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Form section wrapper ─────────────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: EASE_CINEMATIC, duration: 0.6 }}
    >
      <p className="text-[8px] tracking-[0.48em] uppercase text-stone-600 mb-7">{title}</p>
      {children}
    </motion.section>
  )
}

// ─── Order Summary ────────────────────────────────────────────────────────────

function OrderSummary({ items, collapsible = false }: { items: CartItem[]; collapsible?: boolean }) {
  const [open, setOpen] = useState(false)

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const delivery = subtotal >= DELIVERY_THRESHOLD ? 0 : 500
  const total    = subtotal + delivery

  const Content = () => (
    <div>
      {/* Items */}
      {items.length === 0 ? (
        <p className="text-[10px] tracking-[0.18em] text-stone-700 py-6 text-center">
          Your cart is empty.
        </p>
      ) : (
        <ul className="divide-y divide-stone-100/80 mb-6">
          {items.map((item) => (
            <li key={item.id} className="flex gap-4 py-5 first:pt-0">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-14 h-16 rounded-sm object-cover object-center flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-16 rounded-sm bg-gradient-to-br from-stone-100 to-amber-50 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <p style={EDITORIAL} className="text-[0.92rem] font-light text-stone-700 leading-snug">
                    {item.name}
                  </p>
                  {item.material && (
                    <p className="text-[8px] tracking-[0.22em] uppercase text-stone-700 mt-0.5">
                      {item.material}
                    </p>
                  )}
                </div>
                <p className="text-[9px] tracking-[0.16em] text-stone-600">Qty {item.quantity}</p>
              </div>
              <p className="text-[11px] tracking-[0.08em] text-stone-600 flex-shrink-0 pt-0.5">
                PKR {(item.price * item.quantity).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* Totals */}
      <div className="space-y-3 pt-5 border-t border-stone-100">
        <div className="flex justify-between">
          <span className="text-[9px] tracking-[0.28em] uppercase text-stone-600">Subtotal</span>
          <span className="text-[11px] tracking-[0.08em] text-stone-700">PKR {subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[9px] tracking-[0.28em] uppercase text-stone-600">Delivery</span>
          <span className={`text-[11px] tracking-[0.08em] ${delivery === 0 ? "text-[#5c6b4a]" : "text-stone-600"}`}>
            {delivery === 0 ? "Complimentary" : `PKR ${delivery.toLocaleString()}`}
          </span>
        </div>
        <div className="flex justify-between pt-3 border-t border-stone-100">
          <span className="text-[9px] tracking-[0.32em] uppercase text-stone-600 font-medium">Total</span>
          <span style={EDITORIAL} className="text-[1.1rem] font-light text-stone-800 tracking-wide">
            PKR {total.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Trust line */}
      <div className="flex items-center gap-2 mt-6 pt-5 border-t border-stone-100/60">
        <Lock size={10} strokeWidth={1.5} className="text-stone-600 flex-shrink-0" />
        <p className="text-[8px] tracking-[0.18em] text-stone-700 leading-relaxed">
          Secure checkout — your data is encrypted end-to-end
        </p>
      </div>
    </div>
  )

  if (!collapsible) {
    return (
      <div className="bg-[#f7f5f2] border border-stone-100 rounded-sm px-8 py-8">
        <p className="text-[8px] tracking-[0.44em] uppercase text-stone-600 mb-7">Order Summary</p>
        <Content />
      </div>
    )
  }

  // Mobile collapsible version
  return (
    <div className="border-b border-stone-100">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 bg-[#f7f5f2] cursor-pointer hover:bg-[#f0ede9] transition-colors duration-300"
      >
        <span className="text-[8px] tracking-[0.44em] uppercase text-stone-700">Order Summary</span>
        <div className="flex items-center gap-3">
          <span style={EDITORIAL} className="text-[0.92rem] text-stone-700 font-light">
            PKR {(subtotal + delivery).toLocaleString()}
          </span>
          <ChevronDown
            size={12}
            strokeWidth={1.5}
            className={`text-stone-600 transition-transform duration-400 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{    height: 0, opacity: 0 }}
            transition={{ ease: EASE_CINEMATIC, duration: 0.42 }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-6 py-6 bg-[#f7f5f2]">
              <Content />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Payment switcher ─────────────────────────────────────────────────────────

// Cash-on-Delivery panel — no online payment; the order is placed and settled
// in cash on arrival.
function CodPanel() {
  const steps = [
    "Place your order — no payment required online.",
    "Receive an SMS with your order ID within 30 minutes.",
    "Our support team calls within 2 business hours to confirm.",
    "White-glove delivery in 5–7 days (Karachi) or 7–10 days nationally.",
    "Pay in cash on arrival. No card required at any point.",
  ]
  return (
    <div className="border border-stone-100 bg-[#f7f5f2] rounded-sm p-6 space-y-5">
      <p className="text-[8px] tracking-[0.38em] uppercase text-stone-600">How COD Works</p>
      <ol className="space-y-4">
        {steps.map((text, i) => (
          <li key={i} className="flex gap-4">
            <span
              style={EDITORIAL}
              className="text-[1rem] font-light text-stone-700 leading-tight flex-shrink-0 w-6"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="text-[11px] text-stone-700 tracking-[0.04em] leading-relaxed pt-0.5">
              {text}
            </p>
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-2 pt-1">
        <Check size={10} strokeWidth={2} className="text-[#5c6b4a]" />
        <p className="text-[9px] tracking-[0.14em] text-[#5c6b4a]">
          Available across all major cities in Pakistan
        </p>
      </div>
    </div>
  )
}

function PaymentSection({
  method, onMethod,
}: {
  method:   PaymentMethod
  onMethod: (m: PaymentMethod) => void
}) {
  return (
    <div>
      {/* Tab bar */}
      <div className="relative flex border-b border-stone-100 mb-8">
        {PAYMENT_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onMethod(id)}
            className={`
              relative flex-1 py-3.5 flex items-center justify-center gap-2
              text-[8px] tracking-[0.34em] uppercase transition-colors duration-400 cursor-pointer
              ${method === id ? "text-stone-800" : "text-stone-600 hover:text-stone-700 hover:bg-stone-50"}
            `}
          >
            <Icon size={11} strokeWidth={1.5} />
            {label}

            {method === id && (
              <motion.div
                layoutId="payment-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-px bg-stone-900"
                transition={{ ease: EASE_CINEMATIC, duration: 0.4 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Panels */}
      <AnimatePresence mode="wait">
        {method === "safepay" ? (
          <motion.div
            key="safepay-panel"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0    }}
            exit={{    opacity: 0, x:  12  }}
            transition={{ ease: EASE_CINEMATIC, duration: 0.35 }}
          >
            <div className="border border-stone-100 bg-[#f7f5f2] rounded-sm p-6 space-y-5">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={13} strokeWidth={1.5} className="text-[#5c6b4a]" />
                <p className="text-[8px] tracking-[0.38em] uppercase text-stone-600">
                  Secure Redirect
                </p>
              </div>
              <p className="text-[11px] text-stone-700 tracking-[0.04em] leading-relaxed">
                You&apos;ll be securely redirected to Safepay to complete payment in PKR. Card
                details are entered on Safepay&apos;s PCI-compliant page and never touch our
                servers.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Check size={10} strokeWidth={2} className="text-[#5c6b4a]" />
                <p className="text-[9px] tracking-[0.14em] text-[#5c6b4a]">
                  Cards, wallets &amp; bank transfer supported
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="cod-panel"
            initial={{ opacity: 0, x: 12  }}
            animate={{ opacity: 1, x: 0   }}
            exit={{    opacity: 0, x: -12 }}
            transition={{ ease: EASE_CINEMATIC, duration: 0.35 }}
          >
            <CodPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(form: FormData): FormErrors {
  const errs: FormErrors = {}
  const req = (k: keyof FormData, msg: string) => { if (!form[k].trim()) errs[k] = msg }

  req("fullName",   "Full name is required")
  req("email",      "Email address is required")
  req("phone",      "Phone number is required")
  req("street",     "Street address is required")
  req("province",   "Please select a province")
  req("city",       "Please select a city")

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errs.email = "Enter a valid email address"

  if (form.phone && !/^(\+92|0)?3\d{9}$/.test(form.phone.replace(/\s/g, "")))
    errs.phone = "Enter a valid Pakistani mobile number"

  return errs
}

// ─── CheckoutPage ─────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router                = useRouter()
  const { cart, clearCart }   = useCart()
  const { user, loading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [form,    setForm]    = useState<FormData>(EMPTY_FORM)
  const [errors,  setErrors]  = useState<FormErrors>({})
  const [method,  setMethod]  = useState<PaymentMethod>("safepay")
  const [placing, setPlacing] = useState(false)
  const [placed,  setPlaced]  = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Checkout requires an account — the cart itself lives in CartProvider at the
  // root layout, so it survives this redirect and is still there when the user
  // signs in and comes back.
  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.replace("/login?next=/checkout")
    }
  }, [mounted, authLoading, user, router])

  const setField = useCallback((name: keyof FormData, val: string) => {
    setForm((prev) => ({ ...prev, [name]: val }))
    setErrors((prev) => { const next = { ...prev }; delete next[name]; return next })
  }, [])

  // Cascade resets
  const setProvince = useCallback((name: keyof FormData, val: string) => {
    setForm((prev) => ({ ...prev, province: val, city: "", area: "" }))
    setErrors((prev) => { const next = { ...prev }; delete next.province; return next })
  }, [])

  const setCity = useCallback((name: keyof FormData, val: string) => {
    setForm((prev) => ({ ...prev, city: val, area: "" }))
    setErrors((prev) => { const next = { ...prev }; delete next.city; return next })
  }, [])

  const availableCities = useMemo(
    () => (form.province ? CITIES[form.province as Province] ?? [] : []),
    [form.province],
  )

  const availableAreas = useMemo(
    () => (form.city ? (AREAS[form.city] ?? []) : []),
    [form.city],
  )

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error("Please review the highlighted fields.")
      return
    }
    setPlacing(true)
    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)
    const delivery = subtotal >= DELIVERY_THRESHOLD ? 0 : 500
    try {
      // Prices/totals sent here are display-only — the server recomputes all
      // money values from live product data and rejects tampered carts.
      const result = await placeOrderAction({
        items: cart.map((i) => ({
          productId: i.id,
          name:      i.name,
          price:     i.price,
          quantity:  i.quantity,
          image:     i.image,
        })),
        customer: { name: form.fullName, email: form.email, phone: form.phone },
        shippingAddress: {
          street:     form.apartment ? `${form.street}, ${form.apartment}` : form.street,
          city:       form.city,
          province:   form.province,
          postalCode: form.postalCode,
          country:    "Pakistan",
        },
        subtotal,
        delivery,
        total: subtotal + delivery,
      }, method)

      if (result.error || !result.orderId) {
        toast.error(result.error ?? "Something went wrong placing your order. Please try again.")
        setPlacing(false)
        return
      }
      const orderId = result.orderId

      // ── Safepay: hand off to the hosted checkout. The server recomputes the
      // real total from product prices, so no amount is sent from here. ──
      if (method === "safepay") {
        const result = await createSafepayCheckout(orderId)
        if (result.url) {
          // Navigate to Safepay's hosted page. The cart is cleared on the
          // success page only after the payment is verified.
          window.location.href = result.url
          return // keep the spinner while the browser navigates away
        }
        toast.error(result.error ?? "Could not start the payment. Please try again.")
        setPlacing(false)
        return
      }

      // Cash on Delivery — place the order, no online payment.
      clearCart()
      setPlaced(true)
      toast.success("Order placed — our team will be in touch shortly.")
      setPlacing(false)
    } catch {
      toast.error("Something went wrong placing your order. Please try again.")
      setPlacing(false)
    }
  }, [form, method, cart, clearCart])

  if (!mounted || authLoading || !user) return null

  if (placed) {
    return (
      <>
        <Header />
        <ToastContainer />
        <main className="min-h-screen bg-[#faf9f7] flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ ease: EASE_CINEMATIC, duration: 0.9 }}
            className="text-center max-w-sm"
          >
            <div className="w-14 h-14 rounded-full bg-[#f5f3ef] border border-[#9c9c7d]/25
                            flex items-center justify-center mx-auto mb-8">
              <Check size={20} strokeWidth={1.5} className="text-[#5c6b4a]" />
            </div>
            <p style={EDITORIAL} className="text-3xl font-light text-stone-700 mb-3 tracking-wide">
              Thank You
            </p>
            <p className="text-[10px] tracking-[0.28em] uppercase text-stone-600 mb-8">
              Your order has been received
            </p>
            <p className="text-[11px] text-stone-600 tracking-wide leading-relaxed mb-10">
              An order summary with your product details has been emailed to{" "}
              <span className="text-stone-600">{form.email || "your inbox"}</span>.
              Our support team will follow up within 2 business hours to confirm your
              Cash-on-Delivery order.
            </p>
            <Link
              href="/shop"
              className="group inline-flex items-center gap-2 text-[9px] tracking-[0.34em]
                         uppercase text-stone-600 border-b border-stone-200 pb-0.5
                         hover:border-stone-700 hover:text-stone-900 transition-all duration-500"
            >
              Continue Shopping
              <ArrowRight size={10} strokeWidth={1.5}
                className="transition-transform duration-500 group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <ToastContainer />

      <main className="min-h-screen bg-[#faf9f7] pt-24 md:pt-28">

        {/* ── Page title ── */}
        <div className="px-6 md:px-12 lg:px-20 pt-6 pb-4 border-b border-stone-100">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease: EASE_CINEMATIC, duration: 0.7 }}
            className="text-[8px] tracking-[0.5em] uppercase text-stone-600 mb-3"
          >
            Secure Checkout
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ ease: EASE_CINEMATIC, duration: 0.9, delay: 0.06 }}
            style={EDITORIAL}
            className="text-3xl md:text-4xl font-light text-stone-800 tracking-[-0.01em]"
          >
            Complete Your Order
          </motion.h1>
        </div>

        {/* ── Mobile summary ── */}
        <div className="lg:hidden">
          <OrderSummary items={cart} collapsible />
        </div>

        {/* ── Two-column body ── */}
        <div className="lg:grid lg:grid-cols-[1fr_400px] lg:gap-0 min-h-[calc(100vh-180px)]">

          {/* ════ LEFT — Form ════ */}
          <div className="px-6 md:px-12 lg:px-20 py-8 lg:border-r border-stone-100">
            <form onSubmit={handleSubmit} noValidate className="max-w-[520px]">

              {/* ── Contact ── */}
              <FormSection title="Contact Information">
                <div className="space-y-6">
                  <FloatingInput
                    label="Full Name"
                    name="fullName"
                    value={form.fullName}
                    onChange={setField}
                    error={errors.fullName}
                    autoComplete="name"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FloatingInput
                      label="Email Address"
                      name="email"
                      value={form.email}
                      onChange={setField}
                      error={errors.email}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                    />
                    <FloatingInput
                      label="Phone (03xxxxxxxxx)"
                      name="phone"
                      value={form.phone}
                      onChange={setField}
                      error={errors.phone}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </FormSection>

              <div className="my-10 border-t border-stone-100" />

              {/* ── Address ── */}
              <FormSection title="Delivery Address">
                <div className="space-y-6">
                  <FloatingInput
                    label="Street Address"
                    name="street"
                    value={form.street}
                    onChange={setField}
                    error={errors.street}
                    autoComplete="street-address"
                  />
                  <FloatingInput
                    label="Apartment, Suite, or Floor (optional)"
                    name="apartment"
                    value={form.apartment}
                    onChange={setField}
                    autoComplete="address-line2"
                  />

                  {/* Cascading selects */}
                  <FloatingSelect
                    label="Province"
                    name="province"
                    value={form.province}
                    onChange={setProvince}
                    options={[...PROVINCES]}
                    error={errors.province}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FloatingSelect
                      label="City"
                      name="city"
                      value={form.city}
                      onChange={setCity}
                      options={availableCities}
                      error={errors.city}
                      disabled={!form.province}
                    />

                    {availableAreas.length > 0 ? (
                      <FloatingSelect
                        label="Area / Neighbourhood"
                        name="area"
                        value={form.area}
                        onChange={setField}
                        options={availableAreas}
                        disabled={!form.city}
                      />
                    ) : (
                      <FloatingInput
                        label="Area / Neighbourhood"
                        name="area"
                        value={form.area}
                        onChange={setField}
                      />
                    )}
                  </div>

                  <FloatingInput
                    label="Postal Code"
                    name="postalCode"
                    value={form.postalCode}
                    onChange={setField}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={5}
                  />
                </div>
              </FormSection>

              <div className="my-10 border-t border-stone-100" />

              {/* ── Payment ── */}
              <FormSection title="Payment Method">
                <PaymentSection
                  method={method}
                  onMethod={setMethod}
                />
              </FormSection>

              <div className="my-10 border-t border-stone-100" />

              {/* ── Submit ── */}
              <motion.button
                type="submit"
                disabled={placing}
                whileTap={{ scale: 0.99 }}
                transition={SPRING_STD}
                className="group relative w-full py-4 bg-stone-900 text-white overflow-hidden
                           text-[9px] tracking-[0.42em] uppercase cursor-pointer
                           disabled:opacity-60 disabled:cursor-not-allowed
                           hover:bg-stone-700 active:bg-stone-950 transition-colors duration-300"
              >
                <AnimatePresence mode="wait">
                  {placing ? (
                    <motion.span
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{    opacity: 0 }}
                      className="flex items-center justify-center gap-3"
                    >
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                        className="w-3 h-3 border border-white/40 border-t-white rounded-full block"
                      />
                      Processing
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{    opacity: 0 }}
                      className="flex items-center justify-center gap-3"
                    >
                      {method === "safepay" ? "Pay with Safepay" : "Confirm COD Order"}
                      <ArrowRight
                        size={10}
                        strokeWidth={1.5}
                        className="transition-transform duration-500 group-hover:translate-x-1"
                      />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              <p className="mt-4 flex items-center justify-center gap-1.5
                            text-[8px] tracking-[0.16em] text-stone-700">
                <Lock size={9} strokeWidth={1.5} />
                256-bit SSL encryption
                {method === "safepay" && " · Payments secured by Safepay"}
              </p>

            </form>
          </div>

          {/* ════ RIGHT — Sticky summary (desktop) ════ */}
          <div className="hidden lg:block">
            <div className="sticky top-[88px] px-12 pt-0 pb-8">
              <OrderSummary items={cart} />
            </div>
          </div>

        </div>
      </main>
    </>
  )
}
