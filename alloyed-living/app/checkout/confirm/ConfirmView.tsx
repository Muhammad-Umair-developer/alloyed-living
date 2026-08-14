"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Check, Loader2, ArrowRight, Upload } from "lucide-react"
import ToastContainer, { toast } from "@/src/components/ui/ToastAlert"
import { cancelOrderByToken } from "@/src/actions/store-actions"
import type { OrderItem, OrderStatus } from "@/src/lib/data/types"

const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}
const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]

type Status = "awaiting_payment" | "payment_submitted" | "payment_verified" | "payment_rejected"

export interface ConfirmViewProps {
  token:           string
  status:          Status
  // Fulfillment status (distinct from payment `status` above). Only used to
  // gate the Cancel Order control — the customer may only cancel while the
  // order is still 'pending', mirroring the dashboard's own cancellation gate.
  orderStatus:     OrderStatus
  orderId:         string
  items:           OrderItem[]
  isCod:           boolean
  amountLabel:     string
  amount:          number
  showBalance:     boolean
  balance:         number
  accountLabel:    string
  accountLines:    string[]
  rejectionReason: string | null
}

function pkr(n: number): string {
  return `PKR ${Math.round(n).toLocaleString("en-PK")}`
}

// Reused in both the pre-upload (awaiting/rejected) and post-upload (settled)
// states, so the item breakdown carried by the old awaiting-payment email is
// still visible here even after that email was removed.
function OrderItemsSummary({ items }: { items: OrderItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="border border-stone-100 bg-[#f7f5f2] rounded-sm p-6 text-left mb-10">
      <p className="text-[8px] tracking-[0.38em] uppercase text-stone-600 mb-4">Order Summary</p>
      <ul className="divide-y divide-stone-100/80">
        {items.map((item, i) => (
          <li key={`${item.productId}-${i}`} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                className="w-12 h-12 rounded-sm object-cover object-center flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-sm bg-gradient-to-br from-stone-100 to-amber-50 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-stone-700 leading-snug truncate">{item.name}</p>
              <p className="text-[10px] tracking-[0.1em] text-stone-600 mt-0.5">Qty {item.quantity}</p>
            </div>
            <p className="text-[11px] text-stone-600 tracking-[0.04em] flex-shrink-0">
              {pkr(item.price * item.quantity)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

type CancelState = "idle" | "confirming" | "submitting"

// Self-contained cancel trigger + inline confirmation, reused in both the
// payment_submitted and payment_verified branches below. Deliberately no
// free-text reason field — cancelOrderByToken always sends a fixed
// "Cancelled by customer" reason, so there's nothing here to moderate.
function CancelOrderControl({
  state,
  onRequest,
  onConfirm,
  onBack,
}: {
  state:      CancelState
  onRequest:  () => void
  onConfirm:  () => void
  onBack:     () => void
}) {
  if (state === "idle") {
    return (
      <button
        onClick={onRequest}
        className="mt-8 text-[9px] tracking-[0.3em] uppercase text-stone-500 hover:text-[#7a3535] underline underline-offset-4 decoration-stone-300 hover:decoration-[#7a3535] transition-colors duration-300 cursor-pointer"
      >
        Cancel Order
      </button>
    )
  }
  return (
    <div className="mt-8 border border-[#7a3535]/25 bg-[#7a3535]/5 rounded-sm p-5 text-left">
      <p className="text-[11px] text-stone-700 leading-relaxed mb-4">
        Cancel this order? If a deposit was already paid, it will be refunded.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={state === "submitting"}
          className="flex-1 py-2.5 text-[9px] tracking-[0.3em] uppercase text-stone-600 border border-stone-200 rounded-sm hover:bg-stone-50 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Never Mind
        </button>
        <button
          onClick={onConfirm}
          disabled={state === "submitting"}
          className="flex-1 py-2.5 text-[9px] tracking-[0.3em] uppercase text-white bg-[#7a3535] rounded-sm hover:bg-[#6b2e2e] transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {state === "submitting" ? "Cancelling…" : "Yes, Cancel Order"}
        </button>
      </div>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ToastContainer />
      <main className="min-h-screen bg-[#faf9f7] pt-24 md:pt-28 px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease: EASE_CINEMATIC, duration: 0.7 }}
          className="max-w-[520px] mx-auto pb-20"
        >
          {children}
        </motion.div>
      </main>
    </>
  )
}

export default function ConfirmView(props: ConfirmViewProps) {
  const {
    token, status, orderStatus, orderId, items, amountLabel, amount, showBalance, balance,
    accountLabel, accountLines, rejectionReason,
  } = props

  const router = useRouter()
  const [senderName, setSenderName]     = useState("")
  const [senderMobile, setSenderMobile] = useState("")
  const [reference, setReference]       = useState("")
  const [file, setFile]                 = useState<File | null>(null)
  const [submitting, setSubmitting]     = useState(false)

  const [cancelState, setCancelState] = useState<CancelState>("idle")
  const [cancelledRefund, setCancelledRefund] = useState<number | undefined>(undefined)
  const [isCancelled, setIsCancelled] = useState(false)

  async function handleCancelConfirm() {
    setCancelState("submitting")
    const result = await cancelOrderByToken(token)
    if (!result.ok) {
      toast.error(result.error ?? "Could not cancel this order.")
      setCancelState("idle")
      return
    }
    setCancelledRefund(result.refundAmount)
    setIsCancelled(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!senderName.trim() || !reference.trim()) {
      toast.error("Please fill in the sender name and transaction reference.")
      return
    }
    if (!file) {
      toast.error("Please attach your payment receipt.")
      return
    }
    setSubmitting(true)
    const fd = new FormData()
    fd.append("token", token)
    fd.append("senderName", senderName)
    fd.append("senderMobile", senderMobile)
    fd.append("reference", reference)
    fd.append("file", file)
    try {
      const res = await fetch("/api/payment-receipt", { method: "POST", body: fd })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(json.error ?? "Upload failed. Please try again.")
        setSubmitting(false)
        return
      }
      toast.success("Receipt received — we'll confirm shortly.")
      router.refresh()
    } catch {
      toast.error("Upload failed. Please try again.")
      setSubmitting(false)
    }
  }

  // ── Cancelled by the customer just now ─────────────────────────────────────
  // No redirect — shown in place, replacing whatever branch below would have
  // rendered, immediately after cancelOrderByToken succeeds.
  if (isCancelled) {
    return (
      <Shell>
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-[#f5f3ef] border border-[#9c9c7d]/25 flex items-center justify-center mx-auto mb-8">
            <Check size={20} strokeWidth={1.5} className="text-[#5c6b4a]" />
          </div>
          <p style={EDITORIAL} className="text-3xl font-light text-stone-700 mb-3 tracking-wide">Order Cancelled</p>
          <p className="text-[10px] tracking-[0.28em] uppercase text-stone-600 mb-8">Order {orderId}</p>
          <p className="text-[11px] text-stone-600 tracking-wide leading-relaxed mb-10">
            {cancelledRefund
              ? `Your order has been cancelled. A refund of ${pkr(cancelledRefund)} is being processed.`
              : "Your order has been cancelled."}
          </p>
          <Link
            href="/shop"
            className="group inline-flex items-center gap-2 text-[9px] tracking-[0.34em] uppercase text-stone-600 border-b border-stone-200 pb-0.5 hover:border-stone-700 hover:text-stone-900 transition-all duration-500"
          >
            Continue Shopping
            <ArrowRight size={10} strokeWidth={1.5} className="transition-transform duration-500 group-hover:translate-x-1" />
          </Link>
        </div>
      </Shell>
    )
  }

  // ── Verified ────────────────────────────────────────────────────────────────
  if (status === "payment_verified") {
    return (
      <Shell>
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-[#f5f3ef] border border-[#9c9c7d]/25 flex items-center justify-center mx-auto mb-8">
            <Check size={20} strokeWidth={1.5} className="text-[#5c6b4a]" />
          </div>
          <p style={EDITORIAL} className="text-3xl font-light text-stone-700 mb-3 tracking-wide">Payment Verified</p>
          <p className="text-[10px] tracking-[0.28em] uppercase text-stone-600 mb-8">Order {orderId} confirmed</p>
          <p className="text-[11px] text-stone-600 tracking-wide leading-relaxed mb-10">
            Thank you — your payment is verified and your order is confirmed. A confirmation email is on its way.
          </p>
          <Link
            href="/shop"
            className="group inline-flex items-center gap-2 text-[9px] tracking-[0.34em] uppercase text-stone-600 border-b border-stone-200 pb-0.5 hover:border-stone-700 hover:text-stone-900 transition-all duration-500"
          >
            Continue Shopping
            <ArrowRight size={10} strokeWidth={1.5} className="transition-transform duration-500 group-hover:translate-x-1" />
          </Link>

          {orderStatus === "pending" && (
            <CancelOrderControl
              state={cancelState}
              onRequest={() => setCancelState("confirming")}
              onConfirm={handleCancelConfirm}
              onBack={() => setCancelState("idle")}
            />
          )}
        </div>
      </Shell>
    )
  }

  // ── Receipt received — a settled, final-looking state. No polling, no
  // "still verifying" wording: the customer's part is done; admin review
  // happens out of band and the outcome arrives by email.
  if (status === "payment_submitted") {
    return (
      <Shell>
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-[#f5f3ef] border border-[#9c9c7d]/25 flex items-center justify-center mx-auto mb-8">
            <Check size={20} strokeWidth={1.5} className="text-[#5c6b4a]" />
          </div>
          <p style={EDITORIAL} className="text-3xl font-light text-stone-700 mb-3 tracking-wide">
            Thank You — We&apos;ve Received Your Order
          </p>
          <p className="text-[10px] tracking-[0.28em] uppercase text-stone-600 mb-8">Order {orderId}</p>
          <p className="text-[11px] text-stone-600 tracking-wide leading-relaxed mb-10">
            We&apos;ve received your payment receipt and will confirm your order shortly after verifying the
            payment. A confirmation email will follow. Thank you for your patience.
          </p>

          <OrderItemsSummary items={items} />

          <Link
            href="/shop"
            className="group inline-flex items-center gap-2 text-[9px] tracking-[0.34em] uppercase text-stone-600 border-b border-stone-200 pb-0.5 hover:border-stone-700 hover:text-stone-900 transition-all duration-500"
          >
            Continue Shopping
            <ArrowRight size={10} strokeWidth={1.5} className="transition-transform duration-500 group-hover:translate-x-1" />
          </Link>

          {orderStatus === "pending" && (
            <CancelOrderControl
              state={cancelState}
              onRequest={() => setCancelState("confirming")}
              onConfirm={handleCancelConfirm}
              onBack={() => setCancelState("idle")}
            />
          )}
        </div>
      </Shell>
    )
  }

  // ── Awaiting / rejected → upload form ────────────────────────────────────────
  const isRejected = status === "payment_rejected"
  return (
    <Shell>
      <p className="text-[8px] tracking-[0.5em] uppercase text-stone-600 mb-3">Confirm Your Order</p>
      <h1 style={EDITORIAL} className="text-3xl md:text-4xl font-light text-stone-800 tracking-[-0.01em] mb-2">
        Upload Your Receipt
      </h1>
      <p className="text-[10px] tracking-[0.28em] uppercase text-stone-600 mb-8">Order {orderId}</p>

      {isRejected && (
        <div className="border border-[#7a3535]/30 bg-[#7a3535]/5 rounded-sm p-4 mb-8">
          <p className="text-[9px] tracking-[0.22em] uppercase text-[#7a3535] mb-1">Previous receipt not accepted</p>
          <p className="text-[11px] text-stone-700 leading-relaxed">
            {rejectionReason || "Please upload a clearer receipt."} Please re-upload below.
          </p>
        </div>
      )}

      {/* Payment instructions */}
      <div className="border border-stone-100 bg-[#f7f5f2] rounded-sm p-6 space-y-5 mb-8">
        <div className="border border-stone-100 bg-white rounded-sm px-5 py-4 text-center">
          <div className="text-[8px] tracking-[0.22em] uppercase text-stone-500">{amountLabel}</div>
          <div style={EDITORIAL} className="text-2xl font-light text-stone-900 mt-1">{pkr(amount)}</div>
          {showBalance && (
            <div className="text-[10px] tracking-[0.08em] text-stone-600 mt-1">
              Balance to courier on delivery — {pkr(balance)}
            </div>
          )}
        </div>

        <div className="border-t border-stone-100 pt-4">
          <p className="text-[8px] tracking-[0.38em] uppercase text-stone-600 mb-2">{accountLabel} — Account Details</p>
          {accountLines.length > 0 ? (
            <div className="space-y-1">
              {accountLines.map((l, i) => (
                <p key={i} className="text-[11px] text-stone-700 tracking-[0.04em] leading-relaxed">{l}</p>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-stone-600 tracking-[0.04em] leading-relaxed">
              Account details will appear here once configured.
            </p>
          )}
        </div>
      </div>

      <OrderItemsSummary items={items} />

      {/* Upload form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="text-[8px] tracking-[0.38em] uppercase text-stone-600">Sender Name</label>
          <input
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            maxLength={200}
            className="w-full bg-transparent py-2 text-[13px] text-stone-700 tracking-[0.02em] border-b border-stone-200 outline-none focus:border-stone-500 transition-colors"
          />
        </div>
        <div>
          <label className="text-[8px] tracking-[0.38em] uppercase text-stone-600">Sender Mobile (optional)</label>
          <input
            value={senderMobile}
            onChange={(e) => setSenderMobile(e.target.value)}
            inputMode="tel"
            maxLength={32}
            className="w-full bg-transparent py-2 text-[13px] text-stone-700 tracking-[0.02em] border-b border-stone-200 outline-none focus:border-stone-500 transition-colors"
          />
        </div>
        <div>
          <label className="text-[8px] tracking-[0.38em] uppercase text-stone-600">Transaction Reference / TID</label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            maxLength={120}
            className="w-full bg-transparent py-2 text-[13px] text-stone-700 tracking-[0.02em] border-b border-stone-200 outline-none focus:border-stone-500 transition-colors"
          />
        </div>
        <div>
          <label className="text-[8px] tracking-[0.38em] uppercase text-stone-600 block mb-2">
            Payment Screenshot or PDF
          </label>
          <label className="flex items-center gap-3 border border-dashed border-stone-300 rounded-sm px-4 py-4 cursor-pointer hover:border-stone-500 transition-colors">
            <Upload size={14} strokeWidth={1.5} className="text-stone-500 flex-shrink-0" />
            <span className="text-[11px] text-stone-600 truncate">
              {file ? file.name : "Choose a JPG, PNG, WebP or PDF (max 5MB)"}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
        </div>

        <motion.button
          type="submit"
          disabled={submitting}
          whileTap={{ scale: 0.99 }}
          className="group relative w-full py-4 bg-stone-900 text-white overflow-hidden text-[9px] tracking-[0.42em] uppercase cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:bg-stone-700 active:bg-stone-950 transition-colors duration-300"
        >
          <span className="flex items-center justify-center gap-3">
            {submitting ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Uploading
              </>
            ) : (
              <>
                Submit Receipt
                <ArrowRight size={10} strokeWidth={1.5} className="transition-transform duration-500 group-hover:translate-x-1" />
              </>
            )}
          </span>
        </motion.button>
      </form>
    </Shell>
  )
}
