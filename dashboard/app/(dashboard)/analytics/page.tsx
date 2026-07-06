import { getProducts } from "@/src/lib/data/products"
import { getProductAnalytics } from "@/src/lib/data/analytics"
import PageHeader from "@/src/components/ui/PageHeader"
import AnalyticsView from "./AnalyticsView"

// Tracking events land here continuously — always read fresh.
export const dynamic = "force-dynamic"

export default async function AnalyticsPage() {
  const [products, analytics] = await Promise.all([getProducts(), getProductAnalytics()])

  const rows = products.map((p) => {
    const a = analytics.find((x) => x.productId === p.id)
    const views = a?.views ?? 0
    const addToCart = a?.addToCart ?? 0
    const purchases = a?.purchases ?? 0
    return {
      id: p.id,
      name: p.name,
      image: p.image,
      category: p.category,
      views,
      addToCart,
      purchases,
      conversionRate: views > 0 ? purchases / views : 0,
    }
  })

  const totals = rows.reduce(
    (acc, r) => ({
      views: acc.views + r.views,
      addToCart: acc.addToCart + r.addToCart,
      purchases: acc.purchases + r.purchases,
    }),
    { views: 0, addToCart: 0, purchases: 0 },
  )

  return (
    <div>
      <PageHeader title="Analytics" description="Per-product views, cart adds, purchases, and conversion." />
      <AnalyticsView rows={rows} totals={totals} />
    </div>
  )
}
