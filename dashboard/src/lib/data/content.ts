import "server-only"
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin"
import type { ContentPage, ContentPageFields, ContentSlug, CustomOrderPageContent, FooterPageContent, PaymentMethodsPageContent } from "./types"

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

// The Custom Order page is seeded via migration, but ships with a built-in
// default so the editor and storefront still work before/without that row —
// the first save upserts it. Keep this in sync with the seed migration.
const CUSTOM_ORDER_DEFAULT_FIELDS: CustomOrderPageContent = {
  eyebrow: "Bespoke",
  heroTitle: "Made For You Alone",
  heroSubtitle:
    "You imagined something the world doesn't have yet — be proud of that. Share your idea and our craftsmen will forge it into a piece that is yours, and yours alone.",
  heroImage: "/img.png",
  galleryItems: [
    { imageUrl: "/2.jpg.jpeg", caption: "Bespoke Dimensions" },
    { imageUrl: "/6.jpg.jpeg", caption: "Custom Finishes" },
    { imageUrl: "/9.jpg.jpeg", caption: "Industrial Craftsmanship" },
  ],
  steps: [
    {
      title: "Share Your Vision",
      description: "Describe your idea, dimensions and finish — and upload any sketches or reference images that inspire you.",
    },
    {
      title: "Design & Refine",
      description: "Our team turns your concept into a precise blueprint and digital model, sent back for your approval.",
    },
    {
      title: "Forged in Steel",
      description: "Skilled artisans craft your piece from high-grade raw metal, entirely by hand in our Lahore workshop.",
    },
    {
      title: "Delivered to You",
      description: "Your one-of-a-kind piece is carefully packed and shipped directly to your space.",
    },
  ],
  formHeading: "Start Your Commission",
  formSubheading: "Tell us what you have in mind",
}

// The Footer isn't a standalone route — it renders on every storefront page via
// the root layout. Like Custom Order, it ships with a built-in default so the
// editor and storefront work before/without a seeded row; the first save
// upserts it. Keep in sync with the seed migration and the storefront fallback.
const FOOTER_DEFAULT_FIELDS: FooterPageContent = {
  tagline: "Where bold design meets fine craftsmanship.",
  phone: "+92 51 123 4567",
  email: "hello@alloyedliving.com",
  hours: "Mon – Sat, 10 am – 7 pm PKT",
  instagramUrl: "https://www.instagram.com/alloyedliving?igsh=MXBhbGdwZWV6ZnE5NQ==",
  facebookUrl: "https://www.facebook.com/share/1BdEw54ASu/",
  copyright: "© 2026 Alloyed Living. All rights reserved.",
}

// Also seeded via migration (empty placeholders), but ships with this
// built-in default so the editor works even before/without that row.
const PAYMENT_METHODS_DEFAULT_FIELDS: PaymentMethodsPageContent = {
  ubl: { accountTitle: "", bankName: "", accountNumber: "", iban: "" },
  jazzcash: { accountTitle: "", number: "" },
}

// A built-in default for content pages that may not have a DB row yet. The
// Custom Order, Footer, and Payment Methods pages have one; every other slug
// returns null.
function contentDefault(slug: ContentSlug): ContentPage | null {
  if (slug === "custom-order") {
    return {
      slug: "custom-order",
      title: "Custom Order",
      updatedAt: new Date(0).toISOString(),
      fields: CUSTOM_ORDER_DEFAULT_FIELDS,
    }
  }
  if (slug === "footer") {
    return {
      slug: "footer",
      title: "Footer",
      updatedAt: new Date(0).toISOString(),
      fields: FOOTER_DEFAULT_FIELDS,
    }
  }
  if (slug === "payment-methods") {
    return {
      slug: "payment-methods",
      title: "Payment Methods",
      updatedAt: new Date(0).toISOString(),
      fields: PAYMENT_METHODS_DEFAULT_FIELDS,
    }
  }
  return null
}

// Slugs the dashboard actually knows how to list/edit (mirrors the editor's
// PAGE_META and VALID_SLUGS). content_pages can contain OTHER rows too — e.g.
// payment-methods, which storefront checkout reads directly and isn't (yet) a
// registered dashboard content page — those must never reach the editor list,
// or an unguarded PAGE_META[slug] lookup there throws.
const KNOWN_CONTENT_SLUGS: readonly ContentSlug[] = [
  "home", "shop", "shipping", "returns", "contact", "about", "faq", "terms",
  "privacy", "factory-location", "catalog", "custom-order", "footer", "payment-methods",
]

export async function getAllContentPages(): Promise<ContentStore> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from("content_pages").select("*")
  if (error) throw error
  const store = {} as ContentStore
  for (const row of (data ?? []) as ContentRow[]) {
    if (!KNOWN_CONTENT_SLUGS.includes(row.slug as ContentSlug)) continue
    store[row.slug as ContentSlug] = rowToPage(row)
  }
  // Surface pages that have a built-in default but no row yet (Custom Order,
  // Footer, Payment Methods), so they still appear in the editor list.
  for (const slug of ["custom-order", "footer", "payment-methods"] as const) {
    if (!store[slug]) {
      const def = contentDefault(slug)
      if (def) store[slug] = def
    }
  }
  return store
}

export async function getContentPage<T extends ContentPageFields = ContentPageFields>(
  slug: ContentSlug,
): Promise<ContentPage<T> | null> {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase.from("content_pages").select("*").eq("slug", slug).maybeSingle()
  if (data) return rowToPage(data as ContentRow) as ContentPage<T>
  // Fall back to a built-in default when the row hasn't been seeded yet
  // (null for every slug except Custom Order — unchanged behaviour otherwise).
  return contentDefault(slug) as ContentPage<T> | null
}


export async function updateContentPage(
  slug: ContentSlug,
  fields: Partial<ContentPageFields>,
): Promise<ContentPage> {
  const supabase = createSupabaseAdminClient()
  const { data: existingRow } = await supabase
    .from("content_pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle()

  // Existing row wins; otherwise fall back to a built-in default so a not-yet-
  // seeded page (Custom Order) is created on its first save.
  const existing = existingRow ? rowToPage(existingRow as ContentRow) : contentDefault(slug)
  if (!existing) throw new Error(`Unknown content page: ${slug}`)

  const updatedAt = new Date().toISOString()
  const mergedFields = { ...existing.fields, ...fields }
  const { data, error } = await supabase
    .from("content_pages")
    .upsert(
      { slug, title: existing.title, fields: mergedFields, updated_at: updatedAt },
      { onConflict: "slug" },
    )
    .select("*")
    .single()
  if (error) throw error
  return rowToPage(data as ContentRow)
}
