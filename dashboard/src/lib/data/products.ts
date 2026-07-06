import "server-only"
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin"
import type { Product, ProductInput } from "./types"

// Products are read and written by the admin dashboard via the service-role
// client. Row columns are snake_case; these mappers preserve the exact Product
// shape callers already expect.

type ProductRow = Record<string, unknown>

function rowToProduct(r: ProductRow): Product {
  return {
    id: r.id as string,
    name: r.name as string,
    material: (r.material as string) ?? "",
    description: (r.description as string) ?? "",
    longDescription: (r.long_description as string | null) ?? undefined,
    price: Number(r.price),
    discountPrice: r.discount_price == null ? null : Number(r.discount_price),
    category: (r.category as string) ?? "",
    tags: (r.tags as string[]) ?? [],
    sizes: (r.sizes as string[]) ?? [],
    stock: Number(r.stock),
    dimensions: r.dimensions as Product["dimensions"],
    accent: (r.accent as string) ?? "",
    image: (r.image as string) ?? "",
    gallery: (r.gallery as string[]) ?? [],
    galleryLabels: (r.gallery_labels as string[] | null) ?? undefined,
    colors: (r.colors as Product["colors"]) ?? undefined,
    features: (r.features as string[] | null) ?? undefined,
    seoTitle: (r.seo_title as string | null) ?? undefined,
    seoDescription: (r.seo_description as string | null) ?? undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

// Maps a (partial) ProductInput to snake_case columns, omitting undefined keys.
function inputToRow(patch: Partial<ProductInput>): ProductRow {
  const row: ProductRow = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.material !== undefined) row.material = patch.material
  if (patch.description !== undefined) row.description = patch.description
  if (patch.longDescription !== undefined) row.long_description = patch.longDescription ?? null
  if (patch.price !== undefined) row.price = patch.price
  if (patch.discountPrice !== undefined) row.discount_price = patch.discountPrice ?? null
  if (patch.category !== undefined) row.category = patch.category
  if (patch.tags !== undefined) row.tags = patch.tags
  if (patch.sizes !== undefined) row.sizes = patch.sizes
  if (patch.stock !== undefined) row.stock = patch.stock
  if (patch.dimensions !== undefined) row.dimensions = patch.dimensions
  if (patch.accent !== undefined) row.accent = patch.accent
  if (patch.image !== undefined) row.image = patch.image
  if (patch.gallery !== undefined) row.gallery = patch.gallery
  if (patch.galleryLabels !== undefined) row.gallery_labels = patch.galleryLabels ?? null
  if (patch.colors !== undefined) row.colors = patch.colors ?? null
  if (patch.features !== undefined) row.features = patch.features ?? null
  if (patch.seoTitle !== undefined) row.seo_title = patch.seoTitle ?? null
  if (patch.seoDescription !== undefined) row.seo_description = patch.seoDescription ?? null
  return row
}

export async function getProducts(): Promise<Product[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: true })
  if (error) throw error
  return (data ?? []).map(rowToProduct)
}

export async function getProduct(id: string): Promise<Product | null> {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle()
  return data ? rowToProduct(data) : null
}

function nextId(ids: string[]): string {
  const nums = ids
    .map((id) => Number(id.replace(/[^0-9]/g, "")))
    .filter((n) => !Number.isNaN(n))
  const max = nums.length ? Math.max(...nums) : 0
  return `p${String(max + 1).padStart(2, "0")}`
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const supabase = createSupabaseAdminClient()
  const { data: existing, error: readErr } = await supabase.from("products").select("id")
  if (readErr) throw readErr
  const now = new Date().toISOString()
  const row = {
    ...inputToRow(input),
    id: nextId((existing ?? []).map((r) => r.id as string)),
    created_at: now,
    updated_at: now,
  }
  const { data, error } = await supabase.from("products").insert(row).select("*").single()
  if (error) throw error
  return rowToProduct(data)
}

export async function updateProduct(id: string, patch: Partial<ProductInput>): Promise<Product | null> {
  const supabase = createSupabaseAdminClient()
  const row = { ...inputToRow(patch), updated_at: new Date().toISOString() }
  const { data, error } = await supabase.from("products").update(row).eq("id", id).select("*").maybeSingle()
  if (error) throw error
  return data ? rowToProduct(data) : null
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from("products").delete().eq("id", id)
  if (error) throw error
}

export async function bulkDeleteProducts(ids: string[]): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from("products").delete().in("id", ids)
  if (error) throw error
}

export async function bulkUpdateCategory(ids: string[], category: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from("products")
    .update({ category, updated_at: new Date().toISOString() })
    .in("id", ids)
  if (error) throw error
}

export async function bulkUpdateStock(ids: string[], stock: number): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from("products")
    .update({ stock, updated_at: new Date().toISOString() })
    .in("id", ids)
  if (error) throw error
}
