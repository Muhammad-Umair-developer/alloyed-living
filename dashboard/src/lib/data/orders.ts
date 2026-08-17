import "server-only"
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin"
import type { Order, OrderInput, OrderStatus, PaymentStatus } from "./types"

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
    paymentStatus: (r.payment_status as Order["paymentStatus"]) ?? undefined,
    paymentMethod: (r.payment_method as Order["paymentMethod"]) ?? undefined,
    depositAccount: (r.deposit_account as Order["depositAccount"]) ?? undefined,
    payableAmount: r.payable_amount != null ? Number(r.payable_amount) : undefined,
    depositAmount: r.deposit_amount != null ? Number(r.deposit_amount) : undefined,
    codBalanceDue: r.cod_balance_due != null ? Number(r.cod_balance_due) : undefined,
    paymentReceiptPath: (r.payment_receipt_path as string | null) ?? undefined,
    paymentReceiptHash: (r.payment_receipt_hash as string | null) ?? undefined,
    paymentSenderName: (r.payment_sender_name as string | null) ?? undefined,
    paymentSenderMobile: (r.payment_sender_mobile as string | null) ?? undefined,
    paymentReference: (r.payment_reference as string | null) ?? undefined,
    paymentSubmittedAt: (r.payment_submitted_at as string | null) ?? undefined,
    paymentFlagged: Boolean(r.payment_flagged),
    paymentFlagReason: (r.payment_flag_reason as string | null) ?? undefined,
    paymentVerifiedAt: (r.payment_verified_at as string | null) ?? undefined,
    paymentVerifiedBy: (r.payment_verified_by as string | null) ?? undefined,
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

// limit/paymentStatusIn are both optional and additive — a bare getOrders()
// still fetches everything, unchanged, for callers that need the full set
// (e.g. Purchases' itemized table's own .limit(200) call below is explicit,
// not implied by this default).
export interface GetOrdersOptions {
  limit?: number
  paymentStatusIn?: PaymentStatus[]
}

export async function getOrders(opts: GetOrdersOptions = {}): Promise<Order[]> {
  const supabase = createSupabaseAdminClient()
  let query = supabase.from("orders").select("*").order("created_at", { ascending: false })
  if (opts.paymentStatusIn?.length) query = query.in("payment_status", opts.paymentStatusIn)
  if (opts.limit) query = query.limit(opts.limit)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(rowToOrder)
}

// Overview page's status pie chart. Backed by the order_status_counts()
// migration function — a single GROUP BY instead of fetching every order
// just to reduce it client-side. GROUP BY never emits a row for a status
// with zero orders, so every OrderStatus is seeded at 0 first.
export async function getOrderStatusCounts(): Promise<Record<OrderStatus, number>> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc("order_status_counts")
  if (error) throw error
  const counts: Record<OrderStatus, number> = {
    pending: 0, shipped: 0, delivered: 0, returned: 0, exchanged: 0, cancelled: 0,
  }
  for (const row of (data ?? []) as { status: string; count: number }[]) {
    if (row.status in counts) counts[row.status as OrderStatus] = Number(row.count)
  }
  return counts
}

// Orders page's "New Orders" badge — the TRUE total, decoupled from both
// the main table's .limit(200) and from however many rows the New Orders
// tab's own list query happens to return.
export async function getOrderCountByPaymentStatus(statuses: PaymentStatus[]): Promise<number> {
  const supabase = createSupabaseAdminClient()
  const { count, error } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .in("payment_status", statuses)
  if (error) throw error
  return count ?? 0
}

// Purchases page's summary cards. Backed by the purchases_summary()
// migration function — see its comment for why a jsonb-summing RPC is
// needed instead of a plain .select(). Deliberately separate from whatever
// powers the itemized table, so capping that table's fetch never affects
// these totals.
export interface PurchasesSummary {
  totalOrders: number
  itemsPurchased: number
  returnedOrders: number
  returnedItems: number
  exchangedOrders: number
  exchangedItems: number
}

export async function getPurchasesSummary(): Promise<PurchasesSummary> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc("purchases_summary")
  if (error) throw error
  const row = data?.[0]
  return {
    totalOrders: Number(row?.total_orders ?? 0),
    itemsPurchased: Number(row?.items_purchased ?? 0),
    returnedOrders: Number(row?.returned_orders ?? 0),
    returnedItems: Number(row?.returned_items ?? 0),
    exchangedOrders: Number(row?.exchanged_orders ?? 0),
    exchangedItems: Number(row?.exchanged_items ?? 0),
  }
}

export async function getOrder(id: string): Promise<Order | null> {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase.from("orders").select("*").eq("id", id).maybeSingle()
  return data ? rowToOrder(data) : null
}

function nextOrderId(ids: string[]): string {
  const year = new Date().getFullYear()
  const nums = ids
    .map((id) => Number(id.split("-").pop()))
    .filter((n) => !Number.isNaN(n))
  const max = nums.length ? Math.max(...nums) : 1000
  return `AL-${year}-${max + 1}`
}

export async function createOrder(input: OrderInput): Promise<Order> {
  const supabase = createSupabaseAdminClient()
  const { data: existing, error: readErr } = await supabase.from("orders").select("id")
  if (readErr) throw readErr
  const now = new Date().toISOString()
  const row = {
    id: nextOrderId((existing ?? []).map((r) => r.id as string)),
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
  const { data, error } = await supabase.from("orders").insert(row).select("*").single()
  if (error) throw error
  return rowToOrder(data)
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

// Cancels an order and records the refund it implies. Refund rule: an order
// still 'pending' (not yet shipped) refunds its full downpayment; anything
// 'shipped' or later (shipped/delivered/returned/exchanged) has no refund —
// the downpayment covered courier/handling costs already incurred. Reads the
// order's CURRENT status fresh from the DB (never trusts a caller-supplied
// status) so the refund amount always reflects reality at the moment of
// cancellation. payment_status is intentionally left untouched — refund_status
// is the sole signal that a refund is owed; see enforce_payment_status_transition
// in the order_cancellation migration for why this doesn't need a payment_status
// transition at all.
export async function cancelOrder(id: string, reason: string): Promise<Order | null> {
  const supabase = createSupabaseAdminClient()

  const { data: current, error: readErr } = await supabase
    .from("orders")
    .select("status, downpayment_amount")
    .eq("id", id)
    .maybeSingle()
  if (readErr) throw readErr
  if (!current) return null

  const refundable = current.status === "pending"
  const refundAmount = refundable ? Number(current.downpayment_amount ?? 0) : 0
  const refundStatus = refundable ? "pending" : "none"

  const { data, error } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      refund_amount: refundAmount,
      refund_status: refundStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle()
  if (error) throw error
  return data ? rowToOrder(data) : null
}

// Short-TTL signed URL for a receipt stored in the PRIVATE payment-receipts
// bucket. Service-role only — never expose the bucket as public. `isPdf` lets
// the caller render an <img> or a download link.
export interface ReceiptSignedUrl {
  url: string
  isPdf: boolean
}

const RECEIPT_SIGNED_URL_TTL_SECONDS = 300

export async function getOrderReceiptSignedUrl(path: string): Promise<ReceiptSignedUrl | null> {
  if (!path) return null
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.storage
    .from("payment-receipts")
    .createSignedUrl(path, RECEIPT_SIGNED_URL_TTL_SECONDS)
  if (error || !data?.signedUrl) {
    // A null return here is indistinguishable from "no receipt" to the caller,
    // so this failure must be logged — without it, a real signing error (e.g.
    // an object that was deleted, or a storage outage) leaves no trace anywhere.
    console.error(`[getOrderReceiptSignedUrl] createSignedUrl failed for path "${path}":`, error?.message ?? "no signedUrl returned")
    return null
  }
  return { url: data.signedUrl, isPdf: path.toLowerCase().endsWith(".pdf") }
}
