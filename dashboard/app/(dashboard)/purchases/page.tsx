import { getOrders } from "@/src/lib/data/orders"
import PageHeader from "@/src/components/ui/PageHeader"
import PurchasesView from "./PurchasesView"

// Orders change constantly (new sales, status updates) — always read fresh.
export const dynamic = "force-dynamic"

export default async function PurchasesPage() {
  const orders = await getOrders()

  return (
    <div>
      <PageHeader
        title="Purchase Records"
        description="Every item sold, with return and exchange counts — live from your order data."
      />
      <PurchasesView orders={orders} />
    </div>
  )
}
