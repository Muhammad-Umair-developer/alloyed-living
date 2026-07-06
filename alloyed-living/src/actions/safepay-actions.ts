"use server"

import { headers } from "next/headers"
import { getOrder, setOrderPayment } from "@/src/lib/data/orders"
import { priceOrderItems } from "@/src/lib/checkout/pricing"
import { rateLimit } from "@/src/lib/rate-limit"
import { createSafepayClient } from "@/src/lib/safepay/client"

export interface SafepayCheckoutResult {
  url?: string
  error?: string
}

// Starts a Safepay hosted-checkout session for an existing order and returns the
// URL the client should redirect to.
//
// SECURITY: this action intentionally takes ONLY the orderId — it never accepts
// an amount from the client. The charge is recomputed server-side from current
// product prices, so a tampered cart/total cannot change what is charged.
export async function createSafepayCheckout(orderId: string): Promise<SafepayCheckoutResult> {
  if (!(await rateLimit("safepay-checkout", 10, 60_000))) {
    return { error: "Too many payment attempts. Please wait a minute and try again." }
  }
  const order = await getOrder(orderId)
  if (!order) return { error: "Order not found." }
  if (order.paymentStatus === "paid") return { error: "This order has already been paid." }
  if (order.items.length === 0) return { error: "This order has no items." }

  // Recompute the authoritative total from live product prices (single batched
  // query). Order rows are already server-priced at creation, but repricing at
  // charge time keeps the guarantee independent of how the order was stored.
  const priced = await priceOrderItems(
    order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
  )
  if (!priced.ok) return { error: priced.error }
  const total = priced.total

  const origin = await resolveOrigin()
  if (!origin) return { error: "Could not determine the site URL for the payment redirect." }

  try {
    const safepay = createSafepayClient()

    // Safepay amounts are in the major currency unit (PKR rupees) — do NOT
    // multiply by 100. Our totals are already whole rupees.
    const { token } = await safepay.payments.create({ amount: total, currency: "PKR" })

    // Persist the tracker token so the webhook/redirect can map back to this
    // order, and mark the order explicitly unpaid until a verified event lands.
    await setOrderPayment(order.id, {
      paymentProvider: "safepay",
      paymentStatus: "unpaid",
      paymentRef: token,
    })

    const url = safepay.checkout.create({
      token,
      orderId: order.id,
      source: "custom",
      webhooks: true,
      redirectUrl: `${origin}/api/safepay/callback`,
      cancelUrl: `${origin}/checkout/cancel?order=${encodeURIComponent(order.id)}`,
    })

    return { url }
  } catch (e) {
    // Never leak raw SDK/network errors to the client.
    console.error("[createSafepayCheckout]", e)
    return { error: "Could not start the payment. Please try again." }
  }
}

// Absolute origin used to build Safepay redirect/cancel URLs. Prefer an explicit
// public URL (required so Safepay's servers can reach the webhook — e.g. an
// ngrok tunnel in local dev); fall back to the incoming request host.
async function resolveOrigin(): Promise<string | null> {
  const configured = process.env.SAFEPAY_PUBLIC_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (configured) return configured.replace(/\/+$/, "")

  const h = await headers()
  const host = h.get("host")
  if (!host) return null
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
  return `${proto}://${host}`
}
