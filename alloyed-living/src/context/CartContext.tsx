"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { trackAddToCartAction } from "@/src/actions/store-actions"

const STORAGE_KEY = "alloyed-living:cart"

// ─── Shared CartItem type ─────────────────────────────────────────────────────

export interface CartItem {
  id: string
  name: string
  material?: string
  price: number
  quantity: number
  image?: string
}

// ─── Context shape ────────────────────────────────────────────────────────────

interface CartContextValue {
  cart:           CartItem[]
  cartCount:      number
  addToCart:      (item: Omit<CartItem, "quantity">) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, delta: number) => void
  clearCart:      () => void
}

const CartContext = createContext<CartContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const hydrated = useRef(false)

  // Hydrate once from localStorage on mount, so the cart survives hard
  // reloads / full-page redirects (e.g. the Google OAuth round trip), not
  // just client-side (SPA) navigation.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) setCart(JSON.parse(raw))
    } catch {
      // Corrupt or inaccessible storage — start with an empty cart.
    } finally {
      hydrated.current = true
    }
  }, [])

  // Persist on every change, skipping the pre-hydration initial render so we
  // don't clobber storage with the empty initial state before it's loaded.
  useEffect(() => {
    if (!hydrated.current) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
    } catch {
      // Storage unavailable (e.g. private browsing quota) — nothing to do.
    }
  }, [cart])

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const addToCart = useCallback((item: Omit<CartItem, "quantity">) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
    // Fire-and-forget analytics — never block the cart interaction on it.
    trackAddToCartAction(item.id).catch(() => {})
  }, [])

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const updateQuantity = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    )
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  return (
    <CartContext.Provider
      value={{ cart, cartCount, addToCart, removeFromCart, updateQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>")
  return ctx
}
