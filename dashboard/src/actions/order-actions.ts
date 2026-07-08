"use server"

import { revalidatePath } from "next/cache"
import { requireDashboardUser } from "@/src/lib/auth/require-admin"
import { updateOrderStatus } from "@/src/lib/data/orders"
import type { Order, OrderStatus } from "@/src/lib/data/types"

const ORDER_STATUSES: readonly OrderStatus[] = ["pending", "shipped", "delivered", "returned", "exchanged"]

export async function updateOrderStatusAction(id: string, status: OrderStatus): Promise<Order | null> {
  await requireDashboardUser()
  if (!ORDER_STATUSES.includes(status)) throw new Error("Invalid order status.")
  const order = await updateOrderStatus(id, status)
  revalidatePath("/orders")
  revalidatePath(`/orders/${id}`)
  return order
}
