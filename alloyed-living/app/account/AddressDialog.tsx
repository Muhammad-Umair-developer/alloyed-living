"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, X } from "lucide-react"
import { toast } from "@/src/components/ui/ToastAlert"
import { createAddressAction, updateAddressAction } from "@/src/actions/account-actions"
import type { Address, AddressInput } from "@/src/lib/data/types"

const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}
const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]

// ─── Pakistani geography ──────────────────────────────────────────────────────
// Reproduced verbatim from checkout/page.tsx (PROVINCES/CITIES) — that file
// doesn't export these, so this is a deliberate duplicate, same pattern as
// FloatingInput being copied rather than shared across login/page.tsx,
// ReturnsPageView.tsx, and ProfileSection.tsx. checkout's AREAS/"area" field
// is NOT reproduced here: addresses has no area column, and checkout itself
// never actually sends `area` to the server (its submit handler drops it —
// confirmed by reading it), so there's nothing to carry over.

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

const EMPTY: AddressInput = {
  label: "",
  street: "",
  city: "",
  province: "",
  postalCode: "",
  country: "Pakistan",
}

// Reproduces the same floating-input building block used elsewhere on this
// page (ProfileSection.tsx) — kept local rather than shared since neither
// existing copy in the app (login/page.tsx, ReturnsPageView.tsx) is exported.
function FloatingInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (val: string) => void
}) {
  const [focused, setFocused] = useState(false)
  const lifted = focused || value.length > 0

  return (
    <div className="relative">
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="
          w-full bg-transparent border-b border-stone-200 pt-6 pb-2
          text-[13px] text-stone-800 tracking-[0.02em]
          outline-none transition-colors duration-300 pr-2
        "
      />
      <label
        htmlFor={id}
        className={`
          absolute left-0 pointer-events-none text-stone-600 transition-all duration-300
          ${lifted
            ? "top-0 text-[8px] tracking-[0.28em] uppercase text-stone-700"
            : "top-[1.35rem] text-[12px] tracking-wide"
          }
        `}
      >
        {label}
      </label>
      <motion.div
        animate={{ scaleX: focused ? 1 : 0 }}
        transition={{ duration: 0.36, ease: EASE_CINEMATIC }}
        className="absolute bottom-0 left-0 right-0 h-px bg-stone-800 origin-left"
      />
    </div>
  )
}

// Reproduced from checkout/page.tsx's FloatingSelect (unexported there) — same
// combobox markup, motion, and interaction (click-outside-close, animated
// chevron, listbox dropdown) so Province/City behave identically to checkout.
function FloatingSelect({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (val: string) => void
  options: string[]
  disabled?: boolean
}) {
  const id = useId()
  const lifted = value.length > 0
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div className="relative pt-5" ref={containerRef}>
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={id}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            if (!disabled) setOpen((o) => !o)
          }
          if (e.key === "Escape") setOpen(false)
        }}
        className={`
          w-full py-2 pr-8 text-[13px] tracking-[0.02em] outline-none select-none
          border-b transition-colors duration-300
          ${value ? "text-stone-900" : "text-transparent"}
          ${open ? "border-stone-500" : "border-stone-200"}
          ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        {value || " "}
      </div>

      <motion.div
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: 0.22, ease: EASE_CINEMATIC }}
        className="absolute right-0.5 top-[2.15rem] pointer-events-none"
      >
        <ChevronDown size={12} strokeWidth={1.5} className={disabled ? "text-stone-200" : "text-stone-600"} />
      </motion.div>

      <motion.label
        id={id}
        animate={
          lifted
            ? { y: -20, scale: 0.78, color: "#a8a29e" }
            : { y: 0, scale: 1, color: disabled ? "#d6d3d1" : "#a8a29e" }
        }
        transition={{ ease: EASE_CINEMATIC, duration: 0.26 }}
        style={{ originX: 0 }}
        className="absolute left-0 top-[1.62rem] text-[13px] pointer-events-none"
      >
        {label}
      </motion.label>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.95 }}
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
                onClick={() => {
                  onChange(opt)
                  setOpen(false)
                }}
                className={`
                  px-4 py-2.5 text-[12px] tracking-[0.03em] cursor-pointer
                  transition-colors duration-150
                  ${value === opt ? "bg-stone-100 text-stone-900 font-medium" : "text-stone-800 hover:bg-stone-50 hover:text-stone-900"}
                `}
              >
                {opt}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function AddressDialog({
  open,
  address,
  onClose,
  onSaved,
}: {
  open:    boolean
  address: Address | null // null = "add new"; set = "edit this one"
  onClose: () => void
  onSaved: (address: Address) => void
}) {
  const [form, setForm] = useState<AddressInput>(EMPTY)
  const [saving, setSaving] = useState(false)

  // Reseed the form whenever the dialog opens for a (possibly different)
  // address, or for a fresh "add" — not on every parent re-render.
  useEffect(() => {
    if (!open) return
    setForm(
      address
        ? {
            label: address.label,
            street: address.street,
            city: address.city,
            province: address.province ?? "",
            postalCode: address.postalCode ?? "",
            country: address.country,
          }
        : EMPTY,
    )
  }, [open, address])

  function set<K extends keyof AddressInput>(key: K, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  // Same cascade as checkout/page.tsx's setProvince: changing province clears
  // whatever city was picked under the old province.
  function setProvince(val: string) {
    setForm((prev) => ({ ...prev, province: val, city: "" }))
  }

  const availableCities = useMemo(
    () => (form.province ? CITIES[form.province as Province] ?? [] : []),
    [form.province],
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.street.trim()) {
      toast.error("Please provide a street address.")
      return
    }
    if (!form.province?.trim() || !form.city.trim()) {
      toast.error("Please select a province and city.")
      return
    }
    setSaving(true)
    const result = address
      ? await updateAddressAction(address.id, form)
      : await createAddressAction(form)
    setSaving(false)
    if (!result.ok || !result.address) {
      toast.error(result.error ?? "Could not save this address.")
      return
    }
    toast.success(address ? "Address updated." : "Address added.")
    onSaved(result.address)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="address-dialog-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[150] bg-stone-900/30 backdrop-blur-[3px] flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            key="address-dialog-box"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.3, ease: EASE_CINEMATIC }}
            onClick={(e) => e.stopPropagation()}
            className="
              relative w-full max-w-md
              backdrop-blur-md bg-white/90 p-8 md:p-10 rounded-xl
              border border-white/40
              shadow-[0_4px_24px_rgba(0,0,0,0.06),0_20px_64px_rgba(0,0,0,0.08)]
            "
            role="dialog"
            aria-modal="true"
            aria-labelledby="address-dialog-title"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-5 right-5 text-stone-500 hover:text-stone-800 transition-colors duration-300 cursor-pointer"
            >
              <X size={16} strokeWidth={1.5} />
            </button>

            <h2
              id="address-dialog-title"
              style={EDITORIAL}
              className="text-[1.7rem] font-light text-stone-900 mb-8"
            >
              {address ? "Edit Address" : "Add Address"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-7" noValidate>
              <FloatingInput id="addr-label" label="Label (Home, Office…)" value={form.label ?? ""} onChange={(v) => set("label", v)} />
              <FloatingInput id="addr-street" label="Street Address" value={form.street} onChange={(v) => set("street", v)} />

              {/* Cascading selects — same data/behavior as checkout/page.tsx */}
              <FloatingSelect label="Province" value={form.province ?? ""} onChange={setProvince} options={[...PROVINCES]} />

              <div className="grid grid-cols-2 gap-5">
                <FloatingSelect
                  label="City"
                  value={form.city}
                  onChange={(v) => set("city", v)}
                  options={availableCities}
                  disabled={!form.province}
                />
                <FloatingInput id="addr-postal" label="Postal Code" value={form.postalCode ?? ""} onChange={(v) => set("postalCode", v)} />
              </div>

              <FloatingInput id="addr-country" label="Country" value={form.country} onChange={(v) => set("country", v)} />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="py-3 px-6 text-[9px] tracking-[0.3em] uppercase text-stone-600 hover:text-stone-900 transition-colors duration-300 disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={saving}
                  whileTap={{ scale: 0.98 }}
                  className="
                    py-3 px-8 bg-stone-900 text-white
                    text-[9px] tracking-[0.4em] uppercase
                    cursor-pointer disabled:opacity-60
                    hover:bg-stone-700 transition-colors duration-500
                  "
                >
                  {saving ? "Saving…" : "Save Address"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
