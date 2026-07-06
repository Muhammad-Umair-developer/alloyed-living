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
    paymentProvider: (r.payment_provider as string | null) ?? undefined,
    paymentRef: (r.payment_ref as string | null) ?? undefined,
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
