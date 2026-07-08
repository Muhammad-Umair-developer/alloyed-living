import Link from "next/link"
import { ArrowRight, XCircle } from "lucide-react"
import Header from "@/src/components/layout/Header"

// Safepay redirects here when the shopper cancels on the hosted page. The order
// is deliberately left unpaid — we never mark payment state from a redirect.
export const metadata = { title: "Payment Cancelled — Alloyed Living" }

const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}

export default function CheckoutCancelPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#faf9f7] flex items-center justify-center px-6 pt-24">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-[#f5f3ef] border border-stone-200 flex items-center justify-center mx-auto mb-8">
            <XCircle size={20} strokeWidth={1.5} className="text-stone-600" />
          </div>
          <p style={EDITORIAL} className="text-3xl font-light text-stone-700 mb-3 tracking-wide">
            Payment Cancelled
          </p>
          <p className="text-[10px] tracking-[0.28em] uppercase text-stone-600 mb-8">
            Nothing was charged
          </p>
          <p className="text-[11px] text-stone-600 tracking-wide leading-relaxed mb-10">
            You cancelled before completing payment, so your order is on hold and no charge was made.
            Your cart is still saved — you can complete checkout whenever you&apos;re ready.
          </p>
          <Link
            href="/checkout"
            className="group inline-flex items-center gap-2 text-[9px] tracking-[0.34em] uppercase text-stone-600 border-b border-stone-200 pb-0.5 hover:border-stone-700 hover:text-stone-900 transition-all duration-500"
          >
            Return to Checkout
            <ArrowRight
              size={10}
              strokeWidth={1.5}
              className="transition-transform duration-500 group-hover:translate-x-1"
            />
          </Link>
        </div>
      </main>
    </>
  )
}
