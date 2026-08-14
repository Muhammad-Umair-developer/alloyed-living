"use server"

import { revalidatePath } from "next/cache"
import { trackAddToCart, trackView } from "@/src/lib/data/analytics"
import { createOrder, cancelOrderByAccessToken, getOrdersForUser, cancelOrderByUser } from "@/src/lib/data/orders"
import { createReview } from "@/src/lib/data/reviews"
import { priceOrderItems, validatePromoCode } from "@/src/lib/checkout/pricing"
import { rateLimit } from "@/src/lib/rate-limit"
import { createSupabasePublicClient } from "@/src/lib/supabase/public"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { sendCancellationNotificationEmail } from "@/src/lib/email/cancellation-notification"
import type { PaymentMethodsFields } from "@/src/lib/checkout/payment-accounts"
import type { Order, OrderInput, Review } from "@/src/lib/data/types"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
  opts?: { depositAccount?: "ubl" | "jazzcash"; promoCode?: string },
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

  // Server-side session only — never trust a user id from client input.
  // Guest checkout has no session, so `user` is null here and stays null on
  // the order; everything else about checkout proceeds identically either
  // way. Fetched BEFORE priceOrderItems now (rather than after, as before
  // promo codes existed) because the per-customer usage-cap check needs it.
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const priced = await priceOrderItems(
    (input?.items ?? []).map((i) => ({ productId: i.productId, quantity: i.quantity })),
    { promoCode: opts?.promoCode, userId: user?.id ?? null },
  )
  if (!priced.ok) return { error: priced.error }

  let order
  try {
    order = await createOrder(
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
      user?.id ?? null,
      priced.discountCode && priced.promoCodeId
        ? { promoCodeId: priced.promoCodeId, code: priced.discountCode, amount: priced.discountAmount }
        : null,
    )
  } catch (e) {
    // A lost redemption race (the code was exhausted in the gap between
    // priceOrderItems validating it and createOrder trying to redeem it) is
    // the one createOrder failure worth a specific, friendly message rather
    // than an uncaught exception — everything else still propagates as before.
    if (e instanceof Error && e.message.startsWith("PROMO_REDEMPTION_FAILED")) {
      return { error: "This promo code just reached its usage limit. Please remove it and try again." }
    }
    throw e
  }

  // No email at placement, for any payment method — the customer and owner
  // notifications both fire only once a receipt is actually uploaded (see
  // app/api/payment-receipt/route.ts). Placing an order triggers no email to
  // anyone.

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

export interface PromoPreviewResult {
  ok: boolean
  error?: string
  code?: string // canonical code, for display
  discountAmount?: number
}

// Checkout UI's "Apply" button — runs the SAME validation as the real order
// placement (validatePromoCode, called from priceOrderItems too), but never
// touches times_used. `subtotal` here is the client's own cart display
// total — NOT trusted as authoritative; it's only used to preview the
// discount and check min_order_value for UX purposes. The actual, binding
// validation runs again from scratch inside priceOrderItems at real
// placeOrderAction time, using the server's own recomputed subtotal, so a
// stale or lied-about preview subtotal can never affect what's actually
// charged.
export async function previewPromoCodeAction(code: string, subtotal: number): Promise<PromoPreviewResult> {
  if (!(await rateLimit("preview-promo", 20, 60_000))) {
    return { ok: false, error: "Too many attempts. Please wait a moment and try again." }
  }
  if (!code?.trim()) return { ok: false, error: "Please enter a promo code." }
  if (!Number.isFinite(subtotal) || subtotal <= 0) return { ok: false, error: "Invalid order total." }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const result = await validatePromoCode(code, subtotal, user?.id ?? null)
  if (!result.ok) return { ok: false, error: result.error }

  return { ok: true, code: result.code, discountAmount: result.discountAmount }
}

// Fixed, non-free-text reason: customers pick "Cancel Order," nothing more —
// no text field to moderate or that could be abused as a spam/injection
// surface. If per-reason breakdowns are ever wanted, replace this with a
// small preset (radio buttons), not an open text input.
const CUSTOMER_CANCEL_REASON = "Cancelled by customer"

export interface CancelOrderResult {
  ok: boolean
  error?: string
  refundAmount?: number
  refundStatus?: "none" | "pending" | "processed"
}

// Customer self-service cancellation, reachable only via the order's opaque
// access token (from the /checkout/confirm?token=... link) — never a raw
// order id, so a guessed order id can't be used to cancel someone else's
// order. cancelOrderByAccessToken re-checks the order's CURRENT status fresh
// from the DB and refuses if it's no longer 'pending', regardless of what
// the calling page's (possibly stale) UI showed.
export async function cancelOrderByToken(accessToken: string): Promise<CancelOrderResult> {
  if (!(await rateLimit("cancel-order", 5, 60_000))) {
    return { ok: false, error: "Too many attempts. Please wait a minute and try again." }
  }
  if (!accessToken) return { ok: false, error: "Order not found." }

  const result = await cancelOrderByAccessToken(accessToken, CUSTOMER_CANCEL_REASON)
  if (!result.ok) return { ok: false, error: result.error }

  // Non-blocking: an email failure must never undo the cancellation that
  // already committed to the database.
  try {
    await sendCancellationNotificationEmail(result.order, { initiatedBy: "customer" })
  } catch (e) {
    console.error("[cancelOrderByToken] cancellation notification email failed:", e)
  }

  return {
    ok: true,
    refundAmount: result.order.refundAmount,
    refundStatus: result.order.refundStatus,
  }
}

// Account page's order history. Server-side session only — never accepts a
// user id from the client. Throws (rather than returning an error shape) if
// there's no session, matching listAddressesAction's convention; callers
// catch this the same way.
export async function listMyOrdersAction(): Promise<Order[]> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("You must be signed in.")
  return getOrdersForUser(user.id)
}

// Second cancellation entry point, alongside cancelOrderByToken above — same
// safety guarantees, proven a different way. userId comes ONLY from the
// server-side session; there is no userId parameter here for a client to
// spoof. cancelOrderByUser folds ownership (user_id) into the DB lookup
// itself and re-checks status = 'pending' at write time — see orders.ts.
//
// Unlike cancelOrderByToken, this path takes a real reason from the account
// page's cancellation modal (a preset label, or free text from its "Other"
// option) instead of the fixed CUSTOMER_CANCEL_REASON constant. Sanitized the
// same way every other reason field in this codebase is (trim + length cap)
// — same pattern as rejectPaymentAction/cancelOrderAction in the dashboard.
const CANCEL_REASON_MAX = 200

export async function cancelOrderByUserAction(orderId: string, reason: string): Promise<CancelOrderResult> {
  if (!(await rateLimit("cancel-order-by-user", 5, 60_000))) {
    return { ok: false, error: "Too many attempts. Please wait a minute and try again." }
  }
  if (!orderId) return { ok: false, error: "Order not found." }

  const trimmedReason = (reason ?? "").trim().slice(0, CANCEL_REASON_MAX)
  if (!trimmedReason) return { ok: false, error: "Please select a reason for cancelling." }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You must be signed in." }

  const result = await cancelOrderByUser(orderId, user.id, trimmedReason)
  if (!result.ok) return { ok: false, error: result.error }

  // Non-blocking: an email failure must never undo the cancellation that
  // already committed to the database.
  try {
    await sendCancellationNotificationEmail(result.order, { initiatedBy: "customer" })
  } catch (e) {
    console.error("[cancelOrderByUserAction] cancellation notification email failed:", e)
  }

  return {
    ok: true,
    refundAmount: result.order.refundAmount,
    refundStatus: result.order.refundStatus,
  }
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