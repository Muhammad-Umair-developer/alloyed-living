"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import type { OrderStatus } from "@/src/lib/data/types"
import { toast } from "@/src/components/ui/ToastAlert"
import { updateOrderStatusAction } from "@/src/actions/order-actions"
import StatusBadge from "@/src/components/ui/StatusBadge"

const STATUSES: OrderStatus[] = ["pending", "shipped", "delivered", "returned", "exchanged"]

export default function OrderStatusControl({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleChange(next: OrderStatus) {
    startTransition(async () => {
      await updateOrderStatusAction(orderId, next)
      toast.success(`Order marked as ${next}.`)
      router.refresh()
    })
  }

  // 'cancelled' is terminal and unreachable through this control (only
  // cancelOrderAction may set it — see order-actions.ts), and deliberately
  // isn't in STATUSES above. A controlled <select> with no matching <option>
  // would silently misrender as the first option ("Pending"), so show a
  // read-only badge instead of a select for a cancelled order.
  if (status === "cancelled") {
    return <StatusBadge status={status} />
  }

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) => handleChange(e.target.value as OrderStatus)}
      className="px-3 py-2 text-[13px] rounded-md border border-stone-200 bg-white outline-none focus:border-stone-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed capitalize"
      aria-label="Update order status"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )
}
