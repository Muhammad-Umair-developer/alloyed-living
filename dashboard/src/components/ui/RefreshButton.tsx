"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { RotateCw } from "lucide-react"

// Soft-refreshes the current dashboard page: re-runs the route's server data
// fetch via router.refresh() WITHOUT a full browser reload. This keeps the
// in-memory auth session intact (a full reload would reset it and bounce the
// user to /login), and only refreshes this page — not the whole dashboard.
export default function RefreshButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleRefresh() {
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isPending}
      title="Refresh this page"
      aria-label="Refresh this page"
      className="inline-flex items-center gap-2 px-3 py-2 text-[12px] font-medium rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <RotateCw size={14} className={isPending ? "animate-spin" : ""} />
      <span className="hidden sm:inline">{isPending ? "Refreshing…" : "Refresh"}</span>
    </button>
  )
}
