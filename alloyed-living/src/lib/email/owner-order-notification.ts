import "server-only"
import { Resend } from "resend"
import type { Order } from "@/src/lib/data/types"

// Notifies the shop owner that a NEW order has come in, so they can begin
// fulfilment. This is separate from the customer's order-confirmation email
// (src/lib/email/order-confirmation.ts) and is owner-facing: it includes the
// customer's contact details and delivery address. Sent via the same Resend
// channel the customer email and contact form already use.
//
// Server-only: RESEND_API_KEY is read from the environment and never reaches
// the client. The recipient is the owner inbox: ORDER_NOTIFICATION_EMAIL if set,
// else CONTACT_FORM_TO_EMAIL, else the default owner inbox below — so new-order
// alerts arrive without any extra env config.
//
// The `from` address must be on a domain verified in Resend. New-order alerts
// are sent FROM the orders@ inbox (not the customer-facing no-reply@ used by
// EMAIL_FROM), overridable via ORDER_NOTIFICATION_FROM. Both live on the same
// verified alloyedliving.com domain, so deliverability is unchanged.
const FROM_ADDRESS = process.env.ORDER_NOTIFICATION_FROM ?? "Alloyed Living <orders@alloyedliving.com>"

// Owner inbox that receives new-order alerts when no override env var is set.
const DEFAULT_OWNER_INBOX = "orders@alloyedliving.com"

export interface OwnerOrderEmailResult {
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

function itemRow(name: string, qty: number, lineTotal: string): string {
  return `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #ece9e4;vertical-align:top;">
        <span style="font-size:14px;color:#292524;line-height:1.5;">${name}</span>
        <span style="display:block;font-size:11px;color:#a8a29e;margin-top:2px;">Qty ${qty}</span>
      </td>
      <td style="padding:14px 0;border-bottom:1px solid #ece9e4;vertical-align:top;text-align:right;white-space:nowrap;">
        <span style="font-size:13px;color:#292524;">${lineTotal}</span>
      </td>
    </tr>`
}

function detailRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #ece9e4;vertical-align:top;width:150px;">
        <span style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a29e;">${label}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #ece9e4;vertical-align:top;">
        <span style="font-size:14px;color:#292524;line-height:1.6;">${value}</span>
      </td>
    </tr>`
}

export async function sendOwnerOrderNotificationEmail(
  order: Order,
  opts: { method: "safepay" | "cod"; paid: boolean },
): Promise<OwnerOrderEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("[owner-order-email] Missing RESEND_API_KEY — cannot notify owner.")
    return { ok: false, error: "email not configured" }
  }

  const to =
    (process.env.ORDER_NOTIFICATION_EMAIL ?? process.env.CONTACT_FORM_TO_EMAIL ?? "").trim() ||
    DEFAULT_OWNER_INBOX

  const { method, paid } = opts
  const paymentLabel = method === "cod" ? "Cash on Delivery" : "Safepay"
  const paymentStatus = method === "cod" ? "Payable on delivery" : paid ? "Paid" : "Awaiting payment"

  const customer = order.customer
  const custName = escapeHtml(customer.name || "—")
  const custEmail = escapeHtml(customer.email || "—")
  const custPhone = customer.phone ? escapeHtml(customer.phone) : "—"

  const itemsHtml = order.items
    .map((i) => itemRow(escapeHtml(i.name), i.quantity, pkr(i.price * i.quantity)))
    .join("")

  const addr = order.shippingAddress
  const addressLine = [addr.street, addr.city, addr.province, addr.postalCode, addr.country]
    .filter(Boolean)
    .map((p) => escapeHtml(String(p)))
    .join(", ")

  const html = `
  <div style="background:#faf9f7;padding:32px;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ece9e4;">
      <div style="padding:28px 32px;border-bottom:1px solid #ece9e4;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:0.32em;text-transform:uppercase;color:#1c1917;">Alloyed Living</div>
        <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a29e;margin-top:6px;">New Order · ${escapeHtml(order.id)}</div>
      </div>

      <div style="padding:24px 32px 8px;">
        <p style="font-size:15px;color:#292524;line-height:1.6;margin:0;">A new order has been placed.</p>
      </div>

      <div style="padding:8px 32px 8px;">
        <table style="width:100%;border-collapse:collapse;">
          ${detailRow("Customer", custName)}
          ${detailRow("Email", custEmail)}
          ${detailRow("Phone", custPhone)}
          ${detailRow("Deliver To", addressLine || "—")}
          ${detailRow("Payment", `${escapeHtml(paymentLabel)} — ${escapeHtml(paymentStatus)}`)}
        </table>
      </div>

      <div style="padding:16px 32px 4px;">
        <span style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a29e;">Items</span>
        <table style="width:100%;border-collapse:collapse;margin-top:6px;">${itemsHtml}</table>
      </div>

      <div style="padding:8px 32px 28px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;"><span style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#78716c;">Subtotal</span></td>
            <td style="padding:6px 0;text-align:right;"><span style="font-size:13px;color:#1c1917;">${pkr(order.subtotal)}</span></td>
          </tr>
          <tr>
            <td style="padding:6px 0;"><span style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#78716c;">Delivery</span></td>
            <td style="padding:6px 0;text-align:right;"><span style="font-size:13px;color:#1c1917;">${order.delivery === 0 ? "Complimentary" : pkr(order.delivery)}</span></td>
          </tr>
          <tr>
            <td style="padding:6px 0;"><span style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#78716c;">Total</span></td>
            <td style="padding:6px 0;text-align:right;"><span style="font-size:15px;font-weight:600;color:#1c1917;">${pkr(order.total)}</span></td>
          </tr>
        </table>
      </div>
    </div>
    <div style="max-width:560px;margin:16px auto 0;text-align:center;">
      <span style="font-size:11px;color:#a8a29e;">Reply to this email to reach ${custName} directly.</span>
    </div>
  </div>`

  const textLines = [
    `Alloyed Living — New Order`,
    `Order: ${order.id}`,
    ``,
    `Customer: ${customer.name || "—"}`,
    `Email: ${customer.email || "—"}`,
    `Phone: ${customer.phone || "—"}`,
    `Deliver to: ${[addr.street, addr.city, addr.province, addr.postalCode, addr.country].filter(Boolean).join(", ")}`,
    `Payment: ${paymentLabel} — ${paymentStatus}`,
    ``,
    `Items:`,
    ...order.items.map((i) => `  - ${i.name} × ${i.quantity} — ${pkr(i.price * i.quantity)}`),
    ``,
    `Subtotal: ${pkr(order.subtotal)}`,
    `Delivery: ${order.delivery === 0 ? "Complimentary" : pkr(order.delivery)}`,
    `Total: ${pkr(order.total)}`,
  ]

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      // Let the owner reply straight to the customer.
      ...(customer.email ? { replyTo: customer.email } : {}),
      subject: `New order ${order.id} — ${customer.name || "customer"} — ${pkr(order.total)}`,
      html,
      text: textLines.join("\n"),
    })
    if (error) {
      console.error(`[owner-order-email] Resend error for order ${order.id}:`, error)
      return { ok: false, error: error.message || "send failed" }
    }
    return { ok: true }
  } catch (err) {
    console.error(`[owner-order-email] Unexpected send failure for order ${order.id}:`, err)
    return { ok: false, error: "send failed" }
  }
}
