"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { toast } from "@/src/components/ui/ToastAlert"
import { cancelOrderByUserAction } from "@/src/actions/store-actions"
import type { Order } from "@/src/lib/data/types"

const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}
const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]

const PRESET_REASONS = [
  "Changed my mind",
  "Found a better price elsewhere",
  "Ordering the wrong item",
  "Delivery taking too long",
] as const

const OTHER = "Other"
const REASON_MAX = 200

function pkr(n: number): string {
  return `PKR ${Math.round(n).toLocaleString("en-PK")}`
}

// Same centered blurred-backdrop shell as AddressDialog.tsx — this app's
// established modal treatment — with a reason selector in place of a form.
export default function CancelOrderDialog({
  order,
  onClose,
  onCancelled,
}: {
  order:       Order | null // null = closed
  onClose:     () => void
  onCancelled: (updated: Order) => void
}) {
  const [selected, setSelected] = useState("")
  const [otherText, setOtherText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Reset the form whenever the dialog opens for a (possibly different) order.
  useEffect(() => {
    if (!order) return
    setSelected("")
    setOtherText("")
  }, [order])

  function handleClose() {
    if (submitting) return
    onClose()
  }

  async function handleConfirm() {
    if (!order) return
    const reason = selected === OTHER ? otherText.trim() : selected
    if (!reason) {
      toast.error("Please select a reason for cancelling.")
      return
    }
    setSubmitting(true)
    const result = await cancelOrderByUserAction(order.id, reason)
    setSubmitting(false)
    if (!result.ok) {
      toast.error(result.error ?? "Could not cancel this order.")
      return
    }
    toast.success("Order cancelled.")
    onCancelled({
      ...order,
      status: "cancelled",
      refundAmount: result.refundAmount,
      refundStatus: result.refundStatus,
    })
    onClose()
  }

  // The order is only ever cancellable while 'pending' (gated by the caller),
  // and cancelOrderByUser's refund rule for a still-pending order is always
  // "refund the full downpayment" — so this is a reliable preview of what the
  // customer will actually get back, not a guess.
  const refundAmount = order?.downpaymentAmount ?? 0
  const canSubmit = selected === OTHER ? otherText.trim().length > 0 : selected.length > 0

  return (
    <AnimatePresence>
      {order && (
        <motion.div
          key="cancel-order-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[150] bg-stone-900/30 backdrop-blur-[3px] flex items-center justify-center p-6"
          onClick={handleClose}
        >
          <motion.div
            key="cancel-order-box"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.3, ease: EASE_CINEMATIC }}
            onClick={(e) => e.stopPropagation()}
            className="
              relative w-full max-w-md max-h-[90vh] overflow-y-auto
              backdrop-blur-md bg-white/90 p-8 md:p-10 rounded-xl
              border border-white/40
              shadow-[0_4px_24px_rgba(0,0,0,0.06),0_20px_64px_rgba(0,0,0,0.08)]
            "
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-order-title"
          >
            <button
              onClick={handleClose}
              aria-label="Close"
              disabled={submitting}
              className="absolute top-5 right-5 text-stone-500 hover:text-stone-800 transition-colors duration-300 cursor-pointer disabled:opacity-50"
            >
              <X size={16} strokeWidth={1.5} />
            </button>

            <h2 id="cancel-order-title" style={EDITORIAL} className="text-[1.7rem] font-light text-stone-900 mb-1.5">
              Cancel Order
            </h2>
            <p className="text-[10px] tracking-[0.28em] uppercase text-stone-600 mb-7">Order {order.id}</p>

            {/* Refund preview — shown before the customer commits */}
            <div className="border border-stone-100 bg-[#f7f5f2] rounded-sm px-5 py-4 mb-7 text-center">
              <div className="text-[8px] tracking-[0.22em] uppercase text-stone-500">You&apos;ll Be Refunded</div>
              <div style={EDITORIAL} className="text-2xl font-light text-stone-900 mt-1">{pkr(refundAmount)}</div>
              <div className="text-[10px] tracking-[0.08em] text-stone-600 mt-1">Processed after cancellation</div>
            </div>

            <p className="text-[9px] tracking-[0.3em] uppercase text-stone-600 mb-3">Reason For Cancelling</p>
            <div className="space-y-2">
              {PRESET_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelected(r)}
                  disabled={submitting}
                  className={`
                    w-full text-left px-4 py-3 text-[12px] rounded-sm border transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                    ${selected === r ? "border-stone-800 bg-stone-50 text-stone-900" : "border-stone-200 text-stone-700 hover:border-stone-400"}
                  `}
                >
                  {r}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelected(OTHER)}
                disabled={submitting}
                className={`
                  w-full text-left px-4 py-3 text-[12px] rounded-sm border transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                  ${selected === OTHER ? "border-stone-800 bg-stone-50 text-stone-900" : "border-stone-200 text-stone-700 hover:border-stone-400"}
                `}
              >
                {OTHER}
              </button>
            </div>

            <AnimatePresence>
              {selected === OTHER && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: EASE_CINEMATIC }}
                  className="overflow-hidden"
                >
                  <textarea
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    maxLength={REASON_MAX}
                    rows={3}
                    autoFocus
                    disabled={submitting}
                    placeholder="Tell us why you're cancelling…"
                    className="w-full mt-3 px-3 py-2 text-[13px] text-stone-800 rounded-sm border border-stone-200 bg-white outline-none focus:border-stone-400 transition-colors resize-none disabled:opacity-50"
                  />
                  <p className="text-[9px] text-stone-400 mt-1 text-right">{otherText.length}/{REASON_MAX}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-3 mt-7">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="flex-1 py-3 text-[9px] tracking-[0.3em] uppercase text-stone-600 border border-stone-200 rounded-sm hover:bg-stone-50 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Never Mind
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting || !canSubmit}
                className="flex-1 py-3 text-[9px] tracking-[0.3em] uppercase text-white bg-[#7a3535] rounded-sm hover:bg-[#6b2e2e] transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? "Cancelling…" : "Confirm Cancellation"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
