import { notFound } from "next/navigation"
import { getPromoCode } from "@/src/lib/data/promo-codes"
import PageHeader from "@/src/components/ui/PageHeader"
import PromoCodeForm from "../../PromoCodeForm"

// Mutable via this same dashboard (edit, toggle active) — always read fresh.
export const dynamic = "force-dynamic"

export default async function EditPromoCodePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const promoCode = await getPromoCode(id)
  if (!promoCode) notFound()

  return (
    <div>
      <PageHeader title="Edit Promo Code" description={promoCode.code} />
      <PromoCodeForm promoCode={promoCode} />
    </div>
  )
}
