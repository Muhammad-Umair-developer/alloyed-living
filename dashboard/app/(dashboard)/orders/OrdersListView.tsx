"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShoppingCart } from "lucide-react"
import type { Order, OrderStatus } from "@/src/lib/data/types"
import EmptyState from "@/src/components/ui/EmptyState"
import StatusBadge from "@/src/components/ui/StatusBadge"
import { toast } from "@/src/components/ui/ToastAlert"
import { updateOrderStatusAction } from "@/src/actions/order-actions"

const STATUSES: OrderStatus[] = ["pending", "shipped", "delivered", "returned", "exchanged"]
const FILTERS: Array<OrderStatus | "all"> = ["all", ...STATUSES]

export default function OrdersListView({ orders }: { orders: Order[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState<OrderStatus | "all">("all")

  const filtered = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter],
  )

  function handleStatusChange(id: string, status: OrderStatus) {
    startTransition(async () => {
      await updateOrderStatusAction(id, status)
      toast.success(`Order ${id} marked as ${status}.`)
      router.refresh()
    })
  }

  return (
    <div>
      <div className="flex gap-1 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-[12px] rounded-md capitalize transition-colors duration-150 cursor-pointer ${
              filter === f ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-100"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white">
          <EmptyState icon={ShoppingCart} title="No orders found" description="Orders placed at checkout will appear here." />
        </div>
      ) : (
        <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[720px]">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/60">
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Order</th>
                <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Customer</th>
                <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Items</th>
                <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Total</th>
                <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Placed</th>
                <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Status</th>
                <th className="w-16 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-colors">
                  <td className="px-4 py-3 text-[13px] font-medium text-stone-800">{o.id}</td>
                  <td className="px-2 py-3">
                    <p className="text-[13px] text-stone-700">{o.customer.name}</p>
                    <p className="text-[11px] text-stone-600">{o.customer.email}</p>
                  </td>
                  <td className="px-2 py-3 text-[13px] text-stone-600">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td className="px-2 py-3 text-[13px] text-stone-700 tabular-nums">PKR {o.total.toLocaleString()}</td>
                  <td className="px-2 py-3 text-[12px] text-stone-500">
                    {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={o.status} />
                      <select
                        value={o.status}
                        disabled={isPending}
                        onChange={(e) => handleStatusChange(o.id, e.target.value as OrderStatus)}
                        className="text-[11px] border border-stone-200 rounded-md px-1.5 py-1 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Update status for order ${o.id}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/orders/${o.id}`} className="text-[12px] font-medium text-stone-600 hover:text-stone-900 underline underline-offset-2">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
