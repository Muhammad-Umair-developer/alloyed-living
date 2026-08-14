import "server-only"
import { getProductsByIds } from "@/src/lib/data/products"
import { getPromoCodeByCode, getUserPromoRedemptionCount } from "@/src/lib/data/promo-codes"
import type { OrderItem } from "@/src/lib/data/types"

// calculateDownpayment lives in ./constants (client-safe, no "server-only")
// so the checkout page can call it too. Re-exported here so existing server
// callers of pricing.ts don't need to know it moved.
export { calculateDownpayment } from "@/src/lib/checkout/constants"

// Single source of truth for order pricing. NOTHING money-related is ever
// trusted from the client: item prices, names, images, subtotal, delivery and
// total are all recomputed here from live product rows. Used by all checkout
// methods (COD, UBL, JazzCash) so they cannot drift.

export const DELIVERY_THRESHOLD = 100000
export const DELIVERY_FEE = 500

const MAX_QTY_PER_ITEM = 99

function pkr(n: number): string {
  return `PKR ${Math.round(n).toLocaleString("en-PK")}`
}

export interface PromoValidationResult {
  ok: boolean
  error?: string
  code?: string // canonical code, if valid
  discountAmount?: number
  promoCodeId?: string
}

// Business rules for a promo code — existence/active/expiry/thresholds/usage
// caps — live here, not in data/promo-codes.ts, which only reads/writes rows.
// Called by priceOrderItems below (the binding, order-placement path) and by
// previewPromoCodeAction (store-actions.ts, checkout UI preview) — both run
// the SAME validation, so a preview can never say "valid" when the real
// placement would say otherwise, or vice versa. `userId` may be null (no
// session, or the per-customer check simply doesn't apply); the
// max-uses-per-customer check is skipped in that case, not treated as a pass.
export async function validatePromoCode(
  rawCode: string,
  subtotal: number,
  userId: string | null,
): Promise<PromoValidationResult> {
  const trimmed = (rawCode ?? "").trim()
  if (!trimmed) return { ok: false, error: "Please enter a promo code." }

  const promo = await getPromoCodeByCode(trimmed)
  if (!promo || !promo.active) {
    return { ok: false, error: "Invalid promo code." }
  }
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) {
    return { ok: false, error: "This promo code has expired." }
  }
  if (promo.minOrderValue != null && subtotal < promo.minOrderValue) {
    return { ok: false, error: `This code requires a minimum order of ${pkr(promo.minOrderValue)}.` }
  }
  if (promo.maxUses != null && promo.timesUsed >= promo.maxUses) {
    return { ok: false, error: "This promo code has reached its usage limit." }
  }
  if (userId && promo.maxUsesPerCustomer != null) {
    const used = await getUserPromoRedemptionCount(userId, promo.code)
    if (used >= promo.maxUsesPerCustomer) {
      return { ok: false, error: "You've already used this promo code the maximum number of times." }
    }
  }

  let discountAmount =
    promo.discountType === "percentage" ? subtotal * (promo.discountValue / 100) : promo.discountValue
  if (promo.discountType === "percentage" && promo.maxDiscountAmount != null) {
    discountAmount = Math.min(discountAmount, promo.maxDiscountAmount)
  }
  discountAmount = Math.min(discountAmount, subtotal) // never exceed the subtotal itself

  return { ok: true, code: promo.code, discountAmount, promoCodeId: promo.id }
}

export type PricedOrder =
  | {
      ok: true
      items: OrderItem[]
      subtotal: number // ORIGINAL, pre-discount
      delivery: number
      total: number
      discountCode: string | null
      discountAmount: number // 0 when no code applied
      promoCodeId: string | null
    }
  | { ok: false; error: string }

export async function priceOrderItems(
  requested: Array<{ productId: string; quantity: number }>,
  opts?: { promoCode?: string; userId?: string | null },
): Promise<PricedOrder> {
  if (!Array.isArray(requested) || requested.length === 0) {
    return { ok: false, error: "Your cart is empty." }
  }
  if (requested.length > 50) {
    return { ok: false, error: "Too many items in one order." }
  }

  // Merge duplicate product lines so quantity/stock checks see the real total.
  const wanted = new Map<string, number>()
  for (const line of requested) {
    const qty = line?.quantity
    const id = String(line?.productId ?? "")
    if (!id) return { ok: false, error: "Invalid item in cart." }
    if (!Number.isInteger(qty) || qty <= 0 || qty > MAX_QTY_PER_ITEM) {
      return { ok: false, error: "Invalid item quantity." }
    }
    wanted.set(id, (wanted.get(id) ?? 0) + qty)
  }

  const products = await getProductsByIds([...wanted.keys()])
  const byId = new Map(products.map((p) => [p.id, p]))

  const items: OrderItem[] = []
  let subtotal = 0
  for (const [productId, quantity] of wanted) {
    const product = byId.get(productId)
    if (!product) return { ok: false, error: "One or more items are no longer available." }
    if (product.stock < quantity) {
      return { ok: false, error: `Only ${product.stock} of "${product.name}" left in stock.` }
    }
    const unitPrice =
      product.discountPrice != null && product.discountPrice > 0 ? product.discountPrice : product.price
    subtotal += unitPrice * quantity
    items.push({
      productId,
      name: product.name,
      price: unitPrice,
      quantity,
      image: product.image || undefined,
    })
  }

  // Promo code — validated against the SAME subtotal just computed above
  // (server-priced, never client-supplied). On failure, return the explicit
  // error immediately: no order is created, and there is no silent
  // full-price fallback.
  let discountCode: string | null = null
  let discountAmount = 0
  let promoCodeId: string | null = null
  if (opts?.promoCode?.trim()) {
    const validated = await validatePromoCode(opts.promoCode, subtotal, opts.userId ?? null)
    if (!validated.ok) return { ok: false, error: validated.error ?? "Invalid promo code." }
    discountCode = validated.code ?? null
    discountAmount = validated.discountAmount ?? 0
    promoCodeId = validated.promoCodeId ?? null
  }

  // Free-shipping threshold is checked against the DISCOUNTED subtotal, per
  // the locked-in decision — a coupon can push an order over (or keep it
  // under) the threshold.
  const discountedSubtotal = subtotal - discountAmount
  const delivery = discountedSubtotal >= DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
  const total = discountedSubtotal + delivery
  if (total <= 0) return { ok: false, error: "Invalid order total." }

  return { ok: true, items, subtotal, delivery, total, discountCode, discountAmount, promoCodeId }
}
