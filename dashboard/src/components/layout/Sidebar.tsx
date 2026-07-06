"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  BarChart3,
  Settings,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { useAuth } from "@/src/context/AuthContext"

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/products", label: "Products", icon: Package, exact: false },
  { href: "/orders", label: "Orders", icon: ShoppingCart, exact: false },
  { href: "/content", label: "Content Pages", icon: FileText, exact: false },
  { href: "/analytics", label: "Analytics", icon: BarChart3, exact: false },
] as const

// Set NEXT_PUBLIC_STOREFRONT_URL in production (e.g. https://alloyedliving.com);
// falls back to the local dev storefront.
const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000"

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { displayName, user, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  async function handleLogout() {
    await signOut()
    router.replace("/login")
    router.refresh()
  }

  return (
    <>
      {/* ── Mobile top bar ── */}
      <header className="lg:hidden fixed inset-x-0 top-0 z-40 flex items-center justify-between h-14 px-4 border-b border-stone-200 bg-white/90 backdrop-blur-md">
        <div className="leading-tight">
          <p className="text-[13px] font-semibold tracking-tight text-stone-900">Alloyed Living</p>
          <p className="text-[9px] tracking-[0.2em] uppercase text-stone-400">Admin Dashboard</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="p-2 -mr-2 rounded-md text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <Menu size={20} strokeWidth={1.75} />
        </button>
      </header>

      {/* ── Mobile backdrop ── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-stone-950/40 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* ── Sidebar / drawer ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 lg:w-60 flex flex-col border-r border-stone-200 bg-white
          transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
        `}
      >
        {/* Wordmark + mobile close */}
        <div className="flex items-start justify-between px-6 pt-7 pb-6">
          <div>
            <p className="text-[13px] font-semibold tracking-tight text-stone-900">Alloyed Living</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mt-0.5">Admin Dashboard</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="lg:hidden p-1.5 -mr-1.5 -mt-1 rounded-md text-stone-500 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto" aria-label="Dashboard navigation">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(pathname, href, exact)
            return (
              <Link
                key={href}
                href={href}
                className={`
                  group relative flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px]
                  transition-colors duration-200
                  ${active
                    ? "bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"}
                `}
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[var(--accent)]" />
                )}
                <Icon size={16} strokeWidth={1.75} className={active ? "text-[var(--accent)]" : "text-stone-400 group-hover:text-stone-600"} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-4 pt-3 border-t border-stone-100 space-y-0.5">
          <Link
            href="/settings"
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] transition-colors duration-200
              ${isActive(pathname, "/settings")
                ? "bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"}
            `}
          >
            <Settings size={16} strokeWidth={1.75} className="text-stone-400" />
            Settings
          </Link>
          <a
            href={STOREFRONT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] text-stone-500 hover:bg-stone-50 hover:text-stone-900 transition-colors duration-200"
          >
            <ExternalLink size={16} strokeWidth={1.75} className="text-stone-400" />
            View Storefront
          </a>
        </div>

        {/* Account */}
        <div className="px-3 pb-4 pt-3 border-t border-stone-100">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <span className="w-7 h-7 flex-shrink-0 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-[11px] font-medium uppercase">
              {(displayName?.[0] ?? "A").toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-stone-800 truncate">{displayName}</p>
              {user?.email && <p className="text-[10px] text-stone-400 truncate">{user.email}</p>}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-1 w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors duration-200 cursor-pointer"
          >
            <LogOut size={16} strokeWidth={1.75} className="text-stone-400" />
            Log out
          </button>
        </div>
      </aside>
    </>
  )
}
