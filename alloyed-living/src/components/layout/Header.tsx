"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, Search, ShoppingBag, X } from "lucide-react"
import Link from "next/link"
import CartDrawer from "./CartDrawer"
import AccountMenu from "./AccountMenu"
import { useCart } from "@/src/context/CartContext"

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Contact Us", href: "/contact" },
]

const SPRING_STD = { type: "spring", stiffness: 40, damping: 22 } as const
const SPRING_BRISK = { type: "spring", stiffness: 60, damping: 22 } as const
const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]

const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const { cartCount } = useCart()
  const cartItemCount = cartCount

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      setSearchOpen(false)
      setMobileMenuOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        {/* ─── Glass bar ─── */}
        <div className="backdrop-blur-xl bg-white/60 border-b border-white/20 shadow-[0_1px_24px_rgba(0,0,0,0.04)]">

          {/* ═══ DESKTOP (md+) ═══ */}
          <div className="hidden md:grid grid-cols-[auto_1fr_auto] items-center px-12 py-5 gap-12">

            {/* Left — Brand wordmark */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: EASE_CINEMATIC }}
            >
              <Link
                href="/"
                style={EDITORIAL}
                className="block text-[1.7rem] font-light tracking-[0.42em] uppercase
                           text-stone-800 select-none whitespace-nowrap cursor-pointer
                           hover:opacity-60 transition-opacity duration-700"
              >
                Alloyed Living
              </Link>
            </motion.div>

            {/* Center — Nav links */}
            <nav className="flex items-center justify-center gap-10" aria-label="Main navigation">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: EASE_CINEMATIC, delay: 0.1 + i * 0.07 }}
                >
                  <Link
                    href={link.href}
                    className="text-[9px] tracking-[0.34em] uppercase text-stone-500
                               cursor-pointer hover:text-stone-900 transition-colors duration-500"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </nav>

            {/* Right — Search, User, Cart */}
            <div className="flex items-center gap-6">

              {/* Search toggle */}
              <button
                onClick={() => setSearchOpen((v) => !v)}
                aria-label="Toggle search"
                className="group cursor-pointer"
              >
                <Search
                  size={17}
                  strokeWidth={1.5}
                  className="text-stone-500 transition-colors duration-500 group-hover:text-stone-900"
                />
              </button>

              {/* User / Login / Account menu */}
              <AccountMenu />

              {/* Cart */}
              <button
                onClick={() => setCartOpen(true)}
                aria-label={`Open shopping bag${cartItemCount > 0 ? `, ${cartItemCount} items` : ""}`}
                className="relative group cursor-pointer"
              >
                <ShoppingBag
                  size={18}
                  strokeWidth={1.5}
                  className="text-stone-500 transition-colors duration-500 group-hover:text-stone-900"
                />
                <AnimatePresence>
                  {cartItemCount > 0 && (
                    <motion.span
                      key="desktop-badge"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={SPRING_STD}
                      className="absolute -top-2 -right-2 flex items-center justify-center
                                 w-4 h-4 rounded-full bg-stone-800 text-white text-[8px] leading-none"
                    >
                      {cartItemCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>

          {/* ─── Expanding search row — slides in below desktop nav ─── */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.32, ease: EASE_CINEMATIC }}
                className="hidden md:flex items-center gap-3 px-12 pb-4 overflow-hidden
                           border-t border-stone-100/60"
              >
                <Search size={13} strokeWidth={1.5} className="text-stone-400 shrink-0" />
                <input
                  ref={searchRef}
                  type="search"
                  placeholder="Search pieces…"
                  className="flex-1 bg-transparent text-[11px] tracking-wide
                             text-stone-700 placeholder:text-stone-300 outline-none py-1"
                />
                <button onClick={() => setSearchOpen(false)} aria-label="Close search">
                  <X
                    size={13}
                    strokeWidth={1.5}
                    className="text-stone-400 transition-colors duration-300 hover:text-stone-800 cursor-pointer"
                  />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══ MOBILE (<md) ═══ */}
          <div className="flex md:hidden items-center justify-between px-6 py-4">

            {/* Hamburger / Close toggle */}
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              className="p-1"
            >
              <AnimatePresence mode="wait">
                {mobileMenuOpen ? (
                  <motion.span
                    key="x"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="block"
                  >
                    <X size={20} strokeWidth={1.5} className="text-stone-700" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="burger"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="block"
                  >
                    <Menu size={20} strokeWidth={1.5} className="text-stone-700" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Mobile wordmark — centered between hamburger and icons */}
            <Link
              href="/"
              style={EDITORIAL}
              className="text-[1.15rem] font-light tracking-[0.35em] uppercase
                         text-stone-800 select-none cursor-pointer"
            >
              Alloyed Living
            </Link>

            {/* Mobile utility icons */}
            <div className="flex items-center gap-3">
              <AccountMenu compact />
              <button
                onClick={() => setCartOpen(true)}
                aria-label={`Open shopping bag${cartItemCount > 0 ? `, ${cartItemCount} items` : ""}`}
                className="relative p-1 cursor-pointer"
              >
                <ShoppingBag
                  size={20}
                  strokeWidth={1.5}
                  className="text-stone-700 hover:text-stone-900 transition-colors duration-500"
                />
                {cartItemCount > 0 && (
                  <span
                    className="absolute top-0 right-0 flex items-center justify-center
                               w-4 h-4 rounded-full bg-stone-800 text-white text-[8px] leading-none"
                  >
                    {cartItemCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ═══ MOBILE NAV PANEL ═══ */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.48, ease: EASE_CINEMATIC }}
              className="md:hidden overflow-hidden backdrop-blur-xl bg-white/90 border-b border-white/20"
              aria-label="Mobile navigation"
            >
              <ul className="px-8 py-10 space-y-7">
                {NAV_LINKS.map((link, i) => (
                  <motion.li
                    key={link.href}
                    initial={{ opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...SPRING_BRISK, delay: i * 0.07 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-[10px] tracking-[0.34em] uppercase text-stone-500
                                 cursor-pointer hover:text-stone-900 transition-colors duration-500"
                    >
                      {link.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}
