"use server"

import { revalidatePath } from "next/cache"
import { requireDashboardUser } from "@/src/lib/auth/require-admin"
import { revalidateStorefront } from "@/src/lib/revalidate-storefront"
import { updateContentPage } from "@/src/lib/data/content"
import type { ContentPageFields, ContentSlug } from "@/src/lib/data/types"

// Maps a content slug to the storefront route(s) it renders on — "home" is
// the only slug that isn't just "/<slug>". "footer" is special: it renders on
// every page via the root layout, so it revalidates the layout instead (see
// the `type: "layout"` branch below).
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
  "custom-order": ["/custom-order"],
  footer: ["/"],
  // Not a standalone route — read directly by the checkout flow (and the
  // confirmation page, and payment emails). /checkout is the one static
  // storefront path that renders it, so that's what gets revalidated.
  "payment-methods": ["/checkout"],
}

export async function updateContentPageAction(
  slug: ContentSlug,
  fields: ContentPageFields,
): Promise<void> {
  await requireDashboardUser()
  await updateContentPage(slug, fields)
  revalidatePath("/content")
  revalidatePath(`/content/${slug}`)
  // The footer lives in the root layout, so revalidate the whole layout tree
  // on the storefront rather than a single page path.
  await revalidateStorefront(STOREFRONT_PATHS_BY_SLUG[slug] ?? [], slug === "footer" ? "layout" : "page")
}
