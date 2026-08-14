import "server-only"
import { sendViaResend } from "./resend-client"
import type { Order, OrderStatus } from "@/src/lib/data/types"

// Sent whenever an admin changes an order's fulfilment status
// (order-actions.ts, updateOrderStatusAction) — pending/shipped/delivered/
// returned/exchanged. NOT sent for 'cancelled' — that status is never
// reachable through updateOrderStatusAction (see ORDER_STATUSES there); the
// cancellation flow has its own emails. Same Resend channel, layout and
// branding as the dashboard's other order emails.
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Alloyed Living <onboarding@resend.dev>"

export interface StatusChangedEmailResult {
  ok: boolean
  error?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// Title-case label + a short human-readable line per status. 'cancelled' is
// included only so this Record type-checks exhaustively against OrderStatus —
// it is never actually reached by the caller.
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:   "Pending",
  shipped:   "Shipped",
  delivered: "Delivered",
  returned:  "Returned",
  exchanged: "Exchanged",
  cancelled: "Cancelled",
}

const STATUS_LINES: Record<OrderStatus, string> = {
  pending:   "Your order is being prepared.",
  shipped:   "Your order is on its way.",
  delivered: "Your order has been delivered.",
  returned:  "Your order has been marked as returned.",
  exchanged: "Your order has been marked as exchanged.",
  cancelled: "Your order has been cancelled.",
}

export async function sendOrderStatusChangedEmail(
  order: Order,
  opts: { newStatus: OrderStatus },
): Promise<StatusChangedEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("[order-status-email] Missing RESEND_API_KEY — cannot send status-change email.")
    return { ok: false, error: "email not configured" }
  }

  const to = (order.customer?.email ?? "").trim()
  if (!to) {
    console.error(`[order-status-email] Order ${order.id} has no customer email; skipping.`)
    return { ok: false, error: "no recipient" }
  }

  const { newStatus } = opts
  const name = escapeHtml(order.customer.name || "there")
  const label = STATUS_LABELS[newStatus]
  const isDelivered = newStatus === "delivered"

  // 'delivered' gets a proper thank-you close instead of the one-line status
  // update every other status uses — this is the end of the order's journey,
  // so it's worth a warmer sign-off. Matches the tone/quality of
  // bank-order-received.ts's greeting, extended into a short closing note.
  const bodyHtml = isDelivered
    ? `
        <p style="font-size:15px;color:#292524;line-height:1.6;margin:0 0 8px;">Dear ${name},</p>
        <p style="font-size:13px;color:#57534e;line-height:1.7;margin:0 0 16px;">
          Your order has arrived — we hope it's exactly as you pictured it.
        </p>
        <p style="font-size:13px;color:#57534e;line-height:1.7;margin:0 0 16px;">
          Thank you for choosing Alloyed Living. Every piece we make is built to become part of
          your everyday life, and we're grateful you welcomed ours into your home.
        </p>
        <p style="font-size:13px;color:#57534e;line-height:1.7;margin:0;">
          If anything isn't quite right, simply reply to this email — we're always happy to help.
        </p>`
    : `
        <p style="font-size:15px;color:#292524;line-height:1.6;margin:0 0 8px;">Dear ${name},</p>
        <p style="font-size:13px;color:#57534e;line-height:1.7;margin:0;">
          ${escapeHtml(STATUS_LINES[newStatus])}
        </p>`

  const html = `
  <div style="background:#faf9f7;padding:32px;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ece9e4;">
      <div style="padding:28px 32px;border-bottom:1px solid #ece9e4;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:0.32em;text-transform:uppercase;color:#1c1917;">Alloyed Living</div>
        <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a29e;margin-top:6px;">Order ${label} · ${escapeHtml(order.id)}</div>
      </div>

      <div style="padding:28px 32px;">
        ${bodyHtml}
      </div>
    </div>
    <div style="max-width:560px;margin:16px auto 0;text-align:center;">
      <span style="font-size:11px;color:#a8a29e;">Questions? Just reply to this email.</span>
    </div>
  </div>`

  const bodyTextLines = isDelivered
    ? [
        `Dear ${order.customer.name || "there"},`,
        ``,
        `Your order has arrived — we hope it's exactly as you pictured it.`,
        ``,
        `Thank you for choosing Alloyed Living. Every piece we make is built to become part of`,
        `your everyday life, and we're grateful you welcomed ours into your home.`,
        ``,
        `If anything isn't quite right, simply reply to this email — we're always happy to help.`,
      ]
    : [`Dear ${order.customer.name || "there"},`, ``, STATUS_LINES[newStatus]]

  const text = [`Alloyed Living — Order ${label}`, `Order: ${order.id}`, ``, ...bodyTextLines].join("\n")

  const result = await sendViaResend(apiKey, {
    from: FROM_ADDRESS,
    to,
    subject: `Order ${label.toLowerCase()} — order ${order.id} — Alloyed Living`,
    html,
    text,
  })
  if (!result.ok) {
    console.error(`[order-status-email] Resend error for order ${order.id}:`, result.error)
  }
  return result
}
