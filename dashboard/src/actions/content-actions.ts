"use server"

import { revalidatePath } from "next/cache"
import { requireDashboardUser } from "@/src/lib/auth/require-admin"
import { revalidateStorefront } from "@/src/lib/revalidate-storefront"
import { updateContentPage } from "@/src/lib/data/content"
import type { ContentPageFields, ContentSlug } from "@/src/lib/data/types"

// Maps a content slug to the storefront route(s) it renders on — "home" is
// the only slug that isn't just "/<slug>".
const STOREFRONT_PATHS_BY_SLUG: Record<ContentSlug, string[]> = {
  home: ["/"],
  shop: ["/shop"],
  shipping: ["/shipping"],
  returns: ["/returns"],
  contact: ["/contact"],
  about: ["/about"],
  faq: ["/faq"],
  terms: ["/terms"],
  "factory-location": ["/factory-location"],
  catalog: ["/catalog"],
}

export async function updateContentPageAction(
  slug: ContentSlug,
  fields: ContentPageFields,
): Promise<void> {
  await requireDashboardUser()
  await updateContentPage(slug, fields)
  revalidatePath("/content")
  revalidatePath(`/content/${slug}`)
  await revalidateStorefront(STOREFRONT_PATHS_BY_SLUG[slug] ?? [])
}
