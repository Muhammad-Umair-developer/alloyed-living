import { getOrders } from "@/src/lib/data/orders"
import PageHeader from "@/src/components/ui/PageHeader"
import OrdersListView from "./OrdersListView"

// Order status changes here — always read fresh.
export const dynamic = "force-dynamic"

export default async function OrdersPage() {
  const orders = await getOrders()

  return (
    <div>
      <PageHeader title="Orders" description={`${orders.length} order${orders.length === 1 ? "" : "s"} placed.`} />
      <OrdersListView orders={orders} />
    </div>
  )
}
