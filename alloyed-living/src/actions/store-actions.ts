"use server"

import { revalidatePath } from "next/cache"
import { trackAddToCart, trackPurchase, trackView } from "@/src/lib/data/analytics"
import { createOrder } from "@/src/lib/data/orders"
import { createReview } from "@/src/lib/data/reviews"
import { priceOrderItems } from "@/src/lib/checkout/pricing"
import { sendOrderConfirmationEmail } from "@/src/lib/email/order-confirmation"
import { sendOwnerOrderNotificationEmail } from "@/src/lib/email/owner-order-notification"
import { rateLimit } from "@/src/lib/rate-limit"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import type { OrderInput, Review } from "@/src/lib/data/types"

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
  error?: string
}

// SECURITY: nothing money-related is trusted from the client. Item prices,
// names, images, subtotal, delivery and total are recomputed server-side from
// live product rows (priceOrderItems) — the client only chooses WHAT and HOW
// MANY. Purchase analytics use the recomputed amounts, and only fire here for
// COD (a Safepay order isn't a sale until the webhook verifies payment).
export async function placeOrderAction(
  input: OrderInput,
  paymentMethod: "cod" | "safepay" = "safepay",
): Promise<PlaceOrderResult> {
  if (!(await rateLimit("place-order", 5, 60_000))) {
    return { error: "Too many order attempts. Please wait a minute and try again." }
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

  const order = await createOrder({
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
  })

  if (paymentMethod === "cod") {
    // COD is confirmed on placement: count the sale and email the summary now.
    // Safepay orders do both from the webhook once payment is verified.
    
    // 1. Isolate the analytics pipeline from the core execution flow
    try {
      await Promise.all(
        order.items.map((item) => trackPurchase(item.productId, item.quantity, item.price * item.quantity)),
      )
    } catch (analyticsError) {
      console.error("Non-blocking analytics tracking failure in production:", analyticsError)
    }

    // 2. Isolate the email engine and safely log specific production failures
    try {
      await sendOrderConfirmationEmail(order, { method: "cod", paid: false })
    } catch (emailError) {
      console.error("CRITICAL: Production COD order confirmation email dispatch failure:", emailError)
    }

    // 3. Notify the owner of the new order (separate inbox; never blocks the order).
    try {
      await sendOwnerOrderNotificationEmail(order, { method: "cod", paid: false })
    } catch (ownerEmailError) {
      console.error("Non-blocking owner order-notification email failure (COD):", ownerEmailError)
    }
  }

  return { orderId: order.id }
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