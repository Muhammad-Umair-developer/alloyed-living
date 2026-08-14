import PageHeader from "@/src/components/ui/PageHeader"
import PromoCodeForm from "../PromoCodeForm"

export default function NewPromoCodePage() {
  return (
    <div>
      <PageHeader title="Add Promo Code" description="Create a new discount code." />
      <PromoCodeForm />
    </div>
  )
}
