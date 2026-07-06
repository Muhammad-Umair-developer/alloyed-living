import "server-only"
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin"
import type { AnalyticsData, DailyStat, ProductAnalytics } from "./types"

// Analytics is written only by trusted server tracking calls (service-role) via
// atomic increment RPCs, and read for aggregate stats.

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

type ProductAnalyticsRow = { product_id: string; views: number; add_to_cart: number; purchases: number }
type DailyStatRow = { stat_date: string; views: number; cart_adds: number; sales: number; revenue: number }

function rowToProductAnalytics(r: ProductAnalyticsRow): ProductAnalytics {
  return { productId: r.product_id, views: r.views, addToCart: r.add_to_cart, purchases: r.purchases }
}

function rowToDailyStat(r: DailyStatRow): DailyStat {
  return { date: r.stat_date, views: r.views, cartAdds: r.cart_adds, sales: r.sales, revenue: Number(r.revenue) }
}

export async function getAnalytics(): Promise<AnalyticsData> {
  const supabase = createSupabaseAdminClient()
  const [{ data: products }, { data: daily }] = await Promise.all([
    supabase.from("product_analytics").select("*"),
    supabase.from("daily_stats").select("*"),
  ])
  return {
    products: ((products ?? []) as ProductAnalyticsRow[]).map(rowToProductAnalytics),
    daily: ((daily ?? []) as DailyStatRow[]).map(rowToDailyStat),
  }
}

export async function getProductAnalytics(): Promise<ProductAnalytics[]> {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase.from("product_analytics").select("*")
  return ((data ?? []) as ProductAnalyticsRow[]).map(rowToProductAnalytics)
}

export async function getDailyTrend(days = 30): Promise<DailyStat[]> {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase.from("daily_stats").select("*").order("stat_date", { ascending: true })
  return ((data ?? []) as DailyStatRow[]).map(rowToDailyStat).slice(-days)
}

export async function trackView(productId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.rpc("track_view", { p_product_id: productId })
  if (error) throw error
}

export async function trackAddToCart(productId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.rpc("track_add_to_cart", { p_product_id: productId })
  if (error) throw error
}

export async function trackPurchase(productId: string, quantity: number, revenue: number): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.rpc("track_purchase", {
    p_product_id: productId,
    p_quantity: quantity,
    p_revenue: revenue,
  })
  if (error) throw error
}

export interface OverviewStats {
  totalProducts: number
  viewsToday: number
  cartAddsToday: number
  salesToday: number
  revenueToday: number
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const supabase = createSupabaseAdminClient()
  const [{ count }, { data: today }] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("daily_stats").select("*").eq("stat_date", todayKey()).maybeSingle(),
  ])
  const row = today as DailyStatRow | null
  return {
    totalProducts: count ?? 0,
    viewsToday: row?.views ?? 0,
    cartAddsToday: row?.cart_adds ?? 0,
    salesToday: row?.sales ?? 0,
    revenueToday: row ? Number(row.revenue) : 0,
  }
}
