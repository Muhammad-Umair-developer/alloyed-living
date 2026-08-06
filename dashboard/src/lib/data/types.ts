// Mirrors `alloyed-living/src/lib/data/types.ts`. Duplicated (rather than a
// shared import across the app boundary) because Turbopack's `externalDir`
// support does not resolve modules outside this app's root on this setup.
// The JSON files under `../../../shared/data/` remain the single source of
// truth; only these type declarations and the thin accessor functions in
// this folder are duplicated between `alloyed-living` and `dashboard`.

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

export interface CustomOrderStep {
  title: string
  description: string
}

export interface CustomOrderPageContent {
  eyebrow: string
  heroTitle: string
  heroSubtitle: string
  /** Optional hero background image (URL or /public path). Falls back to a
   *  built-in default on the storefront when empty. */
  heroImage?: string
  /** Optional editable inspiration-gallery cards. Falls back to a built-in set
   *  on the storefront when empty/undefined. */
  galleryItems?: Array<{ imageUrl: string; caption: string }>
  steps: CustomOrderStep[]
  formHeading: string
  formSubheading: string
}

export interface FooterPageContent {
  tagline: string
  phone: string
  email: string
  hours: string
  instagramUrl: string
  facebookUrl: string
  copyright: string
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
  | CustomOrderPageContent
  | FooterPageContent

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
  | "custom-order"
  | "footer"

export interface ContentPage<T extends ContentPageFields = ContentPageFields> {
  slug: ContentSlug
  title: string
  updatedAt: string
  fields: T
}

// ─── Orders ─────────────────────────────────────────────────────────────────

export type OrderStatus = "pending" | "shipped" | "delivered" | "returned" | "exchanged"

// Payment lifecycle for the manual bank-transfer / COD-deposit flow. Mirrors the
// DB CHECK constraint and the enforce_payment_status_transition trigger. (Legacy
// Safepay values unpaid/paid/failed remain valid at the DB level as a safety
// margin but are no longer produced by the storefront.)
export type PaymentStatus =
  | "awaiting_payment"
  | "payment_submitted"
  | "payment_verified"
  | "payment_rejected"

// How an order is paid. 'cod' pays a deposit now with the balance collected by
// the courier; 'ubl' / 'jazzcash' pay the full total by bank transfer.
export type PaymentMethod = "cod" | "ubl" | "jazzcash"

// Which account a COD deposit is sent to. Null for direct ubl/jazzcash orders,
// where PaymentMethod already names the account.
export type DepositAccount = "ubl" | "jazzcash"

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
  // Payment tracking, set by the storefront checkout / receipt upload flow.
  paymentStatus?: PaymentStatus
  paymentMethod?: PaymentMethod
  depositAccount?: DepositAccount | null
  // All amounts below are computed SERVER-SIDE by the storefront.
  payableAmount?: number  // exact amount the customer was asked to pay
  depositAmount?: number  // COD only: upfront deposit (= payableAmount)
  codBalanceDue?: number  // COD only: balance the courier collects on delivery
  // Receipt review, set by the customer's upload and read here for verification.
  paymentReceiptPath?: string   // object path in the PRIVATE payment-receipts bucket
  paymentReceiptHash?: string
  paymentSenderName?: string
  paymentSenderMobile?: string
  paymentReference?: string
  paymentSubmittedAt?: string
  paymentFlagged?: boolean
  paymentFlagReason?: string
  // Set only by an authenticated dashboard action (confirm / reject).
  paymentVerifiedAt?: string
  paymentVerifiedBy?: string     // profiles.id of the admin who verified
  paymentRejectionReason?: string
  // Legacy Safepay.
  paymentProvider?: string
  paymentRef?: string
  // Opaque token the storefront's confirmation page is keyed by. Needed here to
  // build the re-upload link in the payment-rejected email.
  accessToken?: string
  createdAt: string
  updatedAt: string
}

export type OrderInput = Omit<
  Order,
  | "id" | "createdAt" | "updatedAt" | "status"
  | "paymentStatus" | "paymentMethod" | "depositAccount"
  | "payableAmount" | "depositAmount" | "codBalanceDue"
  | "paymentReceiptPath" | "paymentReceiptHash" | "paymentSenderName" | "paymentSenderMobile"
  | "paymentReference" | "paymentSubmittedAt" | "paymentFlagged" | "paymentFlagReason"
  | "paymentVerifiedAt" | "paymentVerifiedBy" | "paymentRejectionReason"
  | "paymentProvider" | "paymentRef" | "accessToken"
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
