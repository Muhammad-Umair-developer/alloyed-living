import "server-only"
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin"

// Raw DB access only — mirrors orders.ts/addresses.ts. Business rules
// (validity checks, discount math) live in checkout/pricing.ts's
// validatePromoCode(), which calls the functions here; this file never
// decides whether a code is usable, it only reads/writes rows.

export interface PromoCode {
  id: string
  code: string // canonical stored casing
  discountType: "percentage" | "flat"
  discountValue: number
  maxDiscountAmount?: number
  minOrderValue?: number
  maxUses?: number
  maxUsesPerCustomer?: number
  timesUsed: number
  active: boolean
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

type PromoCodeRow = Record<string, unknown>

function rowToPromoCode(r: PromoCodeRow): PromoCode {
  return {
    id: r.id as string,
    code: r.code as string,
    discountType: r.discount_type as PromoCode["discountType"],
    discountValue: Number(r.discount_value),
    maxDiscountAmount: r.max_discount_amount != null ? Number(r.max_discount_amount) : undefined,
    minOrderValue: r.min_order_value != null ? Number(r.min_order_value) : undefined,
    maxUses: r.max_uses != null ? Number(r.max_uses) : undefined,
    maxUsesPerCustomer: r.max_uses_per_customer != null ? Number(r.max_uses_per_customer) : undefined,
    timesUsed: Number(r.times_used),
    active: Boolean(r.active),
    expiresAt: (r.expires_at as string | null) ?? undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

// Escapes ILIKE metacharacters so a code containing % or _ can't turn this
// exact-match lookup into an unintended wildcard scan.
function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, (c) => `\\${c}`)
}

// Case-insensitive exact match — SAVE10 and save10 find the same row, per
// the DB's own unique index on lower(code).
export async function getPromoCodeByCode(code: string): Promise<PromoCode | null> {
  const trimmed = code.trim()
  if (!trimmed) return null
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .ilike("code", escapeIlike(trimmed))
    .maybeSingle()
  if (error || !data) return null
  return rowToPromoCode(data)
}

// Count of this user's own past orders that used this exact code — exact
// match, since orders.discount_code is always snapshotted verbatim from
// promo_codes.code, never independently typed by anyone.
export async function getUserPromoRedemptionCount(userId: string, code: string): Promise<number> {
  const supabase = createSupabaseAdminClient()
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("discount_code", code)
  if (error) throw error
  return count ?? 0
}

// Atomically guarded increment — same optimistic-concurrency pattern as
// applyPaymentTransition (src/lib/payments/transitions.ts): read the current
// times_used, then update guarded on that EXACT value plus the max_uses
// ceiling, so two concurrent redemptions of a code with one slot left can
// never both succeed. Single attempt, no retry loop — a lost race returns
// null, and the caller (createOrder) must treat that as "this code is no
// longer available," not silently proceed without the discount.
export async function redeemPromoCode(promoCodeId: string): Promise<PromoCode | null> {
  const supabase = createSupabaseAdminClient()

  const { data: current, error: readErr } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("id", promoCodeId)
    .maybeSingle()
  if (readErr || !current) return null

  const timesUsed = Number(current.times_used)
  const maxUses = current.max_uses != null ? Number(current.max_uses) : null
  if (maxUses != null && timesUsed >= maxUses) return null

  const { data, error } = await supabase
    .from("promo_codes")
    .update({ times_used: timesUsed + 1, updated_at: new Date().toISOString() })
    .eq("id", promoCodeId)
    .eq("times_used", timesUsed) // optimistic concurrency guard
    .select("*")
    .maybeSingle()
  if (error) throw error
  return data ? rowToPromoCode(data) : null
}
