import type { LucideIcon } from "lucide-react"
import AnimatedCard from "./AnimatedCard"

interface SummaryCardProps {
  icon:  LucideIcon
  label: string
  value: string
  hint?: string
  index?: number
}

export default function SummaryCard({ icon: Icon, label, value, hint, index = 0 }: SummaryCardProps) {
  return (
    <AnimatedCard index={index} className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] text-stone-500">{label}</p>
        <div className="w-7 h-7 rounded-md bg-[var(--accent-soft)] flex items-center justify-center">
          <Icon size={14} strokeWidth={1.75} className="text-[var(--accent)]" />
        </div>
      </div>
      <p className="text-[24px] font-semibold tracking-tight text-stone-900">{value}</p>
      {hint && <p className="text-[11px] text-stone-400 mt-1">{hint}</p>}
    </AnimatedCard>
  )
}
