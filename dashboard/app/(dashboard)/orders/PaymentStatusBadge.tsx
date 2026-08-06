import type { PaymentStatus } from "@/src/lib/data/types"

// Payment-verification lifecycle badge — separate from the fulfilment
// StatusBadge (src/components/ui/StatusBadge.tsx), which stays keyed to
// OrderStatus only and is untouched by this feature.
const STYLES: Partial<Record<PaymentStatus, string>> = {
  awaiting_payment:  "bg-stone-50 text-stone-600 border-stone-200",
  payment_submitted: "bg-sky-50 text-sky-700 border-sky-200",
  payment_verified:  "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/25",
  payment_rejected:  "bg-red-50 text-red-700 border-red-200",
}

const LABELS: Partial<Record<PaymentStatus, string>> = {
  awaiting_payment:  "Awaiting Payment",
  payment_submitted: "Receipt Submitted",
  payment_verified:  "Verified",
  payment_rejected:  "Rejected",
}

export default function PaymentStatusBadge({ status }: { status?: PaymentStatus }) {
  if (!status) return <span className="text-[11px] text-stone-400">—</span>
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border ${
        STYLES[status] ?? "bg-stone-50 text-stone-600 border-stone-200"
      }`}
    >
      {LABELS[status] ?? status}
    </span>
  )
}
