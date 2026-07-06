"use client"

import PieChart, { type PieSlice } from "@/src/components/charts/PieChart"

export default function OverviewPieCharts({
  revenueByCategory,
  ordersByStatus,
}: {
  revenueByCategory: PieSlice[]
  ordersByStatus: PieSlice[]
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 mb-5">
          Revenue by Category
        </p>
        <PieChart data={revenueByCategory} formatValue={(v) => `PKR ${v.toLocaleString()}`} />
      </div>

      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 mb-5">
          Orders by Status
        </p>
        <PieChart data={ordersByStatus} />
      </div>
    </div>
  )
}
