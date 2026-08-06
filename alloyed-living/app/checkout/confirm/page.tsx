import { getOrderByAccessToken } from "@/src/lib/data/orders"
import { getPaymentMethodsAction } from "@/src/actions/store-actions"
import { accountLines } from "@/src/lib/checkout/payment-accounts"
import Header from "@/src/components/layout/Header"
import ConfirmView, { type ConfirmViewProps } from "./ConfirmView"

// Status is updated out-of-band (customer upload, admin verify), so always read
// the order fresh. The confirm page is keyed by the opaque access token — never
// the guessable order id.
export const dynamic = "force-dynamic"

export default async function CheckoutConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const order = token ? await getOrderByAccessToken(token) : null

  if (!order || !token) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#faf9f7] flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <p className="text-[10px] tracking-[0.28em] uppercase text-stone-600 mb-3">Order Not Found</p>
            <p className="text-[13px] text-stone-600 leading-relaxed">
              We couldn&apos;t find that order. Please use the link from your order email.
            </p>
          </div>
        </main>
      </>
    )
  }

  const isCod = order.paymentMethod === "cod"
  const account: "ubl" | "jazzcash" = isCod
    ? order.depositAccount === "jazzcash"
      ? "jazzcash"
      : "ubl"
    : order.paymentMethod === "jazzcash"
      ? "jazzcash"
      : "ubl"

  const pm = await getPaymentMethodsAction()
  const { label, lines } = accountLines(account, pm)

  const amount = order.payableAmount ?? 0
  const balance = order.codBalanceDue ?? 0
  const showBalance = isCod && balance > 0
  const amountLabel = isCod ? (showBalance ? "Deposit to pay" : "Amount to pay") : "Amount to transfer"

  const status = (order.paymentStatus ?? "awaiting_payment") as ConfirmViewProps["status"]

  return (
    <>
      <Header />
      <ConfirmView
        token={token}
        status={status}
        orderId={order.id}
        isCod={isCod}
        amountLabel={amountLabel}
        amount={amount}
        showBalance={showBalance}
        balance={balance}
        accountLabel={label}
        accountLines={lines}
        rejectionReason={order.paymentRejectionReason ?? null}
      />
    </>
  )
}
