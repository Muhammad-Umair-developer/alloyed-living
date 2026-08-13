"use client"

import { useState } from "react"
import type { Order, OrderStatus } from "@/src/lib/data/types"
import CancelOrderDialog from "./CancelOrderDialog"

// Cancelling only makes sense for an order still in flight. Once it's
// cancelled, delivered, returned, or exchanged, there's nothing left to cancel.
const TERMINAL_STATUSES: readonly OrderStatus[] = ["cancelled", "delivered", "returned", "exchanged"]

export default function CancelOrderControl({ order }: { order: Order }) {
  const [open, setOpen] = useState(false)

  if (TERMINAL_STATUSES.includes(order.status)) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 text-[13px] font-medium text-[#7a3535] border border-[#7a3535]/25 rounded-md hover:bg-[#7a3535]/5 transition-colors duration-150 cursor-pointer"
      >
        Cancel Order
      </button>

      <CancelOrderDialog order={open ? order : null} onClose={() => setOpen(false)} />
    </>
  )
}
