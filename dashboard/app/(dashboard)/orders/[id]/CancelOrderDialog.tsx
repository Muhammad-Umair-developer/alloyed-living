"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import type { Order } from "@/src/lib/data/types"
import { toast } from "@/src/components/ui/ToastAlert"
import { cancelOrderAction } from "@/src/actions/order-actions"

function refundMessage(order: Order): string {
  if (order.refundStatus === "pending" && order.refundAmount) {
    return `Refund owed: PKR ${order.refundAmount.toLocaleString()} (pending).`
  }
  return "No refund owed (order was already shipped)."
}

// Cancelling needs a typed reason, same as rejecting a payment — this mirrors
// RejectPaymentDialog's exact visual language (backdrop, box, motion, button
// styling) rather than introducing a new design.
export default function CancelOrderDialog({
  order,
  onClose,
}: {
  order: Order | null
  onClose: () => void
}) {
  const router = useRouter()
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    if (submitting) return
    setReason("")
    setError(null)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!order) return
    if (!reason.trim()) {
      setError("Please explain why this order is being cancelled.")
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const cancelled = await cancelOrderAction(order.id, reason)
      if (!cancelled) {
        setError("Order not found.")
        setSubmitting(false)
        return
      }
      toast.success(`Order ${order.id} cancelled. ${refundMessage(cancelled)}`)
      setSubmitting(false)
      setReason("")
      onClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel this order.")
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {order && (
        <motion.div
          key="cancel-order-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[150] bg-stone-900/30 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            key="cancel-order-box"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg bg-white shadow-xl border border-stone-200 p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-order-title"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4 bg-red-50">
              <AlertTriangle size={18} strokeWidth={1.75} className="text-red-600" />
            </div>
            <h2 id="cancel-order-title" className="text-[15px] font-semibold text-stone-900 mb-1.5">
              Cancel this order?
            </h2>
            <p className="text-[13px] text-stone-500 leading-relaxed mb-5">
              Order {order.id} will be marked cancelled. If it hasn&apos;t shipped yet, the downpayment is
              refunded in full; if it has already shipped, no refund is owed.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-[#7a3535]/25 bg-[#f5f0ef] px-3 py-2.5">
                  <AlertTriangle size={14} className="text-[#7a3535] mt-px flex-shrink-0" />
                  <p className="text-[12px] leading-relaxed text-[#5c2e2e]">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="cancel-reason" className="block text-[12px] font-medium text-stone-700 mb-1.5">
                  Reason
                </label>
                <textarea
                  id="cancel-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  autoFocus
                  placeholder="e.g. Customer requested cancellation, out of stock…"
                  className="w-full px-3 py-2 text-[13px] rounded-md border border-stone-200 bg-white outline-none focus:border-stone-400 transition-colors resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="px-4 py-2 text-[13px] font-medium text-stone-600 rounded-md hover:bg-stone-100 transition-colors duration-150 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-[13px] font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors duration-150 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                >
                  {submitting ? "Cancelling…" : "Cancel Order"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
