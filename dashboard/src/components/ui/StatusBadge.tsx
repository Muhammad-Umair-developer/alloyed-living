import type { OrderStatus } from "@/src/lib/data/types"

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  shipped:   "bg-sky-50 text-sky-700 border-sky-200",
  delivered: "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/25",
  returned:  "bg-red-50 text-red-700 border-red-200",
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:   "Pending",
  shipped:   "Shipped",
  delivered: "Delivered",
  returned:  "Returned",
}

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
