import { notFound } from "next/navigation"
import { getContentPage } from "@/src/lib/data/content"
import { getProducts } from "@/src/lib/data/products"
import type { ContentSlug } from "@/src/lib/data/types"
import PageHeader from "@/src/components/ui/PageHeader"
import ContentPageEditor from "./ContentPageEditor"

// Content is edited from this same dashboard — always read fresh.
export const dynamic = "force-dynamic"

const VALID_SLUGS: ContentSlug[] = [
  "home", "shop", "shipping", "returns", "contact", "about", "faq", "terms",
  "privacy", "factory-location", "catalog", "custom-order", "footer", "payment-methods",
]

export default async function ContentSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (!VALID_SLUGS.includes(slug as ContentSlug)) notFound()

  const [page, products] = await Promise.all([
    getContentPage(slug as ContentSlug),
    getProducts(),
  ])
  if (!page) notFound()

  return (
    <div>
      <PageHeader title={page.title} description="Changes appear on the storefront immediately." />
      <ContentPageEditor page={page} products={products} />
    </div>
  )
}
