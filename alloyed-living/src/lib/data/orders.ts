import "server-only"
import { randomInt } from "node:crypto"
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin"
import { COD_NOMINAL_DEPOSIT } from "@/src/lib/checkout/constants"
import type { Order, OrderInput, OrderStatus, PaymentStatus, PaymentMethod, DepositAccount } from "./types"

// Orders are written by trusted server paths only (checkout order creation and
// the Safepay webhook's payment update), so this uses the service-role client.

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
  codBalanceDue: number | null
}

// Amounts are derived SERVER-SIDE from the server-priced total — never from
// client input — and are plain, unmodified figures (no paisa marker / drift):
// COD pays a flat Rs 500 deposit (or the full total if that is smaller), bank
// methods pay the exact order total. Payments are matched to orders in the
// dashboard via the access-token-linked receipt, sender name and transaction
// reference — NOT by a unique amount — so amounts may repeat freely.
function computeAwaitingAmounts(orderTotal: number, intent: PaymentIntent): AwaitingAmounts {
  if (intent.method === "cod") {
    const deposit = Math.min(COD_NOMINAL_DEPOSIT, orderTotal) // pay-in-full for tiny orders
    return {
      payableAmount: deposit,
      depositAmount: deposit,
      codBalanceDue: orderTotal - deposit, // 0 when the total is at or below the deposit
    }
  }
  return { payableAmount: orderTotal, depositAmount: null, codBalanceDue: null }
}

export async function createOrder(input: OrderInput, intent: PaymentIntent): Promise<Order> {
  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()

  if (input.total <= 0) {
    console.warn(`[createOrder] Non-positive order total (${input.total}) for a ${intent.method} order.`)
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
