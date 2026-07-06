// Generates a seed SQL file from the shared/data/*.json source-of-truth, matching
// the schema in migrations/20260706000000_data_tables.sql. Idempotent inserts
// (on conflict do nothing). Regenerate with:  node supabase/generate-seed.mjs
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const here = dirname(fileURLToPath(import.meta.url))
const DATA = join(here, "..", "shared", "data")
const read = (f) => JSON.parse(readFileSync(join(DATA, f), "utf-8"))

const products = read("products.json")
const reviews = read("reviews.json")
const orders = read("orders.json")
const content = read("content-pages.json")
const analytics = read("analytics.json")
let settings = null
try { settings = read("settings.json") } catch { /* optional */ }

const str = (v) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`)
const num = (v) => (v == null ? "NULL" : String(v))
const json = (v) => (v == null ? "NULL" : `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`)

function insert(table, columns, rows) {
  if (!rows.length) return `-- (no rows for ${table})\n`
  const cols = columns.map((c) => c.name).join(", ")
  const values = rows.map((r) => "  (" + columns.map((c) => c.val(r)).join(", ") + ")").join(",\n")
  return `insert into public.${table} (${cols}) values\n${values}\non conflict (${columns[0].name}) do nothing;\n`
}

const parts = []

parts.push(insert("products", [
  { name: "id", val: (r) => str(r.id) },
  { name: "name", val: (r) => str(r.name) },
  { name: "material", val: (r) => str(r.material ?? "") },
  { name: "description", val: (r) => str(r.description ?? "") },
  { name: "long_description", val: (r) => str(r.longDescription ?? null) },
  { name: "price", val: (r) => num(r.price) },
  { name: "discount_price", val: (r) => num(r.discountPrice) },
  { name: "category", val: (r) => str(r.category ?? "") },
  { name: "tags", val: (r) => json(r.tags ?? []) },
  { name: "sizes", val: (r) => json(r.sizes ?? []) },
  { name: "stock", val: (r) => num(r.stock ?? 0) },
  { name: "dimensions", val: (r) => json(r.dimensions ?? { h: 0, w: 0, d: 0 }) },
  { name: "accent", val: (r) => str(r.accent ?? "") },
  { name: "image", val: (r) => str(r.image ?? "") },
  { name: "gallery", val: (r) => json(r.gallery ?? []) },
  { name: "gallery_labels", val: (r) => json(r.galleryLabels ?? null) },
  { name: "colors", val: (r) => json(r.colors ?? null) },
  { name: "features", val: (r) => json(r.features ?? null) },
  { name: "seo_title", val: (r) => str(r.seoTitle ?? null) },
  { name: "seo_description", val: (r) => str(r.seoDescription ?? null) },
  { name: "created_at", val: (r) => str(r.createdAt ?? new Date().toISOString()) },
  { name: "updated_at", val: (r) => str(r.updatedAt ?? new Date().toISOString()) },
], products))

parts.push(insert("content_pages", [
  { name: "slug", val: (r) => str(r.slug) },
  { name: "title", val: (r) => str(r.title) },
  { name: "fields", val: (r) => json(r.fields ?? {}) },
  { name: "updated_at", val: (r) => str(r.updatedAt) },
], Object.values(content)))

parts.push(insert("reviews", [
  { name: "id", val: (r) => str(r.id) },
  { name: "product_id", val: (r) => str(r.productId) },
  { name: "author", val: (r) => str(r.author ?? "Anonymous") },
  { name: "author_id", val: (r) => str(r.authorId ?? null) },
  { name: "rating", val: (r) => num(r.rating) },
  { name: "comment", val: (r) => str(r.comment ?? "") },
  { name: "created_at", val: (r) => str(r.createdAt) },
], reviews))

parts.push(insert("orders", [
  { name: "id", val: (r) => str(r.id) },
  { name: "status", val: (r) => str(r.status ?? "pending") },
  { name: "items", val: (r) => json(r.items ?? []) },
  { name: "customer", val: (r) => json(r.customer ?? {}) },
  { name: "shipping_address", val: (r) => json(r.shippingAddress ?? {}) },
  { name: "subtotal", val: (r) => num(r.subtotal ?? 0) },
  { name: "delivery", val: (r) => num(r.delivery ?? 0) },
  { name: "total", val: (r) => num(r.total ?? 0) },
  { name: "payment_status", val: (r) => str(r.paymentStatus ?? null) },
  { name: "payment_provider", val: (r) => str(r.paymentProvider ?? null) },
  { name: "payment_ref", val: (r) => str(r.paymentRef ?? null) },
  { name: "created_at", val: (r) => str(r.createdAt) },
  { name: "updated_at", val: (r) => str(r.updatedAt) },
], orders))

parts.push(insert("product_analytics", [
  { name: "product_id", val: (r) => str(r.productId) },
  { name: "views", val: (r) => num(r.views ?? 0) },
  { name: "add_to_cart", val: (r) => num(r.addToCart ?? 0) },
  { name: "purchases", val: (r) => num(r.purchases ?? 0) },
], analytics.products ?? []))

parts.push(insert("daily_stats", [
  { name: "stat_date", val: (r) => str(r.date) },
  { name: "views", val: (r) => num(r.views ?? 0) },
  { name: "cart_adds", val: (r) => num(r.cartAdds ?? 0) },
  { name: "sales", val: (r) => num(r.sales ?? 0) },
  { name: "revenue", val: (r) => num(r.revenue ?? 0) },
], analytics.daily ?? []))

if (settings) {
  parts.push(insert("settings", [
    { name: "id", val: () => "1" },
    { name: "store_name", val: (r) => str(r.storeName ?? "") },
    { name: "accent_color", val: (r) => str(r.accentColor ?? "") },
    { name: "support_email", val: (r) => str(r.supportEmail ?? "") },
    { name: "admins", val: (r) => json(r.admins ?? []) },
    { name: "api_keys", val: (r) => json(r.apiKeys ?? []) },
  ], [settings]))
}

const out = `-- Seed data generated from shared/data/*.json by supabase/generate-seed.mjs
-- Idempotent (on conflict do nothing). Apply after the schema migrations.
begin;
${parts.join("\n")}commit;
`
writeFileSync(join(here, "seed.sql"), out, "utf-8")
console.log(
  `seed.sql written: ${products.length} products, ${Object.keys(content).length} content pages, ` +
    `${reviews.length} reviews, ${orders.length} orders, ${(analytics.products ?? []).length} analytics, ` +
    `${(analytics.daily ?? []).length} daily stats${settings ? ", 1 settings row" : ""}.`,
)
