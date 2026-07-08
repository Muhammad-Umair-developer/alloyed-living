import { getProducts } from "@/src/lib/data/products"
import { getContentPage } from "@/src/lib/data/content"
import type { CatalogPageContent } from "@/src/lib/data/types"
import CatalogPageView from "./CatalogPageView"

// ISR — see app/page.tsx for the rationale.
export const revalidate = 60

export default async function CatalogPage() {
  const [products, page] = await Promise.all([
    getProducts(),
    getContentPage<CatalogPageContent>("catalog"),
  ])
  return <CatalogPageView products={products} content={page!.fields} />
}
