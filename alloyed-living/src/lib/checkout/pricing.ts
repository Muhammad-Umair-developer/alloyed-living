import "server-only"
import { getProductsByIds } from "@/src/lib/data/products"
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

export type PricedOrder =
  | {
      ok: true
      items: OrderItem[]
      subtotal: number
      delivery: number
      total: number
    }
  | { ok: false; error: string }

export async function priceOrderItems(
  requested: Array<{ productId: string; quantity: number }>,
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

  const delivery = subtotal >= DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
  const total = subtotal + delivery
  if (total <= 0) return { ok: false, error: "Invalid order total." }

  return { ok: true, items, subtotal, delivery, total }
}
