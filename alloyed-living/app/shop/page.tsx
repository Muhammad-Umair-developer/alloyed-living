import { getProducts } from "@/src/lib/data/products"
import { getContentPage } from "@/src/lib/data/content"
import type { ShopPageContent } from "@/src/lib/data/types"
import ShopPageView from "./ShopPageView"

// ISR — see app/page.tsx for the rationale.
export const revalidate = 60

export default async function ShopPage() {
  const [products, page] = await Promise.all([
    getProducts(),
    getContentPage<ShopPageContent>("shop"),
  ])
  return <ShopPageView products={products} content={page!.fields} />
}
