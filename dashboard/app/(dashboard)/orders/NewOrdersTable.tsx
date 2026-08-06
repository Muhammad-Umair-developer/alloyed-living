"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertTriangle, ShoppingCart } from "lucide-react"
import type { Order } from "@/src/lib/data/types"
import EmptyState from "@/src/components/ui/EmptyState"
import ConfirmDialog from "@/src/components/ui/ConfirmDialog"
import { toast } from "@/src/components/ui/ToastAlert"
import { approvePaymentAction } from "@/src/actions/order-actions"
import PaymentStatusBadge from "./PaymentStatusBadge"
import RejectPaymentDialog from "./RejectPaymentDialog"

function methodLabel(o: Order): string {
  if (o.paymentMethod === "cod") {
    const acct = o.depositAccount === "jazzcash" ? "JazzCash" : o.depositAccount === "ubl" ? "UBL" : "—"
    return `COD (${acct})`
  }
  if (o.paymentMethod === "ubl") return "UBL"
  if (o.paymentMethod === "jazzcash") return "JazzCash"
  return "—"
}

// The account an admin must go check before approving — the COD deposit
// account for COD orders, otherwise the direct bank method itself.
function accountToVerify(o: Order): string {
  if (o.paymentMethod === "cod") return o.depositAccount === "jazzcash" ? "JazzCash" : "UBL"
  return o.paymentMethod === "jazzcash" ? "JazzCash" : "UBL"
}

function pkr(n?: number): string {
  return n != null ? `PKR ${n.toLocaleString()}` : "—"
}

export default function NewOrdersTable({ orders }: { orders: Order[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmTarget, setConfirmTarget] = useState<Order | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Order | null>(null)

  function handleConfirm() {
    if (!confirmTarget) return
    const order = confirmTarget
    startTransition(async () => {
      const result = await approvePaymentAction(order.id)
      if (!result.ok) {
        toast.error(result.error ?? "Could not verify this payment.")
      } else {
        toast.success(`Order ${order.id} confirmed — the customer has been emailed.`)
      }
      setConfirmTarget(null)
      router.refresh()
    })
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white">
        <EmptyState
          icon={ShoppingCart}
          title="No orders awaiting payment"
          description="Bank transfer and COD-deposit orders needing review will appear here."
        />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[960px]">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50/60">
              <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Order</th>
              <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Customer</th>
              <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Payment</th>
              <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Payable</th>
              <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Submitted</th>
              <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Status</th>
              <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-colors align-top"
              >
                <td className="px-4 py-3 text-[13px] font-medium text-stone-800">
                  <Link href={`/orders/${o.id}`} className="hover:underline underline-offset-2">
                    {o.id}
                  </Link>
                </td>
                <td className="px-2 py-3">
                  <p className="text-[13px] text-stone-700">{o.customer.name}</p>
                  <p className="text-[11px] text-stone-600">{o.customer.email}</p>
                </td>
                <td className="px-2 py-3">
                  <p className="text-[13px] text-stone-700">{methodLabel(o)}</p>
                  {o.paymentMethod === "cod" && (
                    <p className="text-[11px] text-stone-600">
                      Deposit {pkr(o.depositAmount)} · Balance {pkr(o.codBalanceDue)}
                    </p>
                  )}
                </td>
                <td className="px-2 py-3 text-[13px] text-stone-700 tabular-nums">{pkr(o.payableAmount)}</td>
                <td className="px-2 py-3 text-[12px] text-stone-500">
                  {o.paymentSubmittedAt
                    ? new Date(o.paymentSubmittedAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "—"}
                </td>
                <td className="px-2 py-3">
                  <PaymentStatusBadge status={o.paymentStatus} />
                  {o.paymentFlagged && (
                    <div className="mt-1.5 flex items-start gap-1 text-[11px] text-amber-700 max-w-[220px]">
                      <AlertTriangle size={11} className="mt-px flex-shrink-0" />
                      <span>{o.paymentFlagReason || "Flagged for review"}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {o.paymentStatus === "payment_submitted" ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setConfirmTarget(o)}
                        disabled={isPending}
                        className="px-3 py-1.5 text-[11px] font-medium rounded-md text-white bg-stone-900 hover:bg-stone-700 transition-colors duration-150 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                      >
                        Confirm Order
                      </button>
                      <button
                        onClick={() => setRejectTarget(o)}
                        disabled={isPending}
                        className="px-3 py-1.5 text-[11px] font-medium rounded-md text-[#7a3535] border border-[#7a3535]/25 hover:bg-[#7a3535]/5 transition-colors duration-150 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                      >
                        Reject
                      </button>
                    </div>
                  ) : o.paymentStatus === "awaiting_payment" ? (
                    <span className="text-[11px] text-stone-500">Awaiting receipt</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!confirmTarget}
        title="Confirm this payment?"
        description={
          confirmTarget
            ? `Have you verified this payment in your ${accountToVerify(confirmTarget)} account? Order ${confirmTarget.id} will be marked confirmed and the customer emailed.`
            : ""
        }
        confirmLabel="Confirm Order"
        danger={false}
        loading={isPending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmTarget(null)}
      />

      <RejectPaymentDialog order={rejectTarget} onClose={() => setRejectTarget(null)} />
    </div>
  )
}
