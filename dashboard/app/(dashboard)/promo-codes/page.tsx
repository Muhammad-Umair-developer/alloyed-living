import { getPromoCodes } from "@/src/lib/data/promo-codes"
import PageHeader from "@/src/components/ui/PageHeader"
import PromoCodesListView from "./PromoCodesListView"

// Mutated by create/edit/toggle-active — always read fresh.
export const dynamic = "force-dynamic"

export default async function PromoCodesPage() {
  const promoCodes = await getPromoCodes()

  return (
    <div>
      <PageHeader
        title="Promo Codes"
        description={`${promoCodes.length} code${promoCodes.length === 1 ? "" : "s"}.`}
      />
      <PromoCodesListView promoCodes={promoCodes} />
    </div>
  )
}
