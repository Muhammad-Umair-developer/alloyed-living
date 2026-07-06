"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { wasAuthedThisLoad } from "@/src/lib/auth/load-guard"

// Client gate for the authenticated dashboard area. The proxy already enforces
// the server-side session + admin-role check; this adds the "fresh login on
// every reload" rule: a session restored from a previous page load is not
// enough to enter — the user must have signed in during THIS load. On a reload
// (load-guard flag reset) we route to /login and show a quiet splash instead of
// briefly flashing dashboard content.
export default function DashboardGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    if (wasAuthedThisLoad()) {
      setAllowed(true)
      return
    }
    router.replace("/login")
  }, [router])

  if (!allowed) {
    return (
      <div className="min-h-screen grid place-items-center bg-[var(--background)]">
        <Loader2 size={18} className="animate-spin text-stone-400" />
      </div>
    )
  }

  return <>{children}</>
}
