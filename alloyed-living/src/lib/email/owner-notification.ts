import "server-only"
import { Resend } from "resend"
import type { Order } from "@/src/lib/data/types"

// Notifies the shop owner/admin that there is something to verify: a new
// order was just placed, or a customer just submitted a payment receipt.
// Separate from every customer-facing email — this is owner-facing and
// includes the customer's contact details, so the owner can act on it.
//
// Recipient: ORDER_NOTIFICATION_EMAIL if set, else CONTACT_FORM_TO_EMAIL, else
// a built-in default — so alerts arrive without extra env config. "From" is
// ORDER_NOTIFICATION_FROM (falls back to EMAIL_FROM, then a resend.dev test
// sender), overridable separately from the customer-facing address.
const FROM_ADDRESS =
  process.env.ORDER_NOTIFICATION_FROM ??
  process.env.EMAIL_FROM ??
  "Alloyed Living <onboarding@resend.dev>"

const DEFAULT_OWNER_INBOX = "orders@alloyedliving.com"

export type OwnerNotificationReason = "new_order" | "receipt_submitted"

export interface OwnerNotificationResult {
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

function methodLabel(order: Order): string {
  if (order.paymentMethod === "cod") {
    const acct = order.depositAccount === "jazzcash" ? "JazzCash" : order.depositAccount === "ubl" ? "UBL" : "unknown account"
    return `Cash on Delivery — deposit via ${acct}`
  }
  if (order.paymentMethod === "ubl") return "Bank Transfer — UBL"
  if (order.paymentMethod === "jazzcash") return "Bank Transfer — JazzCash"
  return "—"
}

export async function sendOwnerOrderNotificationEmail(
  order: Order,
  opts: { reason: OwnerNotificationReason },
): Promise<OwnerNotificationResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("[owner-notification] Missing RESEND_API_KEY — cannot notify owner.")
    return { ok: false, error: "email not configured" }
  }

  const to =
    (process.env.ORDER_NOTIFICATION_EMAIL ?? process.env.CONTACT_FORM_TO_EMAIL ?? "").trim() ||
    DEFAULT_OWNER_INBOX

  const isNewOrder = opts.reason === "new_order"
  const heading = isNewOrder ? "New Order Placed" : "Receipt Submitted — Needs Review"
  const intro = isNewOrder
    ? `A new order has been placed and is awaiting payment.`
    : `A payment receipt has been submitted and is ready for you to verify.`

  const customer = order.customer
  const custName = escapeHtml(customer.name || "—")
  const custEmail = escapeHtml(customer.email || "—")
  const custPhone = customer.phone ? escapeHtml(customer.phone) : "—"

  const html = `
  <div style="background:#faf9f7;padding:32px;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ece9e4;">
      <div style="padding:28px 32px;border-bottom:1px solid #ece9e4;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:0.32em;text-transform:uppercase;color:#1c1917;">Alloyed Living</div>
        <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a29e;margin-top:6px;">${heading} · ${escapeHtml(order.id)}</div>
      </div>

      <div style="padding:24px 32px 8px;">
        <p style="font-size:15px;color:#292524;line-height:1.6;margin:0;">${intro}</p>
      </div>

      <div style="padding:8px 32px 20px;">
        <table style="width:100%;border-collapse:collapse;">
          ${detailRow("Customer", custName)}
          ${detailRow("Email", custEmail)}
          ${detailRow("Phone", custPhone)}
          ${detailRow("Payment", escapeHtml(methodLabel(order)))}
          ${detailRow("Amount Expected", pkr(order.payableAmount ?? order.total))}
          ${detailRow("Order Total", pkr(order.total))}
        </table>
      </div>
    </div>
    <div style="max-width:560px;margin:16px auto 0;text-align:center;">
      <span style="font-size:11px;color:#a8a29e;">Open the dashboard's Orders → New Orders tab to review.</span>
    </div>
  </div>`

  const text = [
    `Alloyed Living — ${heading}`,
    `Order: ${order.id}`,
    ``,
    intro,
    ``,
    `Customer: ${customer.name || "—"}`,
    `Email: ${customer.email || "—"}`,
    `Phone: ${customer.phone || "—"}`,
    `Payment: ${methodLabel(order)}`,
    `Amount expected: ${pkr(order.payableAmount ?? order.total)}`,
    `Order total: ${pkr(order.total)}`,
  ].join("\n")

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      ...(customer.email ? { replyTo: customer.email } : {}),
      subject: `${heading} — ${order.id} — Alloyed Living`,
      html,
      text,
    })
    if (error) {
      console.error(`[owner-notification] Resend error for order ${order.id}:`, error)
      return { ok: false, error: error.message || "send failed" }
    }
    return { ok: true }
  } catch (err) {
    console.error(`[owner-notification] Unexpected send failure for order ${order.id}:`, err)
    return { ok: false, error: "send failed" }
  }
}
