"use client"

import { useMemo, useState } from "react"
import { ArrowUpDown } from "lucide-react"

interface Row {
  id: string
  name: string
  image: string
  category: string
  views: number
  addToCart: number
  purchases: number
  conversionRate: number
}

interface Totals {
  views: number
  addToCart: number
  purchases: number
}

type SortKey = "views" | "addToCart" | "purchases" | "conversionRate"

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "views", label: "Views" },
  { key: "addToCart", label: "Cart Adds" },
  { key: "purchases", label: "Purchases" },
  { key: "conversionRate", label: "Conversion" },
]

function FunnelStage({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[12px] text-stone-500">{label}</span>
        <span className="text-[13px] font-semibold text-stone-800 tabular-nums">{value.toLocaleString()}</span>
      </div>
      <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: tone }} />
      </div>
    </div>
  )
}

export default function AnalyticsView({ rows, totals }: { rows: Row[]; totals: Totals }) {
  const [sort, setSort] = useState<SortKey>("views")
  const [dir, setDir] = useState<"asc" | "desc">("desc")

  const sorted = useMemo(() => {
    const list = [...rows].sort((a, b) => a[sort] - b[sort])
    return dir === "desc" ? list.reverse() : list
  }, [rows, sort, dir])

  function toggleSort(key: SortKey) {
    if (key === sort) setDir((d) => (d === "desc" ? "asc" : "desc"))
    else { setSort(key); setDir("desc") }
  }

  return (
    <div className="space-y-6">
      {/* Overall funnel */}
      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600 mb-5">Overall Funnel</p>
        <div className="space-y-4 max-w-lg">
          <FunnelStage label="Views" value={totals.views} max={totals.views} tone="#57534e" />
          <FunnelStage label="Add to Cart" value={totals.addToCart} max={totals.views} tone="#a8a29e" />
          <FunnelStage label="Purchases" value={totals.purchases} max={totals.views} tone="var(--accent)" />
        </div>
        <p className="text-[12px] text-stone-600 mt-4">
          {totals.views > 0 ? ((totals.purchases / totals.views) * 100).toFixed(1) : "0.0"}% of views convert to a purchase.
        </p>
      </div>

      {/* Sortable table */}
      <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[640px]">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50/60">
              <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Product</th>
              {COLUMNS.map((col) => (
                <th key={col.key} className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">
                  <button onClick={() => toggleSort(col.key)} className="inline-flex items-center gap-1 hover:text-stone-700 transition-colors cursor-pointer">
                    {col.label}
                    <ArrowUpDown size={11} className={sort === col.key ? "text-stone-600" : "text-stone-500"} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={r.image} alt={r.name} className="w-9 h-9 rounded-md object-cover bg-stone-100 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-stone-800 truncate max-w-[220px]">{r.name}</p>
                      <p className="text-[11px] text-stone-600">{r.category}</p>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3 text-[13px] text-stone-600 tabular-nums">{r.views.toLocaleString()}</td>
                <td className="px-2 py-3 text-[13px] text-stone-600 tabular-nums">{r.addToCart.toLocaleString()}</td>
                <td className="px-2 py-3 text-[13px] text-stone-600 tabular-nums">{r.purchases.toLocaleString()}</td>
                <td className="px-2 py-3">
                  <span className="text-[13px] font-medium tabular-nums" style={{ color: "var(--accent)" }}>
                    {(r.conversionRate * 100).toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
