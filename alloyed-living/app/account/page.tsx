"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import Header from "@/src/components/layout/Header"
import ToastContainer from "@/src/components/ui/ToastAlert"
import { useAuth } from "@/src/context/AuthContext"
import ProfileSection from "./ProfileSection"
import AddressBookSection from "./AddressBookSection"
import OrderHistorySection from "./OrderHistorySection"

const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}
const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]

type Tab = "profile" | "addresses" | "orders"

const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "addresses", label: "Addresses" },
  { id: "orders", label: "Order History" },
]

export default function AccountPage() {
  const router = useRouter()
  const { user, profile, displayName, loading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<Tab>("profile")

  useEffect(() => {
    setMounted(true)
  }, [])

  // Mirrors checkout/page.tsx's own auth guard exactly (mounted + auth
  // resolved + no user → redirect, preserving ?next so the user lands back
  // here after signing in).
  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.replace("/login?next=/account")
    }
  }, [mounted, authLoading, user, router])

  if (!mounted || authLoading || !user) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#faf9f7] pt-24 md:pt-28" />
      </>
    )
  }

  return (
    <>
      <Header />
      <ToastContainer />
      <main className="min-h-screen bg-[#faf9f7] pt-24 md:pt-28 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_CINEMATIC }}
            className="mb-12"
          >
            <span className="block text-[9px] tracking-[0.4em] uppercase text-stone-600 mb-3">My Account</span>
            <h1
              style={EDITORIAL}
              className="text-[2.4rem] md:text-[2.8rem] font-light text-stone-900 leading-[1.05] tracking-[-0.01em]"
            >
              {profile?.full_name ? `Welcome, ${profile.full_name.split(" ")[0]}.` : `Welcome, ${displayName}.`}
            </h1>
          </motion.div>

          {/* Tab strip — same animated-underline pattern as ReturnsPageView's PolicySection */}
          <div className="relative flex border-b border-stone-100 mb-10">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`
                  relative px-5 py-4 text-[8px] tracking-[0.32em] uppercase
                  transition-colors duration-300 cursor-pointer
                  ${tab === t.id ? "text-stone-900" : "text-stone-600 hover:text-stone-800"}
                `}
              >
                {t.label}
                {tab === t.id && (
                  <motion.div
                    layoutId="account-tab-underline"
                    className="absolute bottom-0 inset-x-0 h-px bg-stone-900"
                    transition={{ ease: EASE_CINEMATIC, duration: 0.4 }}
                  />
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE_CINEMATIC }}
            >
              {tab === "profile" && <ProfileSection />}
              {tab === "addresses" && <AddressBookSection />}
              {tab === "orders" && <OrderHistorySection />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </>
  )
}
