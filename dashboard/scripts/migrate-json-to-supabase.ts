/**
 * One-time migration: shared/data/*.json  →  Supabase Postgres
 * ===========================================================
 * Reads the existing JSON files and upserts their rows into the tables created
 * by supabase/migrations/20260706000000_data_tables.sql. Idempotent (upserts on
 * primary key), so it is safe to re-run.
 *
 * The original JSON files are only read here — they are NOT modified or deleted.
 *
 * ── Prerequisites ──
 *   1. Apply the schema first:  supabase db push   (or paste the SQL migration)
 *   2. dashboard/.env must contain:
 *        NEXT_PUBLIC_SUPABASE_URL
 *        SUPABASE_SERVICE_ROLE_KEY
 *
 * ── Run ──
 *   cd dashboard
 *   npx tsx scripts/migrate-json-to-supabase.ts
 */

import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"

const HERE = import.meta.dirname
const DATA_DIR = resolve(HERE, "..", "..", "shared", "data")
const ENV_FILE = resolve(HERE, "..", ".env")

// ── Minimal .env loader (so this runs without extra deps) ───────────────────
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...process.env } as Record<string, string>
  if (existsSync(ENV_FILE)) {
    for (const line of readFileSync(ENV_FILE, "utf-8").split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!(key in process.env)) env[key] = value
    }
  }
  return env
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(resolve(DATA_DIR, file), "utf-8")) as T
}

async function main() {
  const env = loadEnv()
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (checked dashboard/.env and process.env).",
    )
    process.exit(1)
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const step = async (label: string, fn: () => Promise<number>) => {
    process.stdout.write(`• ${label}… `)
    const n = await fn()
    console.log(`${n} rows`)
  }

  // ── products ──
  await step("products", async () => {
    const products = readJson<Record<string, unknown>[]>("products.json")
    const rows = products.map((p) => ({
      id: p.id,
      name: p.name,
      material: p.material ?? "",
      description: p.description ?? "",
      long_description: p.longDescription ?? null,
      price: p.price ?? 0,
      discount_price: p.discountPrice ?? null,
      category: p.category ?? "",
      tags: p.tags ?? [],
      sizes: p.sizes ?? [],
      stock: p.stock ?? 0,
      dimensions: p.dimensions ?? { h: 0, w: 0, d: 0 },
      accent: p.accent ?? "",
      image: p.image ?? "",
      gallery: p.gallery ?? [],
      gallery_labels: p.galleryLabels ?? null,
      colors: p.colors ?? null,
      features: p.features ?? null,
      seo_title: p.seoTitle ?? null,
      seo_description: p.seoDescription ?? null,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    }))
    const { error } = await supabase.from("products").upsert(rows, { onConflict: "id" })
    if (error) throw error
    return rows.length
  })

  // ── orders ──
  await step("orders", async () => {
    const orders = readJson<Record<string, unknown>[]>("orders.json")
    const rows = orders.map((o) => ({
      id: o.id,
      status: o.status ?? "pending",
      items: o.items ?? [],
      customer: o.customer ?? {},
      shipping_address: o.shippingAddress ?? {},
      subtotal: o.subtotal ?? 0,
      delivery: o.delivery ?? 0,
      total: o.total ?? 0,
      payment_status: o.paymentStatus ?? null,
      payment_provider: o.paymentProvider ?? null,
      payment_ref: o.paymentRef ?? null,
      created_at: o.createdAt,
      updated_at: o.updatedAt,
    }))
    const { error } = await supabase.from("orders").upsert(rows, { onConflict: "id" })
    if (error) throw error
    return rows.length
  })

  // ── reviews ──
  await step("reviews", async () => {
    const reviews = readJson<Record<string, unknown>[]>("reviews.json")
    const rows = reviews.map((r) => ({
      id: r.id,
      product_id: r.productId,
      author: r.author ?? "Anonymous",
      author_id: r.authorId ?? null,
      rating: r.rating,
      comment: r.comment ?? "",
      created_at: r.createdAt,
    }))
    const { error } = await supabase.from("reviews").upsert(rows, { onConflict: "id" })
    if (error) throw error
    return rows.length
  })

  // ── content_pages ──
  await step("content_pages", async () => {
    const store = readJson<Record<string, { slug: string; title: string; updatedAt: string; fields: unknown }>>(
      "content-pages.json",
    )
    const rows = Object.values(store).map((page) => ({
      slug: page.slug,
      title: page.title,
      fields: page.fields,
      updated_at: page.updatedAt,
    }))
    const { error } = await supabase.from("content_pages").upsert(rows, { onConflict: "slug" })
    if (error) throw error
    return rows.length
  })

  // ── settings (singleton) ──
  await step("settings", async () => {
    const s = readJson<Record<string, unknown>>("settings.json")
    const { error } = await supabase.from("settings").upsert(
      {
        id: 1,
        store_name: s.storeName ?? "",
        accent_color: s.accentColor ?? "",
        support_email: s.supportEmail ?? "",
        admins: s.admins ?? [],
        api_keys: s.apiKeys ?? [],
      },
      { onConflict: "id" },
    )
    if (error) throw error
    return 1
  })

  // ── analytics (counter tables) ──
  await step("product_analytics", async () => {
    const data = readJson<{ products: Record<string, unknown>[] }>("analytics.json")
    const rows = data.products.map((p) => ({
      product_id: p.productId,
      views: p.views ?? 0,
      add_to_cart: p.addToCart ?? 0,
      purchases: p.purchases ?? 0,
    }))
    const { error } = await supabase.from("product_analytics").upsert(rows, { onConflict: "product_id" })
    if (error) throw error
    return rows.length
  })

  await step("daily_stats", async () => {
    const data = readJson<{ daily: Record<string, unknown>[] }>("analytics.json")
    const rows = data.daily.map((d) => ({
      stat_date: d.date,
      views: d.views ?? 0,
      cart_adds: d.cartAdds ?? 0,
      sales: d.sales ?? 0,
      revenue: d.revenue ?? 0,
    }))
    const { error } = await supabase.from("daily_stats").upsert(rows, { onConflict: "stat_date" })
    if (error) throw error
    return rows.length
  })

  console.log("\n✓ Migration complete. The original JSON files were left untouched as backup.")
}

main().catch((err) => {
  console.error("\n✗ Migration failed:", err)
  process.exit(1)
})
