import { AlertTriangle } from "lucide-react"
import type { Order } from "@/src/lib/data/types"

function pkr(n?: number): string {
  return n != null ? `PKR ${n.toLocaleString()}` : "—"
}

function fmt(dt?: string): string {
  return dt ? new Date(dt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—"
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-[10px] font-medium uppercase tracking-wide text-stone-500">{label}</span>
      <p className="text-[13px] text-stone-800 mt-0.5 break-words">{value}</p>
    </div>
  )
}

// Only ever rendered for a cancelled order (see the caller in page.tsx) — a
// visible record of the refund cancelOrder() calculated, so an admin can't
// miss an amount still owed. Read-only: no action here writes anything, all
// refund state comes from cancelOrderAction/cancelOrder().
export default function CancellationPanel({ order }: { order: Order }) {
  const pending = order.refundStatus === "pending"

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6 space-y-5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600">Cancellation</p>

      {pending && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2.5">
          <AlertTriangle size={14} className="text-amber-700 mt-px flex-shrink-0" />
          <p className="text-[12px] leading-relaxed text-amber-800">
            Refund owed: {pkr(order.refundAmount)} — not yet processed.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Refund Amount" value={pkr(order.refundAmount)} />
        <Field label="Refund Status" value={order.refundStatus ?? "—"} />
        <Field label="Cancelled At" value={fmt(order.cancelledAt)} />
        <Field label="Reason" value={order.cancellationReason || "—"} />
      </div>
    </div>
  )
}
