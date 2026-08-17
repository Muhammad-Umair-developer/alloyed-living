import { getOrders, getPurchasesSummary } from "@/src/lib/data/orders"
import PageHeader from "@/src/components/ui/PageHeader"
import PurchasesView from "./PurchasesView"

// Orders change constantly (new sales, status updates) — always read fresh.
export const dynamic = "force-dynamic"

// Ceiling on the itemized table — same stopgap bound as the Orders page.
// The summary cards are intentionally NOT derived from this: they're backed
// by getPurchasesSummary()'s all-time aggregate, so capping this fetch has
// zero effect on their correctness.
const ORDERS_LIMIT = 200

export default async function PurchasesPage() {
  const [orders, summary] = await Promise.all([
    getOrders({ limit: ORDERS_LIMIT }),
    getPurchasesSummary(),
  ])

  return (
    <div>
      <PageHeader
        title="Purchase Records"
        description="Every item sold, with return and exchange counts — live from your order data."
      />
      <PurchasesView orders={orders} summary={summary} />
    </div>
  )
}
