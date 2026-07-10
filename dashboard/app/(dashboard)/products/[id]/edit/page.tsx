import { notFound } from "next/navigation"
import { getProduct, getProducts } from "@/src/lib/data/products"
import PageHeader from "@/src/components/ui/PageHeader"
import ProductForm from "../../ProductForm"

// Products are mutable via this same dashboard — always read fresh.
export const dynamic = "force-dynamic"

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [product, products] = await Promise.all([getProduct(id), getProducts()])
  if (!product) notFound()

  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort()

  return (
    <div>
      <PageHeader title="Edit Product" description={product.name} />
      <ProductForm product={product} categories={categories} />
    </div>
  )
}
