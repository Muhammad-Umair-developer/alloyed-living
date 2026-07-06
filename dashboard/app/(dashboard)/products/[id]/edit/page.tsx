import { notFound } from "next/navigation"
import { getProduct } from "@/src/lib/data/products"
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
  const product = await getProduct(id)
  if (!product) notFound()

  return (
    <div>
      <PageHeader title="Edit Product" description={product.name} />
      <ProductForm product={product} />
    </div>
  )
}
