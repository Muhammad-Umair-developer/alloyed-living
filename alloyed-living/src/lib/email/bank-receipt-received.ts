import "server-only"
import { Resend } from "resend"
import type { Order } from "@/src/lib/data/types"

// Sends the customer a short "we received your receipt" acknowledgement after
// they upload proof of payment. Reuses the same Resend channel, layout and
// branding as the other order emails. Server-only: RESEND_API_KEY never reaches
// the client.
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Alloyed Living <onboarding@resend.dev>"

export interface ReceiptReceivedResult {
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

export async function sendBankReceiptReceivedEmail(order: Order): Promise<ReceiptReceivedResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("[receipt-received] Missing RESEND_API_KEY — cannot send acknowledgement.")
    return { ok: false, error: "email not configured" }
  }

  const to = (order.customer?.email ?? "").trim()
  if (!to) {
    console.error(`[receipt-received] Order ${order.id} has no customer email; skipping.`)
    return { ok: false, error: "no recipient" }
  }

  const name = escapeHtml(order.customer.name || "there")

  const html = `
  <div style="background:#faf9f7;padding:32px;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ece9e4;">
      <div style="padding:28px 32px;border-bottom:1px solid #ece9e4;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:0.32em;text-transform:uppercase;color:#1c1917;">Alloyed Living</div>
        <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a29e;margin-top:6px;">Receipt Received · ${escapeHtml(order.id)}</div>
      </div>
      <div style="padding:28px 32px;">
        <p style="font-size:15px;color:#292524;line-height:1.6;margin:0 0 8px;">Dear ${name},</p>
        <p style="font-size:13px;color:#57534e;line-height:1.7;margin:0;">
          Thank you — we've received your receipt for order ${escapeHtml(order.id)} and are reviewing
          your payment. We usually confirm within a few hours, and we'll email your order confirmation
          as soon as it's verified.
        </p>
      </div>
    </div>
    <div style="max-width:560px;margin:16px auto 0;text-align:center;">
      <span style="font-size:11px;color:#a8a29e;">Questions? Just reply to this email.</span>
    </div>
  </div>`

  const text = [
    `Alloyed Living — Receipt Received`,
    `Order: ${order.id}`,
    ``,
    `Dear ${order.customer.name || "there"},`,
    ``,
    `Thank you — we've received your receipt for order ${order.id} and are reviewing your payment.`,
    `We usually confirm within a few hours, and we'll email your order confirmation once it's verified.`,
  ].join("\n")

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `Receipt received — order ${order.id} — Alloyed Living`,
      html,
      text,
    })
    if (error) {
      console.error(`[receipt-received] Resend error for order ${order.id}:`, error)
      return { ok: false, error: error.message || "send failed" }
    }
    return { ok: true }
  } catch (err) {
    console.error(`[receipt-received] Unexpected send failure for order ${order.id}:`, err)
    return { ok: false, error: "send failed" }
  }
}
