import "server-only"
import { createSupabasePublicClient } from "@/src/lib/supabase/public"
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin"
import type { ContentPage, ContentPageFields, ContentSlug } from "./types"

type ContentStore = Record<ContentSlug, ContentPage>
type ContentRow = { slug: string; title: string; fields: ContentPageFields; updated_at: string }

function rowToPage(r: ContentRow): ContentPage {
  return {
    slug: r.slug as ContentSlug,
    title: r.title,
    updatedAt: r.updated_at,
    fields: r.fields,
  }
}

export async function getAllContentPages(): Promise<ContentStore> {
  const supabase = createSupabasePublicClient()
  const { data, error } = await supabase.from("content_pages").select("*")
  if (error) throw error
  const store = {} as ContentStore
  for (const row of (data ?? []) as ContentRow[]) {
    store[row.slug as ContentSlug] = rowToPage(row)
  }
  return store
}

export async function getContentPage<T extends ContentPageFields = ContentPageFields>(
  slug: ContentSlug,
): Promise<ContentPage<T> | null> {
  const supabase = createSupabasePublicClient()
  const { data } = await supabase.from("content_pages").select("*").eq("slug", slug).maybeSingle()
  return data ? (rowToPage(data as ContentRow) as ContentPage<T>) : null
}

export async function updateContentPage(
  slug: ContentSlug,
  fields: Partial<ContentPageFields>,
): Promise<ContentPage> {
  const supabase = createSupabaseAdminClient()
  const { data: existingRow, error: readErr } = await supabase
    .from("content_pages")
    .select("*")
    .eq("slug", slug)
    .single()
  if (readErr) throw readErr
  const existing = rowToPage(existingRow as ContentRow)
  const mergedFields = { ...existing.fields, ...fields }
  const { data, error } = await supabase
    .from("content_pages")
    .update({ fields: mergedFields, updated_at: new Date().toISOString() })
    .eq("slug", slug)
    .select("*")
    .single()
  if (error) throw error
  return rowToPage(data as ContentRow)
}
