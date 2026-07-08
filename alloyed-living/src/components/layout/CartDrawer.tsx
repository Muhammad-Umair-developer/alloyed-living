"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, ShoppingBag, ArrowRight, Minus, Plus } from "lucide-react"
import Link from "next/link"
import { useCart } from "@/src/context/CartContext"

// Re-export so existing imports elsewhere continue to resolve.
export type { CartItem } from "@/src/context/CartContext"

interface CartDrawerProps {
  isOpen:  boolean
  onClose: () => void
}

const DRAWER_SPRING = { type: "spring", stiffness: 350, damping: 38, mass: 1 } as const
const BACKDROP_EASE = { duration: 0.38, ease: [0.16, 1, 0.3, 1] } as const
const EDITORIAL = { fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)" }

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cart, cartCount, removeFromCart, updateQuantity } = useCart()
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dim overlay */}
          <motion.div
            key="cart-backdrop"
            className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[2px]"
            style={{ willChange: "opacity" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={BACKDROP_EASE}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.aside
            key="cart-panel"
            role="dialog"
            aria-label="Shopping bag"
            aria-modal="true"
            className="fixed top-0 right-0 z-[70] h-full w-[95%] lg:w-[35%] flex flex-col
                       backdrop-blur-lg bg-white/50 border-l border-white/20
                       shadow-[-28px_0_80px_rgba(0,0,0,0.07)]"
            style={{ willChange: "transform" }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={DRAWER_SPRING}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-8 pt-9 pb-7 border-b border-stone-100/60">
              <p className="text-[9px] tracking-[0.42em] uppercase text-stone-700 font-light">
                Shopping Bag
                {cartCount > 0 && (
                  <span className="ml-3 text-stone-500">({cartCount})</span>
                )}
              </p>
              <button
                onClick={onClose}
                aria-label="Close shopping bag"
                className="w-7 h-7 flex items-center justify-center rounded-full
                           text-stone-600 hover:text-stone-800 hover:bg-stone-100/70
                           transition-colors duration-300 cursor-pointer"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>

            {/* ── Item list / Empty state ── */}
            <div className="flex-1 overflow-y-auto px-8 py-8 overscroll-contain">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-8 text-center">
                  {/* Pulsing bag icon */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center">
                      <ShoppingBag size={26} strokeWidth={1} className="text-stone-500" />
                    </div>
                    <motion.div
                      className="absolute inset-0 rounded-full border border-stone-100"
                      animate={{ scale: [1, 1.22, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] tracking-[0.32em] uppercase text-stone-500">
                      Your bag is empty
                    </p>
                    <p
                      className="text-sm text-stone-500 font-light leading-relaxed max-w-[200px] mx-auto"
                      style={EDITORIAL}
                    >
                      Browse our handcrafted collection made for the modern home
                    </p>
                  </div>

                  <Link
                    href="/shop"
                    onClick={onClose}
                    className="group flex items-center gap-2.5 text-[9px] tracking-[0.32em] uppercase
                               text-stone-600 border-b border-stone-200 pb-0.5
                               hover:border-stone-700 hover:text-stone-800 transition-all duration-500
                               cursor-pointer"
                  >
                    Browse Collection
                    <ArrowRight
                      size={10}
                      strokeWidth={1.5}
                      className="transition-transform duration-500 group-hover:translate-x-1"
                    />
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-stone-50">
                  <AnimatePresence initial={false}>
                    {cart.map((item, i) => (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 24 }}
                        transition={{ ...DRAWER_SPRING, delay: i * 0.04 }}
                        className="flex gap-5 py-8 first:pt-0 last:pb-0"
                      >
                        {/* Thumbnail */}
                        <div className="w-20 h-24 rounded-sm bg-stone-50 shrink-0 overflow-hidden">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-stone-50 to-stone-100" />
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p
                                className="text-sm tracking-[0.04em] text-stone-700 leading-snug"
                                style={EDITORIAL}
                              >
                                {item.name}
                              </p>
                              {item.material && (
                                <p className="mt-1 text-[9px] tracking-[0.22em] uppercase text-stone-600">
                                  {item.material}
                                </p>
                              )}
                            </div>

                            {/* Remove */}
                            <button
                              onClick={() => removeFromCart(item.id)}
                              aria-label={`Remove ${item.name}`}
                              className="flex-shrink-0 w-5 h-5 flex items-center justify-center
                                         text-stone-500 hover:text-stone-700
                                         transition-colors duration-300 cursor-pointer"
                            >
                              <X size={12} strokeWidth={1.5} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            {/* Quantity stepper */}
                            <div className="flex items-center gap-3 border border-stone-100 rounded-full px-3 py-1">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                aria-label="Decrease quantity"
                                className="text-stone-600 hover:text-stone-700 transition-colors
                                           duration-300 leading-none flex items-center justify-center
                                           w-3 h-3 cursor-pointer"
                              >
                                <Minus size={9} strokeWidth={2} />
                              </button>
                              <span className="text-[10px] text-stone-500 tracking-wide min-w-[1rem] text-center tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                aria-label="Increase quantity"
                                className="text-stone-600 hover:text-stone-700 transition-colors
                                           duration-300 leading-none flex items-center justify-center
                                           w-3 h-3 cursor-pointer"
                              >
                                <Plus size={9} strokeWidth={2} />
                              </button>
                            </div>

                            <p className="text-xs text-stone-600 tracking-wide tabular-nums">
                              PKR {(item.price * item.quantity).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {/* ── Footer ── */}
            <AnimatePresence>
              {cart.length > 0 && (
                <motion.div
                  key="cart-footer"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ ...DRAWER_SPRING, delay: 0.08 }}
                  style={{ willChange: "transform, opacity" }}
                  className="px-8 pb-10 pt-7 border-t border-stone-100/60 space-y-5"
                >
                  <div className="flex justify-between items-baseline">
                    <span className="text-[9px] tracking-[0.32em] uppercase text-stone-700">Subtotal</span>
                    <span
                      className="text-base text-stone-700 font-light tracking-wide tabular-nums"
                      style={EDITORIAL}
                    >
                      PKR {total.toLocaleString()}
                    </span>
                  </div>

                  <p className="text-[9px] text-stone-500 tracking-wide">
                    Shipping and taxes will be shown at checkout
                  </p>

                  <Link
                    href="/checkout"
                    onClick={onClose}
                    className="group w-full py-4 bg-stone-900 text-white text-[9px] tracking-[0.38em] uppercase
                               flex items-center justify-center gap-3
                               hover:bg-stone-700 transition-colors duration-500 cursor-pointer"
                  >
                    Proceed to Checkout
                    <ArrowRight
                      size={10}
                      strokeWidth={1.5}
                      className="transition-transform duration-500 group-hover:translate-x-1.5"
                    />
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
