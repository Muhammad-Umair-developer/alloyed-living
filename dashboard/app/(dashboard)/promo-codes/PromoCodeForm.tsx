"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { PromoCode, PromoCodeInput } from "@/src/lib/data/promo-codes"
import { toast } from "@/src/components/ui/ToastAlert"
import { createPromoCodeAction, updatePromoCodeAction } from "@/src/actions/promo-actions"

interface PromoCodeFormProps {
  promoCode?: PromoCode
}

// Same Field/inputCls pattern as ProductForm.tsx — reproduced locally since
// that file doesn't export them (same duplication convention used elsewhere
// in this codebase for small, page-local helpers).
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-stone-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-stone-600 mt-1">{hint}</p>}
    </div>
  )
}

const inputCls = "w-full px-3 py-2 text-[13px] rounded-md border border-stone-200 bg-white outline-none focus:border-stone-400 transition-colors"

// iso 'YYYY-MM-DDTHH:mm:ssZ' -> 'YYYY-MM-DD' for a <input type="date">, and back.
function toDateInputValue(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : ""
}
function fromDateInputValue(val: string): string | null {
  if (!val) return null
  return new Date(`${val}T23:59:59`).toISOString() // end-of-day, so "expires on this date" behaves as expected
}

export default function PromoCodeForm({ promoCode }: PromoCodeFormProps) {
  const router = useRouter()
  const isEdit = !!promoCode
  const [isPending, startTransition] = useTransition()

  const [code, setCode] = useState(promoCode?.code ?? "")
  const [discountType, setDiscountType] = useState<PromoCode["discountType"]>(promoCode?.discountType ?? "percentage")
  const [discountValue, setDiscountValue] = useState(promoCode?.discountValue?.toString() ?? "")
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(promoCode?.maxDiscountAmount?.toString() ?? "")
  const [minOrderValue, setMinOrderValue] = useState(promoCode?.minOrderValue?.toString() ?? "")
  const [maxUses, setMaxUses] = useState(promoCode?.maxUses?.toString() ?? "")
  const [maxUsesPerCustomer, setMaxUsesPerCustomer] = useState(promoCode?.maxUsesPerCustomer?.toString() ?? "")
  const [expiresAt, setExpiresAt] = useState(toDateInputValue(promoCode?.expiresAt))
  const [active, setActive] = useState(promoCode?.active ?? true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!code.trim()) errs.code = "Code is required"
    const value = Number(discountValue)
    if (!discountValue || Number.isNaN(value) || value <= 0) {
      errs.discountValue = "Enter a valid amount"
    } else if (discountType === "percentage" && value > 100) {
      errs.discountValue = "Percentage codes can't exceed 100%"
    }
    if (maxDiscountAmount && Number(maxDiscountAmount) <= 0) errs.maxDiscountAmount = "Enter a valid cap or leave blank"
    if (minOrderValue && Number(minOrderValue) < 0) errs.minOrderValue = "Enter a valid amount or leave blank"
    if (maxUses && (!Number.isInteger(Number(maxUses)) || Number(maxUses) <= 0)) errs.maxUses = "Enter a whole number or leave blank"
    if (maxUsesPerCustomer && (!Number.isInteger(Number(maxUsesPerCustomer)) || Number(maxUsesPerCustomer) <= 0)) {
      errs.maxUsesPerCustomer = "Enter a whole number or leave blank"
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) {
      toast.error("Please review the highlighted fields.")
      return
    }

    const input: PromoCodeInput = {
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      maxDiscountAmount: discountType === "percentage" && maxDiscountAmount ? Number(maxDiscountAmount) : null,
      minOrderValue: minOrderValue ? Number(minOrderValue) : null,
      maxUses: maxUses ? Number(maxUses) : null,
      maxUsesPerCustomer: maxUsesPerCustomer ? Number(maxUsesPerCustomer) : null,
      expiresAt: fromDateInputValue(expiresAt),
      active,
    }

    startTransition(async () => {
      try {
        if (isEdit) {
          await updatePromoCodeAction(promoCode!.id, input)
          toast.success("Promo code updated.")
        } else {
          await createPromoCodeAction(input)
          toast.success("Promo code created.")
        }
        router.push("/promo-codes")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't save this promo code.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Link href="/promo-codes" className="inline-flex items-center gap-1.5 text-[12px] text-stone-500 hover:text-stone-800 mb-6">
        <ArrowLeft size={13} /> Back to Promo Codes
      </Link>

      <div className="max-w-xl space-y-6 rounded-lg border border-stone-200 bg-white p-6">
        <Field label="Code" hint="Not case-sensitive — stored and matched as uppercase.">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SAVE10"
            className={`${inputCls} ${errors.code ? "border-red-300" : ""} tracking-wider`}
          />
          {errors.code && <p className="text-[11px] text-red-600 mt-1">{errors.code}</p>}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Discount Type">
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as PromoCode["discountType"])}
              className={`${inputCls} cursor-pointer`}
            >
              <option value="percentage">Percentage</option>
              <option value="flat">Flat Amount</option>
            </select>
          </Field>
          <Field label={discountType === "percentage" ? "Percentage (0–100)" : "Amount (PKR)"}>
            <input
              type="number"
              min={0}
              max={discountType === "percentage" ? 100 : undefined}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className={`${inputCls} ${errors.discountValue ? "border-red-300" : ""}`}
            />
            {errors.discountValue && <p className="text-[11px] text-red-600 mt-1">{errors.discountValue}</p>}
          </Field>
        </div>

        {discountType === "percentage" && (
          <Field label="Max Discount Amount (PKR)" hint="Optional cap on the discount, e.g. 15% off capped at PKR 5,000. Leave blank for no cap.">
            <input
              type="number"
              min={0}
              value={maxDiscountAmount}
              onChange={(e) => setMaxDiscountAmount(e.target.value)}
              className={`${inputCls} ${errors.maxDiscountAmount ? "border-red-300" : ""}`}
            />
            {errors.maxDiscountAmount && <p className="text-[11px] text-red-600 mt-1">{errors.maxDiscountAmount}</p>}
          </Field>
        )}

        <Field label="Minimum Order Value (PKR)" hint="Leave blank for no minimum.">
          <input
            type="number"
            min={0}
            value={minOrderValue}
            onChange={(e) => setMinOrderValue(e.target.value)}
            className={`${inputCls} ${errors.minOrderValue ? "border-red-300" : ""}`}
          />
          {errors.minOrderValue && <p className="text-[11px] text-red-600 mt-1">{errors.minOrderValue}</p>}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Max Total Uses" hint="Leave blank for unlimited.">
            <input
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className={`${inputCls} ${errors.maxUses ? "border-red-300" : ""}`}
            />
            {errors.maxUses && <p className="text-[11px] text-red-600 mt-1">{errors.maxUses}</p>}
          </Field>
          <Field label="Max Uses Per Customer" hint="Leave blank for unlimited.">
            <input
              type="number"
              min={1}
              value={maxUsesPerCustomer}
              onChange={(e) => setMaxUsesPerCustomer(e.target.value)}
              className={`${inputCls} ${errors.maxUsesPerCustomer ? "border-red-300" : ""}`}
            />
            {errors.maxUsesPerCustomer && <p className="text-[11px] text-red-600 mt-1">{errors.maxUsesPerCustomer}</p>}
          </Field>
        </div>

        <Field label="Expires On" hint="Leave blank to never expire.">
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className={inputCls}
          />
        </Field>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="cursor-pointer"
          />
          <span className="text-[13px] text-stone-700">Active — customers can redeem this code</span>
        </label>
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 text-[13px] font-medium text-white bg-stone-900 rounded-md hover:bg-stone-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Promo Code"}
        </button>
        <Link href="/promo-codes" className="px-5 py-2.5 text-[13px] font-medium text-stone-600 hover:text-stone-900 transition-colors">
          Cancel
        </Link>
      </div>
    </form>
  )
}
