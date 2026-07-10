"use server"

import { revalidatePath } from "next/cache"
import { requireDashboardUser } from "@/src/lib/auth/require-admin"
import { revalidateStorefront } from "@/src/lib/revalidate-storefront"
import {
  createProduct,
  updateProduct,
  deleteProduct,
  bulkDeleteProducts,
  bulkUpdateCategory,
  bulkUpdateStock,
  renameCategory,
  deleteCategory,
} from "@/src/lib/data/products"
import type { Product, ProductInput } from "@/src/lib/data/types"

// Every action here writes through the service-role client, so each one starts
// with requireDashboardUser() — the proxy only gates page navigation, never
// these action POSTs.

// productId is included when a single product changed, so its own detail page
// can be revalidated too (bulk actions affect many products, so they skip it).
// Awaited by every caller below — on Vercel, an un-awaited fetch can be cut off
// once the action returns, so the storefront ping must finish before we do.
async function revalidateProductRoutes(productId?: string) {
  revalidatePath("/products")
  revalidatePath("/")
  revalidatePath("/analytics")

  const storefrontPaths = ["/", "/shop", "/catalog"]
  if (productId) storefrontPaths.push(`/shop/${productId}`)
  await revalidateStorefront(storefrontPaths)
}

export async function createProductAction(input: ProductInput): Promise<Product> {
  await requireDashboardUser()
  const product = await createProduct(input)
  await revalidateProductRoutes(product.id)
  return product
}

export async function updateProductAction(id: string, patch: Partial<ProductInput>): Promise<Product | null> {
  await requireDashboardUser()
  const product = await updateProduct(id, patch)
  await revalidateProductRoutes(id)
  return product
}

export async function deleteProductAction(id: string): Promise<void> {
  await requireDashboardUser()
  await deleteProduct(id)
  await revalidateProductRoutes(id)
}

export async function bulkDeleteProductsAction(ids: string[]): Promise<void> {
  await requireDashboardUser()
  await bulkDeleteProducts(ids)
  await revalidateProductRoutes()
}

export async function bulkUpdateCategoryAction(ids: string[], category: string): Promise<void> {
  await requireDashboardUser()
  await bulkUpdateCategory(ids, category)
  await revalidateProductRoutes()
}

export async function bulkUpdateStockAction(ids: string[], stock: number): Promise<void> {
  await requireDashboardUser()
  await bulkUpdateStock(ids, stock)
  await revalidateProductRoutes()
}

// Rename a category across the whole catalog (every product using `from`).
export async function renameCategoryAction(from: string, to: string): Promise<void> {
  await requireDashboardUser()
  await renameCategory(from, to)
  await revalidateProductRoutes()
}

// Delete a category — products that used it are left uncategorized.
export async function deleteCategoryAction(name: string): Promise<void> {
  await requireDashboardUser()
  await deleteCategory(name)
  await revalidateProductRoutes()
}
