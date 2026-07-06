import { getContentPage } from "@/src/lib/data/content"
import type { ContactPageContent } from "@/src/lib/data/types"
import ContactPageView from "./ContactPageView"

// ISR — content changes rarely; see app/page.tsx for the rationale.
export const revalidate = 300

export default async function ContactPage() {
  const page = await getContentPage<ContactPageContent>("contact")
  return <ContactPageView content={page!.fields} />
}
