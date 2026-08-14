"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { Plus, Search, Pencil, Tag } from "lucide-react"
import type { PromoCode } from "@/src/lib/data/promo-codes"
import EmptyState from "@/src/components/ui/EmptyState"
import { toast } from "@/src/components/ui/ToastAlert"
import { toggleActiveAction } from "@/src/actions/promo-actions"

function pkr(n: number): string {
  return `PKR ${Math.round(n).toLocaleString()}`
}

function discountLabel(p: PromoCode): string {
  if (p.discountType === "percentage") {
    const cap = p.maxDiscountAmount != null ? ` (max ${pkr(p.maxDiscountAmount)})` : ""
    return `${p.discountValue}% off${cap}`
  }
  return `${pkr(p.discountValue)} off`
}

function usageLabel(p: PromoCode): string {
  return `${p.timesUsed} / ${p.maxUses != null ? p.maxUses : "∞"}`
}

function fmtDate(iso?: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" }) : "—"
}

function isExpired(p: PromoCode): boolean {
  return !!p.expiresAt && new Date(p.expiresAt).getTime() < Date.now()
}

// Small pill switch — no dedicated Switch component exists in this dashboard
// yet, so this is a from-scratch minimal one, using the same accent token as
// everywhere else (var(--accent)).
function ActiveToggle({ active, onToggle, disabled }: { active: boolean; onToggle: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={active ? "Deactivate" : "Activate"}
      aria-pressed={active}
      className={`
        relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200
        cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
        ${active ? "bg-[var(--accent)]" : "bg-stone-300"}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
          ${active ? "translate-x-4" : "translate-x-0.5"}
        `}
      />
    </button>
  )
}

export default function PromoCodesListView({ promoCodes }: { promoCodes: PromoCode[] }) {
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState("")
  const [pendingId, setPendingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return promoCodes
    const q = query.trim().toLowerCase()
    return promoCodes.filter((p) => p.code.toLowerCase().includes(q))
  }, [promoCodes, query])

  function handleToggle(promo: PromoCode) {
    setPendingId(promo.id)
    startTransition(async () => {
      try {
        await toggleActiveAction(promo.id, !promo.active)
        toast.success(`"${promo.code}" ${promo.active ? "deactivated" : "activated"}.`)
      } catch {
        toast.error("Couldn't update this promo code.")
      } finally {
        setPendingId(null)
      }
    })
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search codes…"
            className="w-full pl-9 pr-3 py-2 text-[13px] rounded-md border border-stone-200 bg-white outline-none focus:border-stone-400 transition-colors"
          />
        </div>

        <Link
          href="/promo-codes/new"
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-stone-900 rounded-md hover:bg-stone-700 transition-colors"
        >
          <Plus size={14} strokeWidth={2} />
          Add Promo Code
        </Link>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white">
          <EmptyState
            icon={Tag}
            title="No promo codes found"
            description={promoCodes.length === 0 ? "Create your first promo code to get started." : "Try a different search."}
            action={
              promoCodes.length === 0 ? (
                <Link href="/promo-codes/new" className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-stone-900 rounded-md hover:bg-stone-700">
                  <Plus size={14} /> Add Promo Code
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[680px]">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/60">
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Code</th>
                <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Discount</th>
                <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Usage</th>
                <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Expires</th>
                <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-600">Active</th>
                <th className="w-16 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-[13px] font-medium text-stone-800">{p.code}</p>
                    {isExpired(p) && (
                      <p className="text-[10px] text-amber-700 mt-0.5">Expired</p>
                    )}
                  </td>
                  <td className="px-2 py-3 text-[13px] text-stone-700">{discountLabel(p)}</td>
                  <td className="px-2 py-3 text-[13px] tabular-nums text-stone-600">{usageLabel(p)}</td>
                  <td className="px-2 py-3 text-[13px] text-stone-600">{fmtDate(p.expiresAt)}</td>
                  <td className="px-2 py-3">
                    <ActiveToggle
                      active={p.active}
                      disabled={isPending && pendingId === p.id}
                      onToggle={() => handleToggle(p)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/promo-codes/${p.id}/edit`}
                      className="inline-flex p-1.5 text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-md transition-colors"
                      aria-label={`Edit ${p.code}`}
                    >
                      <Pencil size={14} strokeWidth={1.75} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <div className="mt-4 text-[10px] text-stone-600">
        Showing {filtered.length} of {promoCodes.length}
      </div>
    </div>
  )
}
