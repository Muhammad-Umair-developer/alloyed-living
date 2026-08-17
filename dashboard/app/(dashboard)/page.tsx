import { Package, Eye, ShoppingCart, TrendingUp, DollarSign } from "lucide-react"
import { getOverviewStats, getDailyTrend, getProductAnalytics } from "@/src/lib/data/analytics"
import { getProductsForRevenue } from "@/src/lib/data/products"
import { getOrderStatusCounts } from "@/src/lib/data/orders"
import PageHeader from "@/src/components/ui/PageHeader"
import SummaryCard from "@/src/components/ui/SummaryCard"
import OverviewTrend from "./OverviewTrend"
import OverviewPieCharts from "./OverviewPieCharts"

// Mutated constantly by product/order/analytics actions — always read fresh.
export const dynamic = "force-dynamic"

export default async function OverviewPage() {
  const [stats, trend, products, productAnalytics, orderStatusCounts] = await Promise.all([
    getOverviewStats(),
    getDailyTrend(30),
    getProductsForRevenue(),
    getProductAnalytics(),
    getOrderStatusCounts(),
  ])

  const revenueByCategory = Object.entries(
    products.reduce<Record<string, number>>((acc, p) => {
      const a = productAnalytics.find((x) => x.productId === p.id)
      const price = p.discountPrice ?? p.price
      acc[p.category] = (acc[p.category] ?? 0) + (a?.purchases ?? 0) * price
      return acc
    }, {}),
  )
    .map(([label, value]) => ({ label, value }))
    .filter((s) => s.value > 0)

  const ordersByStatus = Object.entries(orderStatusCounts)
    .map(([label, value]) => ({ label, value }))
    .filter((s) => s.value > 0)

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Snapshot of today's activity across the storefront."
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <SummaryCard index={0} icon={Package} label="Total Products" value={stats.totalProducts.toString()} />
        <SummaryCard index={1} icon={Eye} label="Views Today" value={stats.viewsToday.toLocaleString()} />
        <SummaryCard index={2} icon={ShoppingCart} label="Cart Adds Today" value={stats.cartAddsToday.toLocaleString()} />
        <SummaryCard index={3} icon={TrendingUp} label="Sales Today" value={stats.salesToday.toLocaleString()} />
        <SummaryCard
          index={4}
          icon={DollarSign}
          label="Revenue Today"
          value={`PKR ${stats.revenueToday.toLocaleString()}`}
        />
      </div>

      <div className="space-y-6">
        <OverviewTrend trend={trend} />
        <OverviewPieCharts revenueByCategory={revenueByCategory} ordersByStatus={ordersByStatus} />
      </div>
    </div>
  )
}
