"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Receipt, Package, RotateCcw, Repeat2 } from "lucide-react"
import type { Order, OrderStatus } from "@/src/lib/data/types"
import SummaryCard from "@/src/components/ui/SummaryCard"
import StatusBadge from "@/src/components/ui/StatusBadge"
import EmptyState from "@/src/components/ui/EmptyState"

// Re-runs the server fetch every 20s so this page reflects new orders and
// status changes (made here or via the storefront/webhook) without a manual
// reload — the data itself always comes straight from the orders table.
const AUTO_REFRESH_MS = 20_000

interface PurchaseRow {
  key: string
  orderId: string
  createdAt: string
  customerName: string
  customerEmail: string
  productName: string
  quantity: number
  lineTotal: number
  status: OrderStatus
}

const STATUSES: OrderStatus[] = ["pending", "shipped", "delivered", "returned", "exchanged"]
const FILTERS: Array<OrderStatus | "all"> = ["all", ...STATUSES]

function buildRows(orders: Order[]): PurchaseRow[] {
  const rows: PurchaseRow[] = []
  for (const order of orders) {
    for (const item of order.items) {
      rows.push({
        key: `${order.id}-${item.productId}`,
        orderId: order.id,
        createdAt: order.createdAt,
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        productName: item.name,
        quantity: item.quantity,
        lineTotal: item.price * item.quantity,
        status: order.status,
      })
    }
  }
  return rows
}

export default function PurchasesView({ orders }: { orders: Order[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [filter, setFilter] = useState<OrderStatus | "all">("all")

  // Soft auto-refresh — same mechanism as the manual Refresh button in
  // PageHeader, just on a timer instead of a click.
  useEffect(() => {
    const id = setInterval(() => {
      startTransition(() => router.refresh())
    }, AUTO_REFRESH_MS)
    return () => clearInterval(id)
  }, [router])

  const rows = useMemo(() => buildRows(orders), [orders])

  const totals = useMemo(() => {
    const itemsPurchased = rows.reduce((s, r) => s + r.quantity, 0)
    const returnedOrders = orders.filter((o) => o.status === "returned")
    const exchangedOrders = orders.filter((o) => o.status === "exchanged")
    const returnedItems = returnedOrders.reduce((s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0), 0)
    const exchangedItems = exchangedOrders.reduce((s, o) => s + o.items.reduce((si, i) => si + i.quantity, 0), 0)
    return {
      totalOrders: orders.length,
      itemsPurchased,
      returnedOrders: returnedOrders.length,
      returnedItems,
      exchangedOrders: exchangedOrders.length,
      exchangedItems,
    }
  }, [orders, rows])

  const filteredRows = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  )

  const returnRate = totals.totalOrders > 0 ? (totals.returnedOrders / totals.totalOrders) * 100 : 0
  const exchangeRate = totals.totalOrders > 0 ? (totals.exchangedOrders / totals.totalOrders) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Receipt}
          label="Total Purchases"
          value={totals.totalOrders.toLocaleString()}
          hint={`${totals.itemsPurchased.toLocaleString()} items sold`}
          index={0}
        />
        <SummaryCard
          icon={Package}
          label="Items Sold"
          value={totals.itemsPurchased.toLocaleString()}
          hint="Across all orders"
          index={1}
        />
        <SummaryCard
          icon={RotateCcw}
          label="Returned"
          value={totals.returnedOrders.toLocaleString()}
          hint={`${totals.returnedItems.toLocaleString()} items · ${returnRate.toFixed(1)}% of orders`}
          index={2}
        />
        <SummaryCard
          icon={Repeat2}
          label="Exchanged"
          value={totals.exchangedOrders.toLocaleString()}
          hint={`${totals.exchangedItems.toLocaleString()} items · ${exchangeRate.toFixed(1)}% of orders`}
          index={3}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-[12px] rounded-md capitalize transition-colors duration-150 cursor-pointer ${
              filter === f ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Itemized table */}
      {filteredRows.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white">
          <EmptyState icon={Package} title="No purchases found" description="Items sold at checkout will appear here." />
        </div>
      ) : (
        <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[760px]">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/60">
                  <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Date</th>
                  <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Order</th>
                  <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Customer</th>
                  <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Product</th>
                  <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Qty</th>
                  <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Total</th>
                  <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.key} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-colors">
                    <td className="px-4 py-3 text-[12px] text-stone-500">
                      {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-2 py-3 text-[13px] font-medium text-stone-800">{r.orderId}</td>
                    <td className="px-2 py-3">
                      <p className="text-[13px] text-stone-700">{r.customerName}</p>
                      <p className="text-[11px] text-stone-600">{r.customerEmail}</p>
                    </td>
                    <td className="px-2 py-3 text-[13px] text-stone-700">{r.productName}</td>
                    <td className="px-2 py-3 text-[13px] text-stone-600 tabular-nums">{r.quantity}</td>
                    <td className="px-2 py-3 text-[13px] text-stone-700 tabular-nums">PKR {r.lineTotal.toLocaleString()}</td>
                    <td className="px-2 py-3"><StatusBadge status={r.status} /></td>
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
