"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { trackAddToCart, trackView } from "@/src/lib/data/analytics"
import { createOrder } from "@/src/lib/data/orders"
import { createReview } from "@/src/lib/data/reviews"
import { priceOrderItems } from "@/src/lib/checkout/pricing"
import { sendBankAwaitingPaymentEmail } from "@/src/lib/email/bank-awaiting-payment"
import { rateLimit } from "@/src/lib/rate-limit"
import { createSupabasePublicClient } from "@/src/lib/supabase/public"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import type { PaymentMethodsFields } from "@/src/lib/checkout/payment-accounts"
import type { OrderInput, Review } from "@/src/lib/data/types"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Absolute origin for the confirmation-page link in the awaiting-payment email.
// Prefer an explicit public URL; fall back to the incoming request host.
async function resolveOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured) return configured.replace(/\/+$/, "")
  const h = await headers()
  const host = h.get("host") ?? ""
  if (!host) return ""
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
  return `${proto}://${host}`
}

// Analytics pings are unauthenticated by nature; rate-limit them so they can't
// be used to poison the stats.
export async function trackAddToCartAction(productId: string): Promise<void> {
  if (!(await rateLimit("track-cart", 30, 60_000))) return
  await trackAddToCart(productId)
}

export async function trackViewAction(productId: string): Promise<void> {
  if (!(await rateLimit("track-view", 60, 60_000))) return
  await trackView(productId)
}

export interface PlaceOrderResult {
  orderId?: string
  accessToken?: string
  error?: string
}

// SECURITY: nothing money-related is trusted from the client. Item prices,
// names, images, subtotal, delivery and total are recomputed server-side from
// live product rows (priceOrderItems); the payable amount, deposit and courier
// balance are computed in createOrder. The client only chooses WHAT, HOW MANY,
// the payment method, and (for COD) which account to deposit to.
//
// All three methods create the order in payment_status 'awaiting_payment' and
// return its opaque access token so the client can send the shopper to the
// confirmation page to upload their receipt.
export async function placeOrderAction(
  input: OrderInput,
  paymentMethod: "cod" | "ubl" | "jazzcash",
  opts?: { depositAccount?: "ubl" | "jazzcash" },
): Promise<PlaceOrderResult> {
  if (!(await rateLimit("place-order", 5, 60_000))) {
    return { error: "Too many order attempts. Please wait a minute and try again." }
  }

  // Validate the method, and for COD the chosen deposit account.
  if (paymentMethod !== "cod" && paymentMethod !== "ubl" && paymentMethod !== "jazzcash") {
    return { error: "Please choose a valid payment method." }
  }
  let depositAccount: "ubl" | "jazzcash" | null = null
  if (paymentMethod === "cod") {
    const acct = opts?.depositAccount
    if (acct !== "ubl" && acct !== "jazzcash") {
      return { error: "Please choose an account (UBL or JazzCash) for your deposit." }
    }
    depositAccount = acct
  }

  // Validate customer/contact basics (mirrors the client form, enforced here).
  const name = (input?.customer?.name ?? "").trim().slice(0, 200)
  const email = (input?.customer?.email ?? "").trim().slice(0, 320)
  const phone = (input?.customer?.phone ?? "").trim().slice(0, 32)
  if (!name || !EMAIL_RE.test(email)) {
    return { error: "Please provide a valid name and email address." }
  }
  const addr = input?.shippingAddress
  if (!addr?.street?.trim() || !addr?.city?.trim()) {
    return { error: "Please provide a delivery address." }
  }

  const priced = await priceOrderItems(
    (input?.items ?? []).map((i) => ({ productId: i.productId, quantity: i.quantity })),
  )
  if (!priced.ok) return { error: priced.error }

  const order = await createOrder(
    {
      items: priced.items,
      customer: { name, email, ...(phone ? { phone } : {}) },
      shippingAddress: {
        street: addr.street.trim().slice(0, 500),
        city: addr.city.trim().slice(0, 100),
        province: addr.province?.trim().slice(0, 100),
        postalCode: addr.postalCode?.trim().slice(0, 20),
        country: "Pakistan",
      },
      subtotal: priced.subtotal,
      delivery: priced.delivery,
      total: priced.total,
    },
    { method: paymentMethod, depositAccount },
  )

  // Email the shopper the account details, the exact amount to transfer, and a
  // link to the confirmation page to upload their receipt. Non-blocking: an email
  // failure must never fail the order — the order still exists and is reachable
  // via its access token.
  try {
    const origin = await resolveOrigin()
    const confirmUrl = `${origin}/checkout/confirm?token=${encodeURIComponent(order.accessToken ?? "")}`
    await sendBankAwaitingPaymentEmail(order, { confirmUrl })
  } catch (emailError) {
    console.error("Non-blocking awaiting-payment email failure:", emailError)
  }

  return { orderId: order.id, accessToken: order.accessToken }
}

// Returns the admin-managed bank account details (payment-methods content row)
// for the checkout panels and the confirmation page. Public read via the anon
// client — RLS on content_pages already allows public SELECT.
export async function getPaymentMethodsAction(): Promise<PaymentMethodsFields> {
  const supabase = createSupabasePublicClient()
  const { data } = await supabase
    .from("content_pages")
    .select("fields")
    .eq("slug", "payment-methods")
    .maybeSingle()
  return (data?.fields as PaymentMethodsFields | undefined) ?? {}
}

// Only signed-in users can post a review. The reviewer identity is taken from
// the Supabase session on the server — never trusted from the client — so each
// review is attached to the authenticated user's auth.uid().
export async function submitReviewAction(input: {
  productId: string
  rating: number
  comment: string
}): Promise<Review> {
  if (!(await rateLimit("submit-review", 3, 5 * 60_000))) {
    throw new Error("You're reviewing too quickly. Please try again in a few minutes.")
  }
  const comment = (input?.comment ?? "").trim().slice(0, 2000)

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("You must be signed in to write a review.")
  }

  // Profile row is created by the DB trigger; prefer its name for display.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single()

  const author =
    (profile?.full_name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "Anonymous"

  const review = await createReview({
    productId: input.productId,
    author,
    authorId: user.id,
    rating: input.rating,
    comment,
  })

  // Re-render the product page so the new review is reflected on next load.
  revalidatePath(`/shop/${input.productId}`)
  return review
}