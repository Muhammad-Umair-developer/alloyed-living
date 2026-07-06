import { getProducts } from "@/src/lib/data/products"
import PageHeader from "@/src/components/ui/PageHeader"
import ProductsListView from "./ProductsListView"

// Mutated by the create/edit/delete/bulk actions — always read fresh.
export const dynamic = "force-dynamic"

export default async function ProductsPage() {
  const products = await getProducts()

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${products.length} product${products.length === 1 ? "" : "s"} in the catalog.`}
      />
      <ProductsListView products={products} />
    </div>
  )
}
