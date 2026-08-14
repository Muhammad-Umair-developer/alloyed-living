import "server-only"
import { randomInt } from "node:crypto"
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin"
import { calculateDownpayment } from "@/src/lib/checkout/pricing"
import { redeemPromoCode } from "@/src/lib/data/promo-codes"
import type { Order, OrderInput, OrderStatus, PaymentStatus, PaymentMethod, DepositAccount } from "./types"

// Orders are written by trusted server paths only (checkout order creation and
// the payment-receipt/verification flow), so this uses the service-role client.

type OrderRow = Record<string, unknown>

function rowToOrder(r: OrderRow): Order {
  return {
    id: r.id as string,
    status: r.status as OrderStatus,
    items: r.items as Order["items"],
    customer: r.customer as Order["customer"],
    shippingAddress: r.shipping_address as Order["shippingAddress"],
    subtotal: Number(r.subtotal),
    delivery: Number(r.delivery),
    total: Number(r.total),
    paymentStatus: (r.payment_status as PaymentStatus | null) ?? undefined,
    paymentMethod: (r.payment_method as PaymentMethod | null) ?? undefined,
    depositAccount: (r.deposit_account as DepositAccount | null) ?? undefined,
    payableAmount: r.payable_amount != null ? Number(r.payable_amount) : undefined,
    depositAmount: r.deposit_amount != null ? Number(r.deposit_amount) : undefined,
    codBalanceDue: r.cod_balance_due != null ? Number(r.cod_balance_due) : undefined,
    paymentRejectionReason: (r.payment_rejection_reason as string | null) ?? undefined,
    paymentProvider: (r.payment_provider as string | null) ?? undefined,
    paymentRef: (r.payment_ref as string | null) ?? undefined,
    accessToken: (r.access_token as string | null) ?? undefined,
    downpaymentAmount: r.downpayment_amount != null ? Number(r.downpayment_amount) : undefined,
    downpaymentPercent: r.downpayment_percent != null ? Number(r.downpayment_percent) : undefined,
    cancelledAt: (r.cancelled_at as string | null) ?? undefined,
    cancellationReason: (r.cancellation_reason as string | null) ?? undefined,
    refundAmount: r.refund_amount != null ? Number(r.refund_amount) : undefined,
    refundStatus: (r.refund_status as Order["refundStatus"]) ?? undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

export async function getOrders(): Promise<Order[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToOrder)
}

export async function getOrder(id: string): Promise<Order | null> {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase.from("orders").select("*").eq("id", id).maybeSingle()
  return data ? rowToOrder(data) : null
}

// Look an order up by its opaque access token — the ONLY lookup the public
// checkout-success page may use. Order IDs are human-friendly and guessable;
// the token is a random UUID unique per order, so possessing it proves the
// caller came from this order's own checkout redirect.
export async function getOrderByAccessToken(token: string): Promise<Order | null> {
  if (!token) return null
  const supabase = createSupabaseAdminClient()
  // eq on a uuid column errors on malformed input — treat that as not-found.
  const { data, error } = await supabase.from("orders").select("*").eq("access_token", token).maybeSingle()
  if (error) return null
  return data ? rowToOrder(data) : null
}

// The account page's order history — every order this user placed while
// signed in (guest orders and pre-linking-migration orders with no user_id
// obviously can't appear here). Newest first, same ordering as getOrders().
export async function getOrdersForUser(userId: string): Promise<Order[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToOrder)
}

// Random suffix instead of a sequential counter: the old read-all-then-max
// approach raced under concurrent checkouts (duplicate primary keys) and made
// order IDs trivially enumerable. Collisions are retried on the PK conflict.
function newOrderId(): string {
  const year = new Date().getFullYear()
  return `AL-${year}-${randomInt(100000, 1000000)}`
}

// ── Awaiting-payment amounts ────────────────────────────────────────────────
export interface PaymentIntent {
  method: PaymentMethod
  depositAccount?: DepositAccount | null // required for 'cod', ignored otherwise
}

interface AwaitingAmounts {
  payableAmount: number
  depositAmount: number | null
  depositPercent: number | null
  codBalanceDue: number | null
}

// Amounts are derived SERVER-SIDE from the server-priced total — never from
// client input — and are plain, unmodified figures (no paisa marker / drift):
// COD pays a tiered downpayment (see calculateDownpayment — flat Rs 500 or
// full total below Rs 10,000, then a scaling percentage above that), bank
// methods pay the exact order total. Payments are matched to orders in the
// dashboard via the access-token-linked receipt, sender name and transaction
// reference — NOT by a unique amount — so amounts may repeat freely.
function computeAwaitingAmounts(orderTotal: number, intent: PaymentIntent): AwaitingAmounts {
  if (intent.method === "cod") {
    const deposit = calculateDownpayment(orderTotal)
    return {
      payableAmount: deposit,
      depositAmount: deposit,
      depositPercent: orderTotal > 0 ? (deposit / orderTotal) * 100 : 0,
      codBalanceDue: orderTotal - deposit, // 0 when the total is at or below the deposit
    }
  }
  return { payableAmount: orderTotal, depositAmount: null, depositPercent: null, codBalanceDue: null }
}

export interface PromoRedemption {
  promoCodeId: string
  code: string
  amount: number
}

// userId comes ONLY from the server-side session (see placeOrderAction) —
// never accept one from client input. Null for guest checkout; the column
// itself is nullable for exactly that reason.
//
// `promo`, if given, is redeemed FIRST — before the order is inserted — via
// the same atomically-guarded update pattern as applyPaymentTransition, so
// "never exceed max_uses" holds even under concurrent checkouts. If the
// redemption is lost to a race (or the code was exhausted in the gap since
// priceOrderItems validated it), this throws rather than silently creating
// the order without the discount — the caller (placeOrderAction) catches
// this specific failure and surfaces a clean, explicit error to the
// customer. Trade-off, noted deliberately: if the INSERT below fails for an
// unrelated reason after a successful redemption, that redemption slot is
// spent with no matching order — accepted in favor of never overshooting
// max_uses, which matters more.
export async function createOrder(
  input: OrderInput,
  intent: PaymentIntent,
  userId: string | null,
  promo?: PromoRedemption | null,
): Promise<Order> {
  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()

  if (input.total <= 0) {
    console.warn(`[createOrder] Non-positive order total (${input.total}) for a ${intent.method} order.`)
  }

  if (promo) {
    const redeemed = await redeemPromoCode(promo.promoCodeId)
    if (!redeemed) {
      throw new Error(
        "PROMO_REDEMPTION_FAILED: This promo code just reached its usage limit. Please remove it and try again.",
      )
    }
  }

  const depositAccount = intent.method === "cod" ? (intent.depositAccount ?? null) : null
  const amounts = computeAwaitingAmounts(input.total, intent)

  const base = {
    status: "pending",
    items: input.items,
    customer: input.customer,
    shipping_address: input.shippingAddress,
    subtotal: input.subtotal,
    delivery: input.delivery,
    total: input.total,
    payment_status: "awaiting_payment",
    payment_method: intent.method,
    deposit_account: depositAccount,
    payable_amount: amounts.payableAmount,
    deposit_amount: amounts.depositAmount,
    cod_balance_due: amounts.codBalanceDue,
    downpayment_amount: amounts.depositAmount,
    downpayment_percent: amounts.depositPercent,
    discount_code: promo?.code ?? null,
    discount_amount: promo?.amount ?? 0,
    user_id: userId,
    created_at: now,
    updated_at: now,
  }

  // The only uniqueness left to guard is the order-id primary key. payable_amount
  // is intentionally NOT unique (the pending unique index is dropped in the DB),
  // so repeated amounts insert fine.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("orders")
      .insert({ ...base, id: newOrderId() })
      .select("*")
      .single()
    if (!error) return rowToOrder(data)
    if (error.code !== "23505") throw error // 23505 = id collision → retry with a fresh id
  }
  throw new Error("Could not allocate a unique order id.")
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle()
  if (error) throw error
  return data ? rowToOrder(data) : null
}

export type CancelOrderResult =
  | { ok: true; order: Order }
  | { ok: false; error: string }

// Customer self-service cancellation, looked up by the opaque access token —
// NEVER the guessable order id, same rule as getOrderByAccessToken. Re-reads
// status fresh from the DB and only proceeds if it's still 'pending'; the
// client's view of the order (which gated the Cancel button) is never
// trusted, since it could be stale by the time this runs. Refund logic
// mirrors cancelOrder() in dashboard/src/lib/data/orders.ts's 'pending'
// branch exactly — full downpayment refund, refund_status 'pending' — but
// that function's 'shipped or later → no refund' branch has no equivalent
// here: this action refuses outright (rather than cancelling with a zero
// refund) once the order is no longer pending, since the customer-facing
// button is never shown past that point in the first place.
export async function cancelOrderByAccessToken(token: string, reason: string): Promise<CancelOrderResult> {
  if (!token) return { ok: false, error: "Order not found." }
  const supabase = createSupabaseAdminClient()

  const { data: current, error: readErr } = await supabase
    .from("orders")
    .select("id, status, downpayment_amount")
    .eq("access_token", token)
    .maybeSingle()
  if (readErr || !current) return { ok: false, error: "Order not found." }

  if (current.status !== "pending") {
    return { ok: false, error: "This order can no longer be cancelled online. Please contact support." }
  }

  const refundAmount = Number(current.downpayment_amount ?? 0)

  // Guarded on status = 'pending' at write time too (optimistic concurrency),
  // so a concurrent admin action (e.g. marking it shipped) between the read
  // above and this write can't be silently overwritten by the cancellation.
  const { data, error } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      refund_amount: refundAmount,
      refund_status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", current.id as string)
    .eq("status", "pending")
    .select("*")
    .maybeSingle()
  if (error) throw error
  if (!data) {
    return { ok: false, error: "This order can no longer be cancelled online. Please contact support." }
  }
  return { ok: true, order: rowToOrder(data) }
}

// Customer self-service cancellation from the account page's order history —
// same shape of guarantee as cancelOrderByAccessToken above, just proven a
// different way: there it's "you have the opaque token"; here it's "you're
// signed in as the account that placed this order" (user_id folded directly
// into the lookup, never trusted separately). Refund logic and the "refuse
// outright once no longer pending" behavior are identical to the token path.
export async function cancelOrderByUser(orderId: string, userId: string, reason: string): Promise<CancelOrderResult> {
  if (!orderId || !userId) return { ok: false, error: "Order not found." }
  const supabase = createSupabaseAdminClient()

  const { data: current, error: readErr } = await supabase
    .from("orders")
    .select("id, status, downpayment_amount")
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle()
  if (readErr || !current) return { ok: false, error: "Order not found." }

  if (current.status !== "pending") {
    return { ok: false, error: "This order can no longer be cancelled online. Please contact support." }
  }

  const refundAmount = Number(current.downpayment_amount ?? 0)

  // Guarded on id + user_id + status = 'pending' at write time too — same
  // optimistic-concurrency pattern as cancelOrderByAccessToken.
  const { data, error } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      refund_amount: refundAmount,
      refund_status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle()
  if (error) throw error
  if (!data) {
    return { ok: false, error: "This order can no longer be cancelled online. Please contact support." }
  }
  return { ok: true, order: rowToOrder(data) }
}
