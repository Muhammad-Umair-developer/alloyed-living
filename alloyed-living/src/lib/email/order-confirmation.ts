import "server-only"
import { Resend } from "resend"
import type { Order } from "@/src/lib/data/types"

// Sends the customer an order-summary email (product details, totals, delivery
// address) via Resend — the same channel used for the contact form and Supabase
// auth mails. This is SEPARATE from Safepay's own payment receipt: on a paid
// Safepay order the shopper receives both (Safepay's receipt + this summary); on
// a COD order they receive only this summary.
//
// Server-only: RESEND_API_KEY is read from the environment and never reaches the
// client. The `from` address must be on a domain verified in your Resend account.
// Set EMAIL_FROM in production; the resend.dev fallback only delivers to your own
// Resend account email.[cite: 3]
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Alloyed Living <onboarding@resend.dev>"

export type OrderEmailMethod = "safepay" | "cod"

export interface OrderEmailResult {
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

function totalRow(label: string, value: string, strong = false): string {
  const weight = strong ? "600" : "400"
  const size = strong ? "15px" : "13px"
  return `
    <tr>
      <td style="padding:6px 0;">
        <span style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#78716c;">${label}</span>
      </td>
      <td style="padding:6px 0;text-align:right;">
        <span style="font-size:${size};font-weight:${weight};color:#1c1917;">${value}</span>
      </td>
    </tr>`
}

export async function sendOrderConfirmationEmail(
  order: Order,
  opts: { method: OrderEmailMethod; paid: boolean },
): Promise<OrderEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("[order-email] Missing RESEND_API_KEY — cannot send order confirmation.")
    return { ok: false, error: "email not configured" }
  }

  const to = (order.customer?.email ?? "").trim()
  if (!to) {
    console.error(`[order-email] Order ${order.id} has no customer email; skipping.`)
    return { ok: false, error: "no recipient" }
  }

  // Warning for production developers tracking telemetry configs
  if (FROM_ADDRESS.includes("onboarding@resend.dev") && process.env.NODE_ENV === "production") {
    console.warn(
      `[order-email] WARNING: Using Resend onboarding fallback address in production. Deliveries to external customers like (${to}) will fail until process.env.EMAIL_FROM is properly configured.`
    );
  }

  const { method, paid } = opts
  const name = escapeHtml(order.customer.name || "there")

  const itemsHtml = order.items
    .map((i) => itemRow(escapeHtml(i.name), i.quantity, pkr(i.price * i.quantity)))
    .join("")

  const addr = order.shippingAddress
  const addressLine = [addr.street, addr.city, addr.province, addr.postalCode, addr.country]
    .filter(Boolean)
    .map((p) => escapeHtml(String(p)))
    .join(", ")

  const paymentLabel = method === "cod" ? "Cash on Delivery" : "Safepay"
  const statusLine =
    method === "cod"
      ? "Payable in cash on delivery — nothing was charged online."
      : paid
        ? "Payment received — a separate receipt has been sent to you by Safepay."
        : "Awaiting payment confirmation from Safepay."

  const heading = method === "cod" ? "Order Received" : paid ? "Payment Confirmed" : "Order Received"

  const html = `
  <div style="background:#faf9f7;padding:32px;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ece9e4;">
      <div style="padding:28px 32px;border-bottom:1px solid #ece9e4;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:0.32em;text-transform:uppercase;color:#1c1917;">Alloyed Living</div>
        <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a29e;margin-top:6px;">${heading} · ${escapeHtml(order.id)}</div>
      </div>

      <div style="padding:28px 32px 8px;">
        <p style="font-size:15px;color:#292524;line-height:1.6;margin:0 0 8px;">Dear ${name},</p>
        <p style="font-size:13px;color:#57534e;line-height:1.7;margin:0;">
          Thank you for your order. ${escapeHtml(statusLine)} A summary of your purchase is below.
        </p>
      </div>

      <div style="padding:12px 32px 8px;">
        <table style="width:100%;border-collapse:collapse;">${itemsHtml}</table>
      </div>

      <div style="padding:8px 32px 20px;">
        <table style="width:100%;border-collapse:collapse;">
          ${totalRow("Subtotal", pkr(order.subtotal))}
          ${totalRow("Delivery", order.delivery === 0 ? "Complimentary" : pkr(order.delivery))}
          ${totalRow("Total", pkr(order.total), true)}
        </table>
      </div>

      <div style="padding:0 32px 28px;">
        <div style="border-top:1px solid #ece9e4;padding-top:18px;">
          <span style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a29e;">Payment</span>
          <p style="font-size:13px;color:#292524;margin:4px 0 16px;">${escapeHtml(paymentLabel)}</p>
          <span style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a29e;">Deliver To</span>
          <p style="font-size:13px;color:#292524;line-height:1.6;margin:4px 0 0;">${addressLine || "—"}</p>
        </div>
      </div>
    </div>
    <div style="max-width:560px;margin:16px auto 0;text-align:center;">
      <span style="font-size:11px;color:#a8a29e;">Our concierge team will follow up within 2 business hours.</span>
    </div>
  </div>`

  const textLines = [
    `Alloyed Living — ${heading}`,
    `Order: ${order.id}`,
    ``,
    `Dear ${order.customer.name || "there"},`,
    ``,
    `Thank you for your order. ${statusLine}`,
    ``,
    `Items:`,
    ...order.items.map((i) => `  - ${i.name} × ${i.quantity} — ${pkr(i.price * i.quantity)}`),
    ``,
    `Subtotal: ${pkr(order.subtotal)}`,
    `Delivery: ${order.delivery === 0 ? "Complimentary" : pkr(order.delivery)}`,
    `Total: ${pkr(order.total)}`,
    ``,
    `Payment: ${paymentLabel}`,
    `Deliver to: ${[addr.street, addr.city, addr.province, addr.postalCode, addr.country].filter(Boolean).join(", ")}`,
    ``,
    `Our concierge team will follow up within 2 business hours.`,
  ]

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject:
        method === "cod"
          ? `Order ${order.id} received — Alloyed Living`
          : paid
            ? `Payment confirmed — order ${order.id} — Alloyed Living`
            : `Order ${order.id} received — Alloyed Living`,
      html,
      text: textLines.join("\n"),
    })
    
    if (error) {
      console.error(`[order-email] Resend edge API error for order ${order.id}:`, error)
      return { ok: false, error: error.message || "send failed" }
    }
    
    return { ok: true }
  } catch (err) {
    console.error(`[order-email] Unexpected structural connection failure for order ${order.id}:`, err)
    return { ok: false, error: "send failed" }
  }
}