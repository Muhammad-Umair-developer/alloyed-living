"use server"

import { revalidatePath } from "next/cache"
import { requireDashboardUser } from "@/src/lib/auth/require-admin"
import {
  createProduct,
  updateProduct,
  deleteProduct,
  bulkDeleteProducts,
  bulkUpdateCategory,
  bulkUpdateStock,
} from "@/src/lib/data/products"
import type { Product, ProductInput } from "@/src/lib/data/types"

// Every action here writes through the service-role client, so each one starts
// with requireDashboardUser() — the proxy only gates page navigation, never
// these action POSTs.

function revalidateProductRoutes() {
  revalidatePath("/products")
  revalidatePath("/")
  revalidatePath("/analytics")
}

export async function createProductAction(input: ProductInput): Promise<Product> {
  await requireDashboardUser()
  const product = await createProduct(input)
  revalidateProductRoutes()
  return product
}

export async function updateProductAction(id: string, patch: Partial<ProductInput>): Promise<Product | null> {
  await requireDashboardUser()
  const product = await updateProduct(id, patch)
  revalidateProductRoutes()
  return product
}

export async function deleteProductAction(id: string): Promise<void> {
  await requireDashboardUser()
  await deleteProduct(id)
  revalidateProductRoutes()
}

export async function bulkDeleteProductsAction(ids: string[]): Promise<void> {
  await requireDashboardUser()
  await bulkDeleteProducts(ids)
  revalidateProductRoutes()
}

export async function bulkUpdateCategoryAction(ids: string[], category: string): Promise<void> {
  await requireDashboardUser()
  await bulkUpdateCategory(ids, category)
  revalidateProductRoutes()
}

export async function bulkUpdateStockAction(ids: string[], stock: number): Promise<void> {
  await requireDashboardUser()
  await bulkUpdateStock(ids, stock)
  revalidateProductRoutes()
}
