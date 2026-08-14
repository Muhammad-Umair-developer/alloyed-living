"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Package } from "lucide-react"
import { toast } from "@/src/components/ui/ToastAlert"
import { listMyOrdersAction } from "@/src/actions/store-actions"
import CancelOrderDialog from "./CancelOrderDialog"
import type { Order, OrderItem, OrderStatus } from "@/src/lib/data/types"

// Mirrors ConfirmView.tsx's pkr() exactly.
function pkr(n: number): string {
  return `PKR ${Math.round(n).toLocaleString("en-PK")}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" })
}

// Same status→color mapping as dashboard's StatusBadge (kept in sync
// manually — dashboard's component isn't reachable across the app boundary),
// rendered in THIS app's own badge idiom: identical classes to the "Default"
// address badge already on this page (AddressBookSection.tsx), just
// parameterized by status instead of hardcoded to one color.
const STATUS_STYLE: Record<OrderStatus, string> = {
  pending:   "bg-amber-50 text-amber-700",
  shipped:   "bg-sky-50 text-sky-700",
  delivered: "bg-[#5c6b4a]/10 text-[#5c6b4a]",
  returned:  "bg-red-50 text-[#7a3535]",
  exchanged: "bg-violet-50 text-violet-700",
  cancelled: "bg-stone-100 text-stone-600",
}

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block text-[8px] tracking-[0.24em] uppercase px-2 py-1 flex-shrink-0 ${STATUS_STYLE[status]}`}>
      {status}
    </span>
  )
}

// Reproduces ConfirmView.tsx's OrderItemsSummary exactly (thumbnail/name/qty/
// line total) — that component isn't exported, same duplication pattern used
// elsewhere in this app.
function OrderItemsList({ items }: { items: OrderItem[] }) {
  if (items.length === 0) return null
  return (
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
  )
}

function OrderCard({ order, onRequestCancel }: { order: Order; onRequestCancel: (order: Order) => void }) {
  return (
    <div className="border border-stone-200 bg-white rounded-sm p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-[13px] font-medium text-stone-800">{order.id}</p>
          <p className="text-[11px] text-stone-600 mt-0.5">Placed {fmtDate(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <OrderItemsList items={order.items} />

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-stone-100">
        <span className="text-[10px] tracking-[0.2em] uppercase text-stone-600">Total</span>
        <span className="text-[13px] font-medium text-stone-800 tabular-nums">{pkr(order.total)}</span>
      </div>

      {/* Cancel — only ever offered while the order is still pending, same
          gate as the dashboard's own cancel control. Opens CancelOrderDialog,
          managed by the parent section (one dialog instance, not one per card). */}
      {order.status === "pending" && (
        <button
          onClick={() => onRequestCancel(order)}
          className="mt-4 text-[9px] tracking-[0.3em] uppercase text-stone-500 hover:text-[#7a3535] underline underline-offset-4 decoration-stone-300 hover:decoration-[#7a3535] transition-colors duration-300 cursor-pointer"
        >
          Cancel Order
        </button>
      )}

      {/* Refund info — same wording pattern as the confirm-page's post-cancel screen. */}
      {order.status === "cancelled" && (
        <div className="mt-4 pt-4 border-t border-stone-100">
          <p className="text-[11px] text-stone-600 leading-relaxed">
            {order.refundStatus === "pending" && order.refundAmount
              ? `Refund of ${pkr(order.refundAmount)} is being processed.`
              : order.refundStatus === "processed" && order.refundAmount
                ? `Refund of ${pkr(order.refundAmount)} has been processed.`
                : "This order was cancelled. No refund was owed."}
          </p>
        </div>
      )}
    </div>
  )
}

export default function OrderHistorySection() {
  const [orders, setOrders] = useState<Order[] | null>(null) // null = still loading
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null) // one dialog instance for the whole list

  const load = useCallback(async () => {
    try {
      const list = await listMyOrdersAction()
      setOrders(list)
    } catch {
      toast.error("Could not load your order history.")
      setOrders([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function handleCancelled(updated: Order) {
    setOrders((prev) => (prev ? prev.map((o) => (o.id === updated.id ? updated : o)) : prev))
  }

  if (orders === null) {
    return (
      <div className="border border-stone-100 bg-[#f7f5f2] rounded-sm p-10 text-center">
        <p className="text-[11px] text-stone-600">Loading your orders…</p>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="border border-stone-100 bg-[#f7f5f2] rounded-sm py-14 flex flex-col items-center gap-6 text-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
            <Package size={24} strokeWidth={1} className="text-stone-500" />
          </div>
          <motion.div
            className="absolute inset-0 rounded-full border border-stone-200"
            animate={{ scale: [1, 1.22, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="space-y-2">
          <p className="text-[12px] tracking-[0.2em] uppercase text-stone-700">No orders yet</p>
          <p className="text-[11px] text-stone-600 max-w-[220px] mx-auto leading-relaxed">
            Your past orders will appear here once you place one.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} onRequestCancel={setCancelTarget} />
      ))}

      <CancelOrderDialog
        order={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onCancelled={handleCancelled}
      />
    </div>
  )
}
