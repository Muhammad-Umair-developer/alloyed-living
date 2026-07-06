"use client"

import { useMemo, useState } from "react"

export interface TrendPoint {
  date:  string
  value: number
}

interface TrendChartProps {
  data:         TrendPoint[]
  formatValue?: (v: number) => string
  formatDate?:  (d: string) => string
  height?:      number
}

const WIDTH = 720

export default function TrendChart({
  data,
  formatValue = (v) => v.toLocaleString(),
  formatDate  = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  height = 220,
}: TrendChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const { path, areaPath, points, max } = useMemo(() => {
    const values = data.map((d) => d.value)
    const max = Math.max(...values, 1)
    const stepX = data.length > 1 ? WIDTH / (data.length - 1) : 0
    const pts = data.map((d, i) => ({
      x: i * stepX,
      y: height - (d.value / max) * (height - 24) - 8,
    }))
    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
    const areaPath = `${path} L ${WIDTH} ${height} L 0 ${height} Z`
    return { path, areaPath, points: pts, max }
  }, [data, height])

  if (data.length === 0) return null

  const hovered = hoverIdx !== null ? data[hoverIdx] : null
  const hoveredPt = hoverIdx !== null ? points[hoverIdx] : null

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Baseline grid lines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            x2={WIDTH}
            y1={height - f * (height - 8)}
            y2={height - f * (height - 8)}
            stroke="#e7e5e4"
            strokeWidth={1}
          />
        ))}

        <path d={areaPath} fill="url(#trend-fill)" />
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Hover target overlay */}
        {points.map((p, i) => (
          <rect
            key={i}
            x={p.x - WIDTH / data.length / 2}
            y={0}
            width={WIDTH / data.length}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
          />
        ))}

        {hoveredPt && (
          <>
            <line x1={hoveredPt.x} x2={hoveredPt.x} y1={0} y2={height} stroke="#d6d3d1" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={hoveredPt.x} cy={hoveredPt.y} r={4} fill="var(--accent)" stroke="white" strokeWidth={2} />
          </>
        )}
      </svg>

      {hovered && hoveredPt && (
        <div
          className="absolute -translate-x-1/2 -translate-y-full pointer-events-none bg-stone-900 text-white text-[11px] px-2.5 py-1.5 rounded-md shadow-lg whitespace-nowrap"
          style={{
            left: `${(hoveredPt.x / WIDTH) * 100}%`,
            top: `${(hoveredPt.y / height) * 100 - 4}%`,
          }}
        >
          <span className="font-medium">{formatValue(hovered.value)}</span>
          <span className="text-stone-400 ml-1.5">{formatDate(hovered.date)}</span>
        </div>
      )}

      <div className="flex justify-between mt-2 text-[10px] text-stone-400">
        <span>{formatDate(data[0].date)}</span>
        <span>{formatDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  )
}
