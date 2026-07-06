import { notFound } from "next/navigation"
import { getProduct } from "@/src/lib/data/products"
import { getReviewsByProduct } from "@/src/lib/data/reviews"
import ProductDetailView from "./ProductDetailView"

// ISR — dashboard edits and new reviews appear within a minute (reviews also
// revalidate on demand via submitReviewAction). View tracking happens from the
// client (trackViewAction) so a cached render still counts a view — doing it
// here would only count cache misses.
export const revalidate = 60

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [product, reviews] = await Promise.all([getProduct(id), getReviewsByProduct(id)])
  if (!product) notFound()
  return <ProductDetailView product={product} reviews={reviews} />
}
