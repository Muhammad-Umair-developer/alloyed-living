"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { User, LogOut } from "lucide-react"
import { useAuth } from "@/src/context/AuthContext"

const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]

// Small circular avatar — image if available, otherwise the user's initial.
function Avatar({ src, initial, size = 26 }: { src?: string | null; initial: string; size?: number }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={{ width: size, height: size }}
        className="rounded-full object-cover border border-stone-200"
      />
    )
  }
  return (
    <span
      style={{ width: size, height: size }}
      className="rounded-full bg-stone-900 text-white flex items-center justify-center
                 text-[10px] font-medium uppercase leading-none"
    >
      {initial}
    </span>
  )
}

export default function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { user, profile, displayName, signOut } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener("mousedown", onClick)
    return () => window.removeEventListener("mousedown", onClick)
  }, [])

  // Logged out (or still resolving) — keep the original account icon → /login.
  if (!user) {
    return (
      <Link href="/login" aria-label="Account" className={compact ? "p-1 cursor-pointer" : "group cursor-pointer"}>
        <User
          size={compact ? 19 : 17}
          strokeWidth={1.5}
          className={
            compact
              ? "text-stone-700 hover:text-stone-900 transition-colors duration-500"
              : "text-stone-500 transition-colors duration-500 group-hover:text-stone-900"
          }
        />
      </Link>
    )
  }

  const initial = (displayName?.[0] ?? "A").toUpperCase()

  async function handleLogout() {
    setLoggingOut(true)
    await signOut()
    setOpen(false)
    setLoggingOut(false)
    router.refresh()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2 cursor-pointer group"
      >
        <Avatar src={profile?.avatar_url} initial={initial} size={compact ? 26 : 26} />
        {!compact && (
          <span className="text-[9px] tracking-[0.22em] uppercase text-stone-600 group-hover:text-stone-900 transition-colors duration-500 max-w-[110px] truncate">
            {displayName}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE_CINEMATIC }}
            role="menu"
            className="absolute right-0 mt-3 w-56 z-50 backdrop-blur-xl bg-white/90
                       border border-stone-200/70 shadow-[0_8px_40px_rgba(0,0,0,0.10)] rounded-lg overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-stone-100">
              <p className="text-[11px] font-medium text-stone-900 truncate">{displayName}</p>
              {user.email && (
                <p className="text-[10px] tracking-[0.04em] text-stone-500 truncate mt-0.5">{user.email}</p>
              )}
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              role="menuitem"
              className="w-full flex items-center gap-2.5 px-4 py-3 text-left
                         text-[9px] tracking-[0.28em] uppercase text-stone-600
                         hover:bg-stone-50 hover:text-stone-900 transition-colors duration-300
                         cursor-pointer disabled:opacity-60"
            >
              <LogOut size={13} strokeWidth={1.5} />
              {loggingOut ? "Logging out…" : "Log out"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
