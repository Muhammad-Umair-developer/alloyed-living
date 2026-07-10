import type { Metadata } from "next"
import { getContentPage } from "@/src/lib/data/content"
import { getProducts } from "@/src/lib/data/products"
import type { CustomOrderPageContent } from "@/src/lib/data/types"
import CustomOrderPageView, { CUSTOM_ORDER_DEFAULT } from "./CustomOrderPageView"

// ISR — content changes rarely; see app/page.tsx for the rationale.
export const revalidate = 300

export const metadata: Metadata = {
  title: "Custom Order — Alloyed Living",
  description:
    "Commission a bespoke piece or tailor an existing design. Share your vision and our craftsmen will bring it to life.",
}

export default async function CustomOrderPage() {
  // Editable from the dashboard content editor; falls back to a built-in default
  // when the row hasn't been seeded yet. Products feed the "modify an existing
  // product" picker.
  const [page, products] = await Promise.all([
    getContentPage<CustomOrderPageContent>("custom-order"),
    getProducts(),
  ])
  const productOptions = products.map((p) => ({ id: p.id, name: p.name, image: p.image }))
  return <CustomOrderPageView content={page?.fields ?? CUSTOM_ORDER_DEFAULT} products={productOptions} />
}
