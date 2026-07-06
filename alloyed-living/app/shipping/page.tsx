import { getContentPage } from "@/src/lib/data/content"
import type { ShippingPageContent } from "@/src/lib/data/types"
import ShippingPageView from "./ShippingPageView"

// ISR — content changes rarely; see app/page.tsx for the rationale.
export const revalidate = 300

export default async function ShippingPage() {
  const page = await getContentPage<ShippingPageContent>("shipping")
  return <ShippingPageView content={page!.fields} />
}
