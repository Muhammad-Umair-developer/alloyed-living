"use client"

import { useMemo, useState } from "react"

export interface PieSlice {
  label: string
  value: number
}

interface PieChartProps {
  data:         PieSlice[]
  formatValue?: (v: number) => string
  size?:        number
  thickness?:   number
}

const PALETTE = ["#5c6b4a", "#8a9a72", "#c8a97a", "#a8a29e", "#7a8a99", "#b56b6b", "#d6c58e"]

export default function PieChart({
  data,
  formatValue = (v) => v.toLocaleString(),
  size = 160,
  thickness = 22,
}: PieChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const total = data.reduce((s, d) => s + d.value, 0)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius

  const segments = useMemo(() => {
    let offset = 0
    return data.map((d, i) => {
      const fraction = total > 0 ? d.value / total : 0
      const length = fraction * circumference
      const seg = { ...d, i, fraction, length, offset, color: PALETTE[i % PALETTE.length] }
      offset += length
      return seg
    })
  }, [data, total, circumference])

  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-[12px] text-stone-400" style={{ width: size, height: size }}>
        No data yet
      </div>
    )
  }

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
          {segments.map((seg) => (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={hoverIdx === seg.i ? thickness + 4 : thickness}
              strokeDasharray={`${seg.length} ${circumference - seg.length}`}
              strokeDashoffset={-seg.offset}
              onMouseEnter={() => setHoverIdx(seg.i)}
              onMouseLeave={() => setHoverIdx(null)}
              style={{ transition: "stroke-width 150ms ease", cursor: "default" }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {hoverIdx !== null ? (
            <>
              <span className="text-[13px] font-semibold text-stone-800">{formatValue(segments[hoverIdx].value)}</span>
              <span className="text-[10px] text-stone-400">{((segments[hoverIdx].fraction) * 100).toFixed(0)}%</span>
            </>
          ) : (
            <>
              <span className="text-[13px] font-semibold text-stone-800">{formatValue(total)}</span>
              <span className="text-[10px] text-stone-400">Total</span>
            </>
          )}
        </div>
      </div>

      <ul className="space-y-2 min-w-0">
        {segments.map((seg) => (
          <li
            key={seg.label}
            onMouseEnter={() => setHoverIdx(seg.i)}
            onMouseLeave={() => setHoverIdx(null)}
            className="flex items-center gap-2 text-[12px] cursor-default"
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-stone-600 capitalize truncate max-w-[120px]">{seg.label}</span>
            <span className="text-stone-400 tabular-nums ml-auto pl-3">{((seg.fraction) * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
