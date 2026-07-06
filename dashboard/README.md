# Alloyed Living — Admin Dashboard

An internal admin dashboard for the `alloyed-living` storefront. Built with the same stack as
the storefront (Next.js 16 App Router, React 19, Tailwind CSS v4, Framer Motion, lucide-react)
so both apps stay consistent and easy to maintain together.

## Folder structure

```
E-Commerce UI/
├── alloyed-living/          the storefront (unchanged structure, extended to read shared data)
├── dashboard/                this app
└── shared/
    └── data/                 the JSON files both apps read and write — the actual "database"
        ├── products.json
        ├── content-pages.json
        ├── orders.json
        ├── analytics.json
        └── settings.json
```

`dashboard` and `alloyed-living` are independent Next.js apps (separate `package.json`,
separate dev servers) that both point at `../shared/data/*.json` as their data source.

## Why the data layer is duplicated, not imported

The original plan was a single `shared/lib` package imported by both apps via a `@shared/*`
path alias. In practice, Next 16's Turbopack does not resolve module imports that live outside
an app's own project root on this setup (confirmed with a minimal reproduction — even a
one-line file one directory up fails to resolve, regardless of the `experimental.externalDir`
flag). Rather than fight the bundler, each app has its own copy of the same thin accessor layer:

```
<app>/src/lib/data/
├── types.ts       — Product, Order, ContentPage, Settings, etc.
├── db.ts          — readJson/writeJson against ../../shared/data/*.json
├── products.ts     — getProducts, getProduct, createProduct, updateProduct, deleteProduct,
│                     bulkDeleteProducts, bulkUpdateCategory, bulkUpdateStock
├── content.ts      — getContentPage, getAllContentPages, updateContentPage
├── orders.ts       — getOrders, getOrder, createOrder, updateOrderStatus
├── analytics.ts    — trackView, trackAddToCart, trackPurchase, getProductAnalytics,
│                     getDailyTrend, getOverviewStats
└── settings.ts     — getSettings, updateSettings   (dashboard only)
```

Both copies point at the exact same JSON files (`path.join(process.cwd(), "..", "shared", "data", ...)`),
so a change made in one app is visible to the other on the next request — this is a runtime
file path, not a build-time import, so it isn't affected by the bundler limitation above. If
you ever get Turbopack (or a webpack build) resolving cross-app imports cleanly, these two
folders can be collapsed back into one `shared/lib` and imported normally.

**When editing shared logic, update both copies:**
`alloyed-living/src/lib/data/*` and `dashboard/src/lib/data/*`.

## How pages stay fresh

Every page that reads from `shared/data` exports `export const dynamic = "force-dynamic"`,
so it re-reads the JSON on every request instead of being statically cached. This is what
makes "edit a product in the dashboard, refresh the storefront" work without a rebuild.

## Where the backend hooks go

Every mutating function in `src/lib/data/*.ts` and every `"use server"` action in
`src/actions/*.ts` has a `// TODO: connect to backend` comment directly above the file-write
call. When a real backend exists, replace the body of each function with the equivalent API
call — the function signatures (and therefore every call site: forms, list pages, the
storefront's cart/checkout flow) do not need to change.

Auth is intentionally not implemented. `app/settings/page.tsx` has a placeholder
"Authentication — Coming Soon" section with a `// TODO: connect to backend` marker at the
exact point where a real auth check (e.g. middleware) should be added before this dashboard
is exposed anywhere but localhost.

## Pages

- **Overview** (`/`) — summary cards (products, views/cart-adds/sales/revenue today) and a
  7d/30d trend chart (views, sales, or revenue).
- **Products** (`/products`, `/products/new`, `/products/[id]/edit`) — search, filter by
  category, sort, bulk delete/category-change/stock-update, full create/edit form (pricing,
  discount price, tags, sizes, dimensions, multiple gallery images, SEO title/description),
  delete confirmation modal.
- **Orders** (`/orders`, `/orders/[id]`) — filter by status, inline status update, detail view
  with items, customer, and shipping address.
- **Content Pages** (`/content`, `/content/[slug]`) — editors for Home, Shop, Shipping, Returns,
  Contact, About, FAQ, and Terms. All are wired into the live storefront pages except
  About/FAQ/Terms, which are ready for when those storefront pages are built.
  - **Home** — hero media (video, image, or none, each with its own URL field and a remove
    button), hero copy, the story section, the shop-the-room banner, and the featured-products
    picker (add/remove/reorder which products appear on the home page).
  - **Shop** — the collection page's eyebrow and heading.
- **Analytics** (`/analytics`) — per-product views/cart-adds/purchases/conversion rate in a
  sortable table, plus an overall views → cart → purchase funnel.
- **Settings** (`/settings`) — store name/accent color/support email (live-editable), and
  placeholders for admin roles and API keys pending auth/backend.

## Running

```bash
npm install
npm run dev     # http://localhost:3001
```

Run `alloyed-living` (`npm run dev` in that folder, `http://localhost:3000`) alongside it to
see dashboard edits reflected on the storefront on refresh.
