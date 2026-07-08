import { getContentPage } from "@/src/lib/data/content"
import type { FactoryLocationPageContent } from "@/src/lib/data/types"
import FactoryLocationPageView from "./FactoryLocationPageView"

// ISR — content changes rarely; see app/page.tsx for the rationale.
export const revalidate = 300

export default async function FactoryLocationPage() {
  const page = await getContentPage<FactoryLocationPageContent>("factory-location")
  return <FactoryLocationPageView content={page!.fields} />
}
