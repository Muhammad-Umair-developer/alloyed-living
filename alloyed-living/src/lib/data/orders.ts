import "server-only"
import { randomInt } from "node:crypto"
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin"
import type { Order, OrderInput, OrderStatus, PaymentStatus } from "./types"

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

// Find an order by its Safepay tracker token — used by the webhook/redirect to
// map a payment event back to the originating order.
export async function getOrderByPaymentRef(ref: string): Promise<Order | null> {
  if (!ref) return null
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase.from("orders").select("*").eq("payment_ref", ref).maybeSingle()
  return data ? rowToOrder(data) : null
}

// Update only the payment-related fields of an order.
export async function setOrderPayment(
  id: string,
  patch: { paymentStatus?: PaymentStatus; paymentProvider?: string; paymentRef?: string },
): Promise<Order | null> {
  const supabase = createSupabaseAdminClient()
  const row: OrderRow = { updated_at: new Date().toISOString() }
  if (patch.paymentStatus !== undefined) row.payment_status = patch.paymentStatus
  if (patch.paymentProvider !== undefined) row.payment_provider = patch.paymentProvider
  if (patch.paymentRef !== undefined) row.payment_ref = patch.paymentRef
  const { data, error } = await supabase.from("orders").update(row).eq("id", id).select("*").maybeSingle()
  if (error) throw error
  return data ? rowToOrder(data) : null
}

// Random suffix instead of a sequential counter: the old read-all-then-max
// approach raced under concurrent checkouts (duplicate primary keys) and made
// order IDs trivially enumerable. Collisions are retried on the PK conflict.
function newOrderId(): string {
  const year = new Date().getFullYear()
  return `AL-${year}-${randomInt(100000, 1000000)}`
}

export async function createOrder(input: OrderInput): Promise<Order> {
  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()
  const base = {
    status: "pending",
    items: input.items,
    customer: input.customer,
    shipping_address: input.shippingAddress,
    subtotal: input.subtotal,
    delivery: input.delivery,
    total: input.total,
    created_at: now,
    updated_at: now,
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("orders")
      .insert({ ...base, id: newOrderId() })
      .select("*")
      .single()
    if (!error) return rowToOrder(data)
    if (error.code !== "23505") throw error // 23505 = unique violation → retry with a new id
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
