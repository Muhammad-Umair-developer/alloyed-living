"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, AlertTriangle, Info, X } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "error" | "info"

interface ToastData {
  id:      string
  variant: ToastVariant
  message: string
}

// ─── Module-level singleton emitter ──────────────────────────────────────────
// No React context needed — toast() can be called from anywhere, including
// inside server-action result handlers in client components.

let _seq = 0
const uid = () => `t${++_seq}`

type Listener = (t: ToastData) => void
const _listeners = new Set<Listener>()

function emit(data: ToastData) {
  _listeners.forEach((fn) => fn(data))
}

export const toast = {
  success: (message: string) => emit({ id: uid(), variant: "success", message }),
  error:   (message: string) => emit({ id: uid(), variant: "error",   message }),
  info:    (message: string) => emit({ id: uid(), variant: "info",    message }),
}

// ─── Visual config per variant ───────────────────────────────────────────────

const VARIANT_CONFIG: Record<
  ToastVariant,
  { bg: string; border: string; icon: React.ReactNode; bar: string; label: string }
> = {
  success: {
    bg:     "bg-[var(--accent-soft)]",
    border: "border-[var(--accent)]/25",
    icon:   <Check size={12} strokeWidth={2} className="text-[var(--accent)]" />,
    bar:    "bg-[var(--accent)]",
    label:  "text-stone-700",
  },
  error: {
    bg:     "bg-[#f5f0ef]",
    border: "border-[#7a3535]/22",
    icon:   <AlertTriangle size={12} strokeWidth={2} className="text-[#7a3535]" />,
    bar:    "bg-[#7a3535]",
    label:  "text-[#5c2e2e]",
  },
  info: {
    bg:     "bg-stone-50",
    border: "border-stone-200",
    icon:   <Info size={12} strokeWidth={1.5} className="text-stone-400" />,
    bar:    "bg-stone-400",
    label:  "text-stone-500",
  },
}

const AUTO_DISMISS_MS = 4200

// ─── Single toast item ────────────────────────────────────────────────────────

function ToastItem({
  data,
  onDismiss,
}: {
  data:      ToastData
  onDismiss: (id: string) => void
}) {
  const cfg      = VARIANT_CONFIG[data.variant]
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => onDismiss(data.id), [data.id, onDismiss])

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [dismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,   scale: 1    }}
      exit={{    opacity: 0, y: -8,  scale: 0.98  }}
      transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.45 }}
      className={`
        relative w-full overflow-hidden
        rounded-md shadow-[0_4px_20px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.04)]
        border ${cfg.bg} ${cfg.border}
      `}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3 px-4 py-3 pr-9">
        <div className="mt-px w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-white/70 border border-white/60">
          {cfg.icon}
        </div>
        <p className={`text-[12.5px] leading-relaxed flex-1 pt-0.5 ${cfg.label}`}>
          {data.message}
        </p>
      </div>

      <button
        onClick={dismiss}
        aria-label="Dismiss notification"
        className="absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center
                   text-stone-400 hover:text-stone-700 transition-colors duration-200
                   rounded-full hover:bg-stone-100/60 cursor-pointer"
      >
        <X size={10} strokeWidth={2} />
      </button>

      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: AUTO_DISMISS_MS / 1000, ease: "linear" }}
        style={{ transformOrigin: "left" }}
        className={`absolute bottom-0 left-0 right-0 h-[1.5px] ${cfg.bar} opacity-40`}
      />
    </motion.div>
  )
}

// ─── Container (render once, in the root layout) ─────────────────────────────

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  useEffect(() => {
    const add: Listener = (t) => setToasts((prev) => [...prev, t])
    _listeners.add(add)
    return () => { _listeners.delete(add) }
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <div
      aria-label="Notifications"
      className="fixed z-[200] pointer-events-none top-5 right-5 w-[340px]"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto mb-2.5">
            <ToastItem data={t} onDismiss={dismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
