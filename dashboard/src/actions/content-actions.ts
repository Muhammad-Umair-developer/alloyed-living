"use server"

import { revalidatePath } from "next/cache"
import { requireDashboardUser } from "@/src/lib/auth/require-admin"
import { updateContentPage } from "@/src/lib/data/content"
import type { ContentPageFields, ContentSlug } from "@/src/lib/data/types"

export async function updateContentPageAction(
  slug: ContentSlug,
  fields: ContentPageFields,
): Promise<void> {
  await requireDashboardUser()
  await updateContentPage(slug, fields)
  revalidatePath("/content")
  revalidatePath(`/content/${slug}`)
}
