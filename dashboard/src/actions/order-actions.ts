"use server"

import { revalidatePath } from "next/cache"
import { requireDashboardUser } from "@/src/lib/auth/require-admin"
import { getOrder, getOrderReceiptSignedUrl, updateOrderStatus, type ReceiptSignedUrl } from "@/src/lib/data/orders"
import { applyPaymentTransition } from "@/src/lib/payments/transitions"
import { sendOrderConfirmationEmail } from "@/src/lib/email/order-confirmation"
import { sendBankPaymentRejectedEmail } from "@/src/lib/email/bank-payment-rejected"
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

// ── Payment verification ────────────────────────────────────────────────────
// SECURITY: no order can reach payment_verified without passing through here.
// requireDashboardUser() runs first and throws for any non-admin caller — its
// error is safe to surface to the client. applyPaymentTransition re-reads the
// order's CURRENT payment_status from the database (never trusting anything
// cached on the client) and only allows payment_submitted -> payment_verified;
// the DB trigger enforces the same rule as a second, independent backstop.

export interface ApprovePaymentResult {
  ok: boolean
  error?: string
}

export async function approvePaymentAction(orderId: string): Promise<ApprovePaymentResult> {
  const { userId } = await requireDashboardUser()

  const order = await getOrder(orderId)
  if (!order) return { ok: false, error: "Order not found." }

  try {
    await applyPaymentTransition(orderId, "payment_verified", {
      payment_verified_by: userId,
      payment_verified_at: new Date().toISOString(),
    })
  } catch (e) {
    console.error("[approvePaymentAction] transition failed:", e)
    return { ok: false, error: e instanceof Error ? e.message : "Could not verify this payment." }
  }

  // Same confirmation email a COD order currently receives, in the bank/COD-
  // deposit variant. Non-blocking: an email failure must never undo the
  // verification that already committed to the database.
  if (order.paymentMethod) {
    try {
      await sendOrderConfirmationEmail(order, { method: order.paymentMethod })
    } catch (e) {
      console.error("[approvePaymentAction] confirmation email failed:", e)
    }
  }

  revalidatePath("/orders")
  revalidatePath(`/orders/${orderId}`)
  return { ok: true }
}

export interface RejectPaymentResult {
  ok: boolean
  error?: string
}

export async function rejectPaymentAction(orderId: string, reason: string): Promise<RejectPaymentResult> {
  await requireDashboardUser()

  const trimmed = reason.trim().slice(0, 500)
  if (!trimmed) return { ok: false, error: "Please provide a reason for rejecting this payment." }

  const order = await getOrder(orderId)
  if (!order) return { ok: false, error: "Order not found." }

  try {
    await applyPaymentTransition(orderId, "payment_rejected", {
      payment_rejection_reason: trimmed,
    })
  } catch (e) {
    console.error("[rejectPaymentAction] transition failed:", e)
    return { ok: false, error: e instanceof Error ? e.message : "Could not reject this payment." }
  }

  try {
    await sendBankPaymentRejectedEmail(order, { reason: trimmed })
  } catch (e) {
    console.error("[rejectPaymentAction] rejection email failed:", e)
  }

  revalidatePath("/orders")
  revalidatePath(`/orders/${orderId}`)
  return { ok: true }
}

// Short-TTL signed URL for the receipt in the PRIVATE payment-receipts bucket.
// Admin-gated — the bucket itself has no public/anon policy, so this is the
// only way to view a receipt.
export async function getReceiptSignedUrlAction(orderId: string): Promise<ReceiptSignedUrl | null> {
  await requireDashboardUser()
  const order = await getOrder(orderId)
  if (!order?.paymentReceiptPath) return null
  return getOrderReceiptSignedUrl(order.paymentReceiptPath)
}
