import { getOrders, getOrderCountByPaymentStatus } from "@/src/lib/data/orders"
import type { PaymentStatus } from "@/src/lib/data/types"
import PageHeader from "@/src/components/ui/PageHeader"
import OrdersListView from "./OrdersListView"

// Order status changes here — always read fresh.
export const dynamic = "force-dynamic"

// Payment statuses that put an order in the "New Orders" tab — mirrors the
// same constant OrdersListView.tsx used to derive this client-side.
const PENDING_PAYMENT_STATUSES: PaymentStatus[] = ["awaiting_payment", "payment_submitted"]

// Ceiling on the main table — a stopgap bound, not real pagination yet (see
// the Tier 1/Tier 2 plan). New Orders get their own uncapped query below:
// that set stays naturally small (pending-payment orders get resolved
// quickly in normal operation), and its badge count is further decoupled
// via its own dedicated count query so it's correct independent of both.
const ORDERS_LIMIT = 200

export default async function OrdersPage() {
  const [orders, newOrders, newOrdersCount] = await Promise.all([
    getOrders({ limit: ORDERS_LIMIT }),
    getOrders({ paymentStatusIn: PENDING_PAYMENT_STATUSES }),
    getOrderCountByPaymentStatus(PENDING_PAYMENT_STATUSES),
  ])

  return (
    <div>
      <PageHeader title="Orders" description={`${orders.length} order${orders.length === 1 ? "" : "s"} placed.`} />
      <OrdersListView orders={orders} newOrders={newOrders} newOrdersCount={newOrdersCount} />
    </div>
  )
}
