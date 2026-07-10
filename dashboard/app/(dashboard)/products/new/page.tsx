import { getProducts } from "@/src/lib/data/products"
import PageHeader from "@/src/components/ui/PageHeader"
import ProductForm from "../ProductForm"

// Categories are derived from existing products, so read them fresh.
export const dynamic = "force-dynamic"

export default async function NewProductPage() {
  const products = await getProducts()
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort()

  return (
    <div>
      <PageHeader title="Add Product" description="Create a new product in the catalog." />
      <ProductForm categories={categories} />
    </div>
  )
}
