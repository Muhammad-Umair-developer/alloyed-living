import PageHeader from "@/src/components/ui/PageHeader"
import ProductForm from "../ProductForm"

export default function NewProductPage() {
  return (
    <div>
      <PageHeader title="Add Product" description="Create a new product in the catalog." />
      <ProductForm />
    </div>
  )
}
