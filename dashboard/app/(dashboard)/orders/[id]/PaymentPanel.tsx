"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, FileText, Loader2 } from "lucide-react"
import type { Order } from "@/src/lib/data/types"
import ConfirmDialog from "@/src/components/ui/ConfirmDialog"
import { toast } from "@/src/components/ui/ToastAlert"
import { approvePaymentAction, getReceiptSignedUrlAction } from "@/src/actions/order-actions"
import PaymentStatusBadge from "../PaymentStatusBadge"
import RejectPaymentDialog from "../RejectPaymentDialog"

function methodLabel(o: Order): string {
  if (o.paymentMethod === "cod") {
    const acct = o.depositAccount === "jazzcash" ? "JazzCash" : o.depositAccount === "ubl" ? "UBL" : "—"
    return `Cash on Delivery (Deposit via ${acct})`
  }
  if (o.paymentMethod === "ubl") return "Bank Transfer — UBL"
  if (o.paymentMethod === "jazzcash") return "Bank Transfer — JazzCash"
  return "—"
}

// NEVER guess: a COD order with a missing/unrecognized deposit account
// returns null, which the caller must treat as "cannot safely confirm."
function accountToVerify(o: Order): string | null {
  if (o.paymentMethod === "cod") {
    return o.depositAccount === "jazzcash" ? "JazzCash" : o.depositAccount === "ubl" ? "UBL" : null
  }
  return o.paymentMethod === "jazzcash" ? "JazzCash" : "UBL"
}

function pkr(n?: number): string {
  return n != null ? `PKR ${n.toLocaleString()}` : "—"
}

function fmt(dt?: string): string {
  return dt ? new Date(dt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—"
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-[10px] font-medium uppercase tracking-wide text-stone-500">{label}</span>
      <p className="text-[13px] text-stone-800 mt-0.5 break-words">{value}</p>
    </div>
  )
}

// Extracts an order id referenced in a flag reason like
// "Duplicate reference (matches AL-2026-104213)" so it can be linked.
function conflictingOrderId(reason?: string): string | null {
  if (!reason) return null
  const m = reason.match(/matches\s+(AL-\d{4}-\d+)/i)
  return m ? m[1] : null
}

// Only ever mounted when order.paymentReceiptPath is already known to be set
// (see the caller below), so a signed-URL failure here is NEVER "no receipt" —
// it always means the file exists but couldn't be fetched right now. The UI
// must say so, not claim there's nothing on file.
function ReceiptViewer({ orderId }: { orderId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle")
  const [url, setUrl] = useState<string | null>(null)
  const [isPdf, setIsPdf] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setState("loading")
    getReceiptSignedUrlAction(orderId)
      .then((res) => {
        if (!active) return
        if (!res) {
          console.error(`[ReceiptViewer] No signed URL returned for order ${orderId}'s receipt.`)
          setState("error")
          return
        }
        setUrl(res.url)
        setIsPdf(res.isPdf)
        setState("ready")
      })
      .catch((err) => {
        console.error(`[ReceiptViewer] Failed to load receipt for order ${orderId}:`, err)
        if (active) setState("error")
      })
    return () => {
      active = false
    }
  }, [orderId, attempt])

  if (state === "loading" || state === "idle") {
    return (
      <div className="flex items-center gap-2 text-[12px] text-stone-500 py-6">
        <Loader2 size={14} className="animate-spin" />
        Loading receipt…
      </div>
    )
  }
  if (state === "error" || !url) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-amber-700 py-6">
        <AlertTriangle size={14} className="flex-shrink-0" />
        Couldn&apos;t load the receipt. A file is on record for this order — this is a fetch error, not a
        missing upload.
        <button
          onClick={() => setAttempt((n) => n + 1)}
          className="ml-1 underline underline-offset-2 hover:text-amber-900 cursor-pointer"
        >
          Retry
        </button>
      </div>
    )
  }
  if (isPdf) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-stone-700 border border-stone-200 rounded-md hover:bg-stone-50 transition-colors"
      >
        <FileText size={14} />
        Download receipt (PDF)
      </a>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={`Payment receipt for order ${orderId}`}
      className="max-w-full max-h-[420px] rounded-md border border-stone-200 object-contain"
    />
  )
}

export default function PaymentPanel({ order }: { order: Order }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)

  function handleConfirm() {
    startTransition(async () => {
      const result = await approvePaymentAction(order.id)
      if (!result.ok) {
        toast.error(result.error ?? "Could not verify this payment.")
      } else {
        toast.success(`Order ${order.id} confirmed — the customer has been emailed.`)
      }
      setConfirmOpen(false)
      router.refresh()
    })
  }

  const conflictId = conflictingOrderId(order.paymentFlagReason)

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600">Payment</p>
        <PaymentStatusBadge status={order.paymentStatus} />
      </div>

      {order.paymentFlagged && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2.5">
          <AlertTriangle size={14} className="text-amber-700 mt-px flex-shrink-0" />
          <p className="text-[12px] leading-relaxed text-amber-800">
            {order.paymentFlagReason || "This submission was flagged for review."}
            {conflictId && (
              <>
                {" "}
                <Link href={`/orders/${conflictId}`} className="font-medium underline underline-offset-2">
                  View {conflictId}
                </Link>
              </>
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Method" value={methodLabel(order)} />
        <Field label="Amount Expected" value={pkr(order.payableAmount)} />
        {order.paymentMethod === "cod" && (
          <>
            <Field
              label="Deposit Account"
              value={order.depositAccount === "jazzcash" ? "JazzCash" : order.depositAccount === "ubl" ? "UBL" : "Unknown"}
            />
            <Field label="Deposit" value={pkr(order.depositAmount)} />
            <Field label="Balance Due to Courier" value={pkr(order.codBalanceDue)} />
          </>
        )}
        <Field label="Sender Name" value={order.paymentSenderName || "—"} />
        <Field label="Sender Mobile" value={order.paymentSenderMobile || "—"} />
        <Field label="Transaction Reference" value={order.paymentReference || "—"} />
        <Field label="Submitted" value={fmt(order.paymentSubmittedAt)} />
        {order.paymentStatus === "payment_verified" && (
          <Field label="Verified" value={fmt(order.paymentVerifiedAt)} />
        )}
        {order.paymentStatus === "payment_rejected" && (
          <Field label="Rejection Reason" value={order.paymentRejectionReason || "—"} />
        )}
      </div>

      {order.paymentReceiptPath && (
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wide text-stone-500 block mb-2">
            Receipt
          </span>
          <ReceiptViewer orderId={order.id} />
        </div>
      )}

      <div className="pt-1">
        {order.paymentStatus === "payment_submitted" ? (
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={isPending || accountToVerify(order) === null}
                title={
                  accountToVerify(order) === null
                    ? "Deposit account unknown — verify manually before confirming."
                    : undefined
                }
                className="px-4 py-2 text-[13px] font-medium rounded-md text-white bg-stone-900 hover:bg-stone-700 transition-colors duration-150 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Confirm Order
              </button>
              <button
                onClick={() => setRejectOpen(true)}
                disabled={isPending}
                className="px-4 py-2 text-[13px] font-medium rounded-md text-[#7a3535] border border-[#7a3535]/25 hover:bg-[#7a3535]/5 transition-colors duration-150 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Reject
              </button>
            </div>
            {accountToVerify(order) === null && (
              <p className="text-[11px] text-amber-700">Deposit account unknown — verify manually</p>
            )}
          </div>
        ) : order.paymentStatus === "awaiting_payment" ? (
          <p className="text-[12px] text-stone-500">Awaiting receipt from the customer.</p>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm this payment?"
        description={
          accountToVerify(order) !== null
            ? `Have you verified this payment in your ${accountToVerify(order)} account? Order ${order.id} will be marked confirmed and the customer emailed.`
            : `Deposit account unknown — verify manually before confirming order ${order.id}.`
        }
        confirmLabel="Confirm Order"
        danger={false}
        loading={isPending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />

      <RejectPaymentDialog order={rejectOpen ? order : null} onClose={() => setRejectOpen(false)} />
    </div>
  )
}
