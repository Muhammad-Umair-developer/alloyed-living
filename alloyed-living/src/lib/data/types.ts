// Mirrors `dashboard/src/lib/data/types.ts`. Duplicated (rather than a shared
// import across the app boundary) because Turbopack's `externalDir` support
// does not resolve modules outside this app's root on this setup. The JSON
// files under `../../../shared/data/` remain the single source of truth;
// only these type declarations and the thin accessor functions in this
// folder are duplicated between `alloyed-living` and `dashboard`.

export interface ProductColor {
  name: string
  hex: string
  gallery: string[]
}

export interface Product {
  id: string
  name: string
  material: string
  description: string
  // Longer, detail-page-only copy. `description` stays the short quick-view
  // blurb; this is the full write-up shown in the "About This Piece" section.
  longDescription?: string
  price: number
  discountPrice?: number | null
  category: string
  tags: string[]
  sizes: string[]
  stock: number
  dimensions: { h: number; w: number; d: number }
  accent: string
  image: string
  gallery: string[]
  galleryLabels?: string[]
  colors?: ProductColor[]
  features?: string[]
  seoTitle?: string
  seoDescription?: string
  createdAt: string
  updatedAt: string
}

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">

// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface Review {
  id: string
  productId: string
  author: string
  // Supabase auth.uid() of the reviewer. Set server-side from the session so a
  // review is always tied to the authenticated user who wrote it.
  authorId?: string
  rating: number // 1–5
  comment: string
  createdAt: string
}

export type ReviewInput = Omit<Review, "id" | "createdAt">

// ─── Content pages ──────────────────────────────────────────────────────────

export interface ShippingTier {
  label: string
  window: string
  rate: string
  freeMsg: string | null
  carrier: string
  note: string
}

export interface FAQ {
  q: string
  a: string
}

export interface ReturnStep {
  n: string
  label: string
  desc: string
}

export interface ReturnPolicy {
  id: string
  label: string
  badge: string | null
  conditions: string[]
  note: string
}

export interface ShippingPageContent {
  heroTitle: string
  heroSubtitle: string
  freeShippingThreshold: number
  tiers: ShippingTier[]
  faqs: FAQ[]
}

export interface ReturnsPageContent {
  heroTitle: string
  heroSubtitle: string
  returnWindowDays: number
  steps: ReturnStep[]
  policies: ReturnPolicy[]
}

export interface ContactPageContent {
  email: string
  whatsapp: string
  hours: string
  heroTitle: string
  heroSubtitle: string
}

export interface AboutPageContent {
  heroTitle: string
  body: string
}

export interface TermsPageContent {
  body: string
}

export interface FaqPageContent {
  faqs: FAQ[]
}

export type HeroMediaType = "video" | "image" | "none"

export interface HomeHeroContent {
  mediaType: HeroMediaType
  videoUrl: string | null
  imageUrl: string | null
  eyebrow: string
  titleLine1: string
  titleLine2: string
  tagline: string
  ctaLabel: string
}

export interface HomeStoryContent {
  eyebrow: string
  title: string
  body: string
  ctaLabel: string
}

export interface HomeShopRoomContent {
  eyebrow: string
  title: string
  subtitle: string
  backgroundImage: string
  ctaLabel: string
}

export interface HomeFeaturedContent {
  eyebrow: string
  title: string
  ctaLabel: string
  productIds: string[]
}

export interface HomePageContent {
  hero: HomeHeroContent
  story: HomeStoryContent
  shopRoom: HomeShopRoomContent
  featured: HomeFeaturedContent
}

export interface ShopPageContent {
  eyebrow: string
  title: string
}

export interface FactoryLocationPageContent {
  heroTitle: string
  heroSubtitle: string
  address: string
  mapEmbedUrl: string
  phone: string
  hours: string
}

export interface CatalogPageContent {
  heroTitle: string
  heroSubtitle: string
  intro: string
  // Admin-uploaded PDF (Supabase Storage URL). When set, the storefront
  // download button serves this exact file instead of generating one.
  catalogPdfUrl: string | null
}

export type ContentPageFields =
  | ShippingPageContent
  | ReturnsPageContent
  | ContactPageContent
  | AboutPageContent
  | TermsPageContent
  | FaqPageContent
  | HomePageContent
  | ShopPageContent
  | FactoryLocationPageContent
  | CatalogPageContent

export type ContentSlug =
  | "home"
  | "shop"
  | "shipping"
  | "returns"
  | "contact"
  | "about"
  | "faq"
  | "terms"
  | "factory-location"
  | "catalog"

export interface ContentPage<T extends ContentPageFields = ContentPageFields> {
  slug: ContentSlug
  title: string
  updatedAt: string
  fields: T
}

// ─── Orders ─────────────────────────────────────────────────────────────────

export type OrderStatus = "pending" | "shipped" | "delivered" | "returned" | "exchanged"

// Payment lifecycle, tracked separately from fulfilment status. An order is only
// ever "paid" after a verified Safepay signature (webhook / redirect) — never
// merely because the shopper landed on the success URL.
export type PaymentStatus = "unpaid" | "paid" | "failed"

export interface OrderItem {
  productId: string
  name: string
  price: number
  quantity: number
  image?: string
}

export interface OrderCustomer {
  name: string
  email: string
  phone?: string
}

export interface OrderShippingAddress {
  street: string
  city: string
  province?: string
  postalCode?: string
  country: string
}

export interface Order {
  id: string
  status: OrderStatus
  items: OrderItem[]
  customer: OrderCustomer
  shippingAddress: OrderShippingAddress
  subtotal: number
  delivery: number
  total: number
  // Payment tracking (optional; set once an online payment is initiated).
  paymentStatus?: PaymentStatus
  paymentProvider?: string // e.g. "safepay"
  paymentRef?: string      // Safepay tracker/beacon token — maps webhooks back to this order
  // Opaque random token for the checkout-success lookup. Never shown in UI;
  // order IDs are guessable, this is not.
  accessToken?: string
  createdAt: string
  updatedAt: string
}

export type OrderInput = Omit<
  Order,
  "id" | "createdAt" | "updatedAt" | "status" | "paymentStatus" | "paymentProvider" | "paymentRef" | "accessToken"
>

// ─── Analytics ──────────────────────────────────────────────────────────────

export interface ProductAnalytics {
  productId: string
  views: number
  addToCart: number
  purchases: number
}

export interface DailyStat {
  date: string // YYYY-MM-DD
  views: number
  cartAdds: number
  sales: number
  revenue: number
}

export interface AnalyticsData {
  products: ProductAnalytics[]
  daily: DailyStat[]
}

// ─── Settings ───────────────────────────────────────────────────────────────

export interface AdminUser {
  name: string
  email: string
  role: "owner" | "manager" | "staff"
}

export interface ApiKey {
  label: string
  key: string
  createdAt: string
}

export interface Settings {
  storeName: string
  accentColor: string
  supportEmail: string
  admins: AdminUser[]
  apiKeys: ApiKey[]
}
