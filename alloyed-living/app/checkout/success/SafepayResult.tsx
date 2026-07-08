"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Check, Loader2, XCircle, ArrowRight } from "lucide-react"
import Header from "@/src/components/layout/Header"
import { useCart } from "@/src/context/CartContext"

const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}
const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]

type Status = "paid" | "failed" | "pending" | "unknown"

// Max background refreshes while waiting for the authoritative webhook to land.
const MAX_POLLS = 10
const POLL_MS = 3000

export default function SafepayResult({
  status,
  orderId,
  email,
}: {
  status: Status
  orderId: string | null
  email?: string | null
}) {
  const router = useRouter()
  const { clearCart } = useCart()
  const polls = useRef(0)

  // Clear the cart once, only after payment is confirmed.
  useEffect(() => {
    if (status === "paid") clearCart()
  }, [status, clearCart])

  // While the payment is still confirming, re-fetch (the webhook may arrive a
  // moment after the browser redirect). Stops once paid/failed or polls run out.
  useEffect(() => {
    if (status !== "pending") return
    if (polls.current >= MAX_POLLS) return
    const t = setTimeout(() => {
      polls.current += 1
      router.refresh()
    }, POLL_MS)
    return () => clearTimeout(t)
  }, [status, router])

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#faf9f7] flex items-center justify-center px-6 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease: EASE_CINEMATIC, duration: 0.8 }}
          className="text-center max-w-sm"
        >
          {status === "paid" && (
            <>
              <div className="w-14 h-14 rounded-full bg-[#f5f3ef] border border-[#9c9c7d]/25 flex items-center justify-center mx-auto mb-8">
                <Check size={20} strokeWidth={1.5} className="text-[#5c6b4a]" />
              </div>
              <p style={EDITORIAL} className="text-3xl font-light text-stone-700 mb-3 tracking-wide">
                Payment Confirmed
              </p>
              <p className="text-[10px] tracking-[0.28em] uppercase text-stone-600 mb-8">
                Thank you for your order
              </p>
              <p className="text-[11px] text-stone-600 tracking-wide leading-relaxed mb-10">
                {orderId ? (
                  <>
                    Your order <span className="text-stone-600">{orderId}</span> is confirmed and paid.
                  </>
                ) : (
                  <>Your payment was confirmed.</>
                )}{" "}
                A payment receipt from Safepay and an order summary with your product details
                have been emailed to{" "}
                <span className="text-stone-600">{email || "your inbox"}</span>. Our support team
                team will follow up shortly.
              </p>
            </>
          )}

          {status === "pending" && (
            <>
              <div className="w-14 h-14 rounded-full bg-[#f5f3ef] border border-stone-200 flex items-center justify-center mx-auto mb-8">
                <Loader2 size={20} strokeWidth={1.5} className="text-stone-600 animate-spin" />
              </div>
              <p style={EDITORIAL} className="text-3xl font-light text-stone-700 mb-3 tracking-wide">
                Confirming Payment
              </p>
              <p className="text-[10px] tracking-[0.28em] uppercase text-stone-600 mb-8">
                Just a moment
              </p>
              <p className="text-[11px] text-stone-600 tracking-wide leading-relaxed mb-10">
                We&apos;re verifying your payment with Safepay. This usually takes a few seconds —
                this page will update automatically.
              </p>
            </>
          )}

          {status === "failed" && (
            <>
              <div className="w-14 h-14 rounded-full bg-[#f5f0ef] border border-[#7a3535]/25 flex items-center justify-center mx-auto mb-8">
                <XCircle size={20} strokeWidth={1.5} className="text-[#7a3535]" />
              </div>
              <p style={EDITORIAL} className="text-3xl font-light text-stone-700 mb-3 tracking-wide">
                Payment Not Completed
              </p>
              <p className="text-[10px] tracking-[0.28em] uppercase text-stone-600 mb-8">
                Nothing was charged
              </p>
              <p className="text-[11px] text-stone-600 tracking-wide leading-relaxed mb-10">
                Your payment didn&apos;t go through and your order is on hold. You can try again from
                checkout — no charge was made.
              </p>
            </>
          )}

          {status === "unknown" && (
            <>
              <div className="w-14 h-14 rounded-full bg-[#f5f3ef] border border-stone-200 flex items-center justify-center mx-auto mb-8">
                <Loader2 size={20} strokeWidth={1.5} className="text-stone-600 animate-spin" />
              </div>
              <p style={EDITORIAL} className="text-3xl font-light text-stone-700 mb-3 tracking-wide">
                Processing
              </p>
              <p className="text-[11px] text-stone-600 tracking-wide leading-relaxed mb-10 mt-6">
                We&apos;re locating your order. If this persists, please contact our support team.
              </p>
            </>
          )}

          <a
            href={status === "failed" ? "/checkout" : "/shop"}
            className="group inline-flex items-center gap-2 text-[9px] tracking-[0.34em] uppercase text-stone-600 border-b border-stone-200 pb-0.5 hover:border-stone-700 hover:text-stone-900 transition-all duration-500"
          >
            {status === "failed" ? "Return to Checkout" : "Continue Shopping"}
            <ArrowRight
              size={10}
              strokeWidth={1.5}
              className="transition-transform duration-500 group-hover:translate-x-1"
            />
          </a>
        </motion.div>
      </main>
    </>
  )
}
