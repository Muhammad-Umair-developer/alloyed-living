import "server-only"
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin"

// Admin CRUD only — mirrors products.ts's shape. The customer-facing
// validation/redemption logic (getPromoCodeByCode, redeemPromoCode, etc.)
// lives in alloyed-living's own copy of this file; the two apps don't share
// code across the boundary, same reason Order/types are duplicated between
// them elsewhere in this codebase.

export interface PromoCode {
  id: string
  code: string
  discountType: "percentage" | "flat"
  discountValue: number
  maxDiscountAmount?: number | null
  minOrderValue?: number | null
  maxUses?: number | null
  maxUsesPerCustomer?: number | null
  timesUsed: number
  active: boolean
  expiresAt?: string | null
  createdAt: string
  updatedAt: string
}

export type PromoCodeInput = Omit<PromoCode, "id" | "timesUsed" | "createdAt" | "updatedAt">

type PromoCodeRow = Record<string, unknown>

function rowToPromoCode(r: PromoCodeRow): PromoCode {
  return {
    id: r.id as string,
    code: r.code as string,
    discountType: r.discount_type as PromoCode["discountType"],
    discountValue: Number(r.discount_value),
    maxDiscountAmount: r.max_discount_amount != null ? Number(r.max_discount_amount) : null,
    minOrderValue: r.min_order_value != null ? Number(r.min_order_value) : null,
    maxUses: r.max_uses != null ? Number(r.max_uses) : null,
    maxUsesPerCustomer: r.max_uses_per_customer != null ? Number(r.max_uses_per_customer) : null,
    timesUsed: Number(r.times_used),
    active: Boolean(r.active),
    expiresAt: (r.expires_at as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

function inputToRow(patch: Partial<PromoCodeInput>): PromoCodeRow {
  const row: PromoCodeRow = {}
  if (patch.code !== undefined) row.code = patch.code.trim().toUpperCase()
  if (patch.discountType !== undefined) row.discount_type = patch.discountType
  if (patch.discountValue !== undefined) row.discount_value = patch.discountValue
  if (patch.maxDiscountAmount !== undefined) row.max_discount_amount = patch.maxDiscountAmount ?? null
  if (patch.minOrderValue !== undefined) row.min_order_value = patch.minOrderValue ?? null
  if (patch.maxUses !== undefined) row.max_uses = patch.maxUses ?? null
  if (patch.maxUsesPerCustomer !== undefined) row.max_uses_per_customer = patch.maxUsesPerCustomer ?? null
  if (patch.active !== undefined) row.active = patch.active
  if (patch.expiresAt !== undefined) row.expires_at = patch.expiresAt ?? null
  return row
}

export async function getPromoCodes(): Promise<PromoCode[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToPromoCode)
}

export async function getPromoCode(id: string): Promise<PromoCode | null> {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase.from("promo_codes").select("*").eq("id", id).maybeSingle()
  return data ? rowToPromoCode(data) : null
}

// Unique-code violations (the DB's case-insensitive unique index on
// lower(code)) surface as a friendly error rather than a raw Postgres one —
// this is the one failure mode admins will actually hit, from a typo'd
// duplicate code.
export async function createPromoCode(input: PromoCodeInput): Promise<PromoCode> {
  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()
  const row = { ...inputToRow(input), times_used: 0, created_at: now, updated_at: now }
  const { data, error } = await supabase.from("promo_codes").insert(row).select("*").single()
  if (error) {
    if (error.code === "23505") throw new Error(`A promo code "${input.code.trim().toUpperCase()}" already exists.`)
    throw error
  }
  return rowToPromoCode(data)
}

export async function updatePromoCode(id: string, patch: Partial<PromoCodeInput>): Promise<PromoCode | null> {
  const supabase = createSupabaseAdminClient()
  const row = { ...inputToRow(patch), updated_at: new Date().toISOString() }
  const { data, error } = await supabase.from("promo_codes").update(row).eq("id", id).select("*").maybeSingle()
  if (error) {
    if (error.code === "23505") throw new Error(`A promo code "${(patch.code ?? "").trim().toUpperCase()}" already exists.`)
    throw error
  }
  return data ? rowToPromoCode(data) : null
}

// Deactivate/reactivate — the only "removal" path. There is deliberately no
// deletePromoCode here: the DB trigger already blocks hard-deleting a code
// with times_used > 0, and the admin UI never offers delete at all (used or
// not), so this is the sole way to retire a code.
export async function setPromoCodeActive(id: string, active: boolean): Promise<PromoCode | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("promo_codes")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle()
  if (error) throw error
  return data ? rowToPromoCode(data) : null
}
