import { getOrderByAccessToken } from "@/src/lib/data/orders"
import SafepayResult from "./SafepayResult"

// Always read the order fresh — status is updated out-of-band by the webhook.
export const dynamic = "force-dynamic"

type Status = "paid" | "failed" | "pending" | "unknown"

// SECURITY: the lookup key is the order's opaque access token (random UUID set
// by the callback redirect), never the order id — ids are sequential-looking
// and guessable, so accepting them here would let anyone enumerate orders and
// read payment status + customer email.
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; warn?: string }>
}) {
  const { token } = await searchParams

  let status: Status = "unknown"
  let orderId: string | null = null
  let email: string | null = null
  if (token) {
    const order = await getOrderByAccessToken(token)
    if (order) {
      orderId = order.id
      email = order.customer?.email ?? null
      if (order.paymentStatus === "paid") {
        status = "paid"
      } else if (order.paymentStatus === "failed") {
        status = "failed"
      } else {
        // Order exists but not yet marked paid — the authoritative webhook is
        // likely still in flight. The client polls until it resolves.
        status = "pending"
      }
    }
  }

  return <SafepayResult status={status} orderId={orderId} email={email} />
}
