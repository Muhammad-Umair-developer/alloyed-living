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
  // NEVER guess: for a direct bank order the method itself IS the account, but
  // a COD order's deposit account is only whatever was recorded at checkout.
  // If that's missing/unrecognized, `account` stays null rather than falling
  // back to a default.
  const account: "ubl" | "jazzcash" | null = isCod
    ? order.depositAccount === "ubl" || order.depositAccount === "jazzcash"
      ? order.depositAccount
      : null
    : order.paymentMethod === "jazzcash"
      ? "jazzcash"
      : "ubl"

  const status = (order.paymentStatus ?? "awaiting_payment") as ConfirmViewProps["status"]
  // Account details are only ever rendered while the customer still needs to
  // pay. If we can't determine the account at that point, show no account
  // details and no confusing form — send them to support instead.
  const needsAccount = status === "awaiting_payment" || status === "payment_rejected"
  if (account === null && needsAccount) {
    console.error(
      `[checkout/confirm] Order ${order.id} is COD with an unrecognized deposit_account ` +
        `(${order.depositAccount ?? "null"}); cannot render payment instructions.`,
    )
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#faf9f7] flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <p className="text-[10px] tracking-[0.28em] uppercase text-stone-600 mb-3">
              Payment Details Unavailable
            </p>
            <p className="text-[13px] text-stone-600 leading-relaxed">
              We couldn&apos;t determine which account to show for order {order.id}. Please contact our
              support team and reference this order number — we&apos;ll help you complete payment.
            </p>
          </div>
        </main>
      </>
    )
  }

  const pm = await getPaymentMethodsAction()
  const { label, lines } = account ? accountLines(account, pm) : { label: "", lines: [] }

  const amount = order.payableAmount ?? 0
  const balance = order.codBalanceDue ?? 0
  const showBalance = isCod && balance > 0
  const amountLabel = isCod ? (showBalance ? "Deposit to pay" : "Amount to pay") : "Amount to transfer"

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
