"use client"

import { useMemo, useState } from "react"
import TrendChart from "@/src/components/charts/TrendChart"
import type { DailyStat } from "@/src/lib/data/types"

type Metric = "views" | "sales" | "revenue"
type Range = 7 | 30

const METRIC_LABELS: Record<Metric, string> = {
  views: "Views",
  sales: "Sales",
  revenue: "Revenue",
}

export default function OverviewTrend({ trend }: { trend: DailyStat[] }) {
  const [metric, setMetric] = useState<Metric>("revenue")
  const [range, setRange]   = useState<Range>(30)

  const data = useMemo(() => {
    const sliced = trend.slice(-range)
    return sliced.map((d) => ({ date: d.date, value: d[metric] }))
  }, [trend, metric, range])

  const formatValue = (v: number) => (metric === "revenue" ? `PKR ${v.toLocaleString()}` : v.toLocaleString())

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex gap-1">
          {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 py-1.5 text-[12px] rounded-md transition-colors duration-150 cursor-pointer ${
                metric === m ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-100"
              }`}
            >
              {METRIC_LABELS[m]}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {([7, 30] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-[12px] rounded-md transition-colors duration-150 cursor-pointer ${
                range === r ? "bg-[var(--accent-soft)] text-[var(--accent)] font-medium" : "text-stone-500 hover:bg-stone-100"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      <TrendChart data={data} formatValue={formatValue} />
    </div>
  )
}
