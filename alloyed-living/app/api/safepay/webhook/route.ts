import { NextResponse, type NextRequest } from "next/server"
import { createSafepayClient, getSafepayEnvironment } from "@/src/lib/safepay/client"
import { getOrder, getOrderByPaymentRef, setOrderPayment } from "@/src/lib/data/orders"
import { trackPurchase } from "@/src/lib/data/analytics"
import { sendOrderConfirmationEmail } from "@/src/lib/email/order-confirmation"
import { sendOwnerOrderNotificationEmail } from "@/src/lib/email/owner-order-notification"

// Safepay webhook — the AUTHORITATIVE source of truth for payment status.
// The order is only marked "paid" here, after the webhook signature is verified
// with SAFEPAY_WEBHOOK_SECRET (HMAC-SHA512 over JSON.stringify(body.data)).
export const dynamic = "force-dynamic"

// Classify the verified event. Three outcomes, not two:
//   "paid"   — terminal success state; mark the order paid.
//   "failed" — terminal failure state; mark the order failed.
//   "ignore" — anything unrecognised (informational/interim events). We ack it
//              without touching payment state: writing "failed" on an unknown
//              event could flip a pending order while the shopper is mid-flow.
// NOTE: "payment:created" is deliberately NOT a success signal — a created
// payment is not a captured payment. Pin these strings against your sandbox
// webhook logs before switching SAFEPAY_ENVIRONMENT to production.
function classifyPayment(body: {
  type?: unknown
  data?: { state?: unknown; status?: unknown }
}): "paid" | "failed" | "ignore" {
  const type = String(body?.type ?? "").toLowerCase()
  const state = String(body?.data?.state ?? body?.data?.status ?? "").toLowerCase()
  const successTypes = ["payment:succeeded", "payment.succeeded"]
  const successStates = ["paid", "completed", "succeeded", "captured", "tracker_ended"]
  const failureTypes = ["payment:failed", "payment.failed"]
  const failureStates = ["failed", "errored", "declined", "cancelled", "canceled", "voided", "expired"]
  if (successTypes.includes(type) || successStates.includes(state)) return "paid"
  if (failureTypes.includes(type) || failureStates.includes(state)) return "failed"
  return "ignore"
}

export async function POST(req: NextRequest) {
  // Read the parsed JSON body; the SDK re-serialises body.data to check the sig.
  let body: {
    type?: unknown
    data?: { tracker?: string; token?: string; order_id?: string; reference?: string; metadata?: { order_id?: string }; state?: unknown; status?: unknown }
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const signature = req.headers.get("x-sfpy-signature") ?? undefined

  // ── Verify the signature BEFORE trusting anything in the payload ──
  let verified = false
  try {
    const safepay = createSafepayClient()
    verified = safepay.verify.webhook({ body, headers: { "x-sfpy-signature": signature } })
  } catch (e) {
    console.error("[safepay webhook] verification threw", e)
    return NextResponse.json({ error: "server error" }, { status: 500 })
  }
  if (!verified) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 })
  }

  const data = body.data ?? {}
  // Sandbox aid: log the VERIFIED payload so the exact success/order fields can
  // be confirmed. Never logged in production — payloads contain customer data.
  if (getSafepayEnvironment() === "sandbox") {
    console.log("[safepay webhook] verified", JSON.stringify({ type: body.type, data }))
  }

  // Map the event back to our order — by tracker token (preferred, we stored it)
  // or by the order_id we passed into checkout.
  const tracker = data.tracker ?? data.token
  const orderId = data.order_id ?? data.metadata?.order_id ?? data.reference

  const order =
    (orderId ? await getOrder(orderId) : null) ??
    (tracker ? await getOrderByPaymentRef(tracker) : null)

  if (!order) {
    console.warn("[safepay webhook] no matching order", { orderId, tracker })
    // Acknowledge so Safepay doesn't retry indefinitely for an unknown order.
    return NextResponse.json({ received: true })
  }

  // Idempotent: never downgrade an already-paid order.
  if (order.paymentStatus === "paid") {
    return NextResponse.json({ received: true, already: "paid" })
  }

  const outcome = classifyPayment(body)
  if (outcome === "ignore") {
    return NextResponse.json({ received: true, ignored: true })
  }

  const paid = outcome === "paid"
  await setOrderPayment(order.id, {
    paymentProvider: "safepay",
    paymentStatus: paid ? "paid" : "failed",
    ...(tracker ? { paymentRef: tracker } : {}),
  })

  // On the (idempotent, once-only — see the already-paid guard above) transition
  // to paid: count the sale in analytics (order items were server-priced at
  // creation, so these amounts are trustworthy) and email the customer their
  // order summary via Resend. Safepay sends its own payment receipt separately.
  // Neither may ever fail the webhook ack, so both are isolated.
  if (paid) {
    try {
      await Promise.all(
        order.items.map((item) =>
          trackPurchase(item.productId, item.quantity, item.price * item.quantity),
        ),
      )
    } catch (e) {
      console.error("[safepay webhook] purchase tracking failed", e)
    }
    try {
      await sendOrderConfirmationEmail(
        { ...order, paymentStatus: "paid" },
        { method: "safepay", paid: true },
      )
    } catch (e) {
      console.error("[safepay webhook] order confirmation email failed", e)
    }
    try {
      await sendOwnerOrderNotificationEmail(
        { ...order, paymentStatus: "paid" },
        { method: "safepay", paid: true },
      )
    } catch (e) {
      console.error("[safepay webhook] owner order-notification email failed", e)
    }
  }

  return NextResponse.json({ received: true, orderId: order.id, paid })
}
