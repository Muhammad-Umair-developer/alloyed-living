import "server-only"
import { Resend } from "resend"
import type { Order } from "@/src/lib/data/types"

// Notifies the shop owner/admin that an order was cancelled. Owner-facing —
// mirrors owner-notification.ts exactly: same recipient resolution, same
// Resend-package channel, same layout/branding. Currently only ever called
// for CUSTOMER-initiated cancellations (cancelOrderByToken/cancelOrderByUser
// in store-actions.ts) — an admin who just cancelled an order themselves
// doesn't need an email telling them what they did, so cancelOrderAction in
// the dashboard does not call this. `initiatedBy` stays a real parameter
// (not hardcoded) so wiring in the admin path later, if ever wanted, is a
// one-line addition rather than a rewrite.
const FROM_ADDRESS =
  process.env.ORDER_NOTIFICATION_FROM ??
  process.env.EMAIL_FROM ??
  "Alloyed Living <onboarding@resend.dev>"

const DEFAULT_OWNER_INBOX = "orders@alloyedliving.com"

export type CancellationInitiator = "customer" | "admin"

export interface CancellationNotificationResult {
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

function pkr(n: number): string {
  return `PKR ${Math.round(n).toLocaleString("en-PK")}`
}

function detailRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #ece9e4;vertical-align:top;width:150px;">
        <span style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a29e;">${label}</span>
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #ece9e4;vertical-align:top;">
        <span style="font-size:13px;color:#292524;line-height:1.6;">${value}</span>
      </td>
    </tr>`
}

export async function sendCancellationNotificationEmail(
  order: Order,
  opts: { initiatedBy: CancellationInitiator },
): Promise<CancellationNotificationResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("[cancellation-notification] Missing RESEND_API_KEY — cannot notify owner.")
    return { ok: false, error: "email not configured" }
  }

  const to =
    (process.env.ORDER_NOTIFICATION_EMAIL ?? process.env.CONTACT_FORM_TO_EMAIL ?? "").trim() ||
    DEFAULT_OWNER_INBOX

  const initiatorLabel = opts.initiatedBy === "admin" ? "Admin" : "Customer"
  const customer = order.customer
  const custName = escapeHtml(customer.name || "—")
  const custEmail = escapeHtml(customer.email || "—")
  const refundAmount = order.refundAmount != null ? pkr(order.refundAmount) : "—"
  const refundStatus = order.refundStatus ? escapeHtml(order.refundStatus) : "—"
  const reason = escapeHtml(order.cancellationReason || "—")

  const html = `
  <div style="background:#faf9f7;padding:32px;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ece9e4;">
      <div style="padding:28px 32px;border-bottom:1px solid #ece9e4;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:0.32em;text-transform:uppercase;color:#1c1917;">Alloyed Living</div>
        <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a29e;margin-top:6px;">Order Cancelled · ${escapeHtml(order.id)}</div>
      </div>

      <div style="padding:24px 32px 8px;">
        <p style="font-size:15px;color:#292524;line-height:1.6;margin:0;">
          Order ${escapeHtml(order.id)} was cancelled by the ${initiatorLabel.toLowerCase()}.
        </p>
      </div>

      <div style="padding:8px 32px 20px;">
        <table style="width:100%;border-collapse:collapse;">
          ${detailRow("Initiated By", initiatorLabel)}
          ${detailRow("Customer", custName)}
          ${detailRow("Email", custEmail)}
          ${detailRow("Refund Amount", refundAmount)}
          ${detailRow("Refund Status", refundStatus)}
          ${detailRow("Reason", reason)}
        </table>
      </div>
    </div>
    <div style="max-width:560px;margin:16px auto 0;text-align:center;">
      <span style="font-size:11px;color:#a8a29e;">Open the dashboard's order page to process the refund.</span>
    </div>
  </div>`

  const text = [
    `Alloyed Living — Order Cancelled`,
    `Order: ${order.id}`,
    ``,
    `Order ${order.id} was cancelled by the ${initiatorLabel.toLowerCase()}.`,
    ``,
    `Initiated by: ${initiatorLabel}`,
    `Customer: ${customer.name || "—"}`,
    `Email: ${customer.email || "—"}`,
    `Refund amount: ${refundAmount}`,
    `Refund status: ${order.refundStatus || "—"}`,
    `Reason: ${order.cancellationReason || "—"}`,
  ].join("\n")

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      ...(customer.email ? { replyTo: customer.email } : {}),
      subject: `Order Cancelled — ${order.id} — Alloyed Living`,
      html,
      text,
    })
    if (error) {
      console.error(`[cancellation-notification] Resend error for order ${order.id}:`, error)
      return { ok: false, error: error.message || "send failed" }
    }
    return { ok: true }
  } catch (err) {
    console.error(`[cancellation-notification] Unexpected send failure for order ${order.id}:`, err)
    return { ok: false, error: "send failed" }
  }
}
