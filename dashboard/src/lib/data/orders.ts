import "server-only"
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin"
import type { Order, OrderInput, OrderStatus } from "./types"

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
