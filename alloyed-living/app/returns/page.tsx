import { getContentPage } from "@/src/lib/data/content"
import type { ReturnsPageContent } from "@/src/lib/data/types"
import ReturnsPageView from "./ReturnsPageView"

// ISR — content changes rarely; see app/page.tsx for the rationale.
export const revalidate = 300

export default async function ReturnsPage() {
  const page = await getContentPage<ReturnsPageContent>("returns")
  return <ReturnsPageView content={page!.fields} />
}
