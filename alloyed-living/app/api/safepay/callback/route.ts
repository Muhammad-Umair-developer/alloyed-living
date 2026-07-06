import { NextResponse, type NextRequest } from "next/server"
import { createSafepayClient } from "@/src/lib/safepay/client"
import { getOrder, getOrderByPaymentRef } from "@/src/lib/data/orders"

// Safepay redirects the shopper's browser here after they finish (or abandon) the
// hosted checkout. Safepay may POST an HTML form or GET with query params, so we
// handle both. This route only decides WHICH UI page to show — it never marks an
// order paid. The webhook is the authoritative source of truth for payment state.
export const dynamic = "force-dynamic"

async function handle(req: NextRequest): Promise<NextResponse> {
  const fields: Record<string, string> = {}

  // Query params (GET, or extra params on POST).
  req.nextUrl.searchParams.forEach((v, k) => (fields[k] = v))

  // Body (POST): form-encoded or JSON.
  const contentType = req.headers.get("content-type") ?? ""
  try {
    if (contentType.includes("application/json")) {
      const json = (await req.json()) as Record<string, unknown>
      for (const [k, v] of Object.entries(json)) fields[k] = String(v)
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const form = await req.formData()
      form.forEach((v, k) => (fields[k] = String(v)))
    }
  } catch {
    // Ignore parse errors — we fall back to query params / a generic result.
  }

  const orderId = fields.order_id ?? fields.orderId ?? ""
  const tracker = fields.tracker ?? fields.token ?? ""
  const sig = fields.sig ?? ""

  // Defense-in-depth: verify the redirect signature (HMAC-SHA256 of the tracker
  // with the v1 secret). This is advisory only — it decides whether to show a
  // "verifying" vs "warning" hint. Money state is decided by the webhook.
  let sigValid: boolean | null = null
  if (sig && tracker) {
    try {
      sigValid = createSafepayClient().verify.signature({ body: { sig, tracker } })
    } catch {
      sigValid = null
    }
  }

  // The success page looks orders up by their opaque access token, never by the
  // (guessable) order id — resolve it server-side here. A shopper who lands on
  // the success page without a valid token just sees the generic state.
  const order =
    (orderId ? await getOrder(orderId) : null) ??
    (tracker ? await getOrderByPaymentRef(tracker) : null)

  const dest = new URL("/checkout/success", req.nextUrl.origin)
  if (order?.accessToken) dest.searchParams.set("token", order.accessToken)
  if (sigValid === false) dest.searchParams.set("warn", "signature")

  // 303 so the browser issues a GET to the success page even after a POST.
  return NextResponse.redirect(dest, { status: 303 })
}

export async function POST(req: NextRequest) {
  return handle(req)
}

export async function GET(req: NextRequest) {
  return handle(req)
}
