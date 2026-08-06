import "server-only"
import { sendViaResend } from "./resend-client"
import type { Order } from "@/src/lib/data/types"

// Sent when an admin rejects a submitted receipt (order-actions.ts,
// rejectPaymentAction). Tells the customer why and links them back to the
// storefront confirmation page to re-upload. Same Resend channel, layout and
// branding as the storefront's own order emails.
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Alloyed Living <onboarding@resend.dev>"

export interface RejectionEmailResult {
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

// Absolute link back to the storefront's confirmation page, where the customer
// re-uploads their receipt. STOREFRONT_URL is already configured in
// dashboard/.env (used for revalidation callbacks).
function confirmUrl(order: Order): string | null {
  const base = process.env.STOREFRONT_URL
  if (!base || !order.accessToken) return null
  return `${base.replace(/\/+$/, "")}/checkout/confirm?token=${encodeURIComponent(order.accessToken)}`
}

export async function sendBankPaymentRejectedEmail(
  order: Order,
  opts: { reason: string },
): Promise<RejectionEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("[payment-rejected-email] Missing RESEND_API_KEY — cannot send rejection notice.")
    return { ok: false, error: "email not configured" }
  }

  const to = (order.customer?.email ?? "").trim()
  if (!to) {
    console.error(`[payment-rejected-email] Order ${order.id} has no customer email; skipping.`)
    return { ok: false, error: "no recipient" }
  }

  const name = escapeHtml(order.customer.name || "there")
  const reason = escapeHtml(opts.reason)
  const link = confirmUrl(order)

  const html = `
  <div style="background:#faf9f7;padding:32px;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ece9e4;">
      <div style="padding:28px 32px;border-bottom:1px solid #ece9e4;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:0.32em;text-transform:uppercase;color:#1c1917;">Alloyed Living</div>
        <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a29e;margin-top:6px;">Action Needed · ${escapeHtml(order.id)}</div>
      </div>

      <div style="padding:28px 32px;">
        <p style="font-size:15px;color:#292524;line-height:1.6;margin:0 0 8px;">Dear ${name},</p>
        <p style="font-size:13px;color:#57534e;line-height:1.7;margin:0 0 16px;">
          We weren't able to verify the payment receipt you submitted for order ${escapeHtml(order.id)}.
        </p>
        <div style="border:1px solid #ece9e4;background:#faf9f7;padding:14px 16px;margin:0 0 16px;">
          <span style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a29e;">Reason</span>
          <p style="font-size:13px;color:#292524;line-height:1.6;margin:4px 0 0;">${reason}</p>
        </div>
        <p style="font-size:13px;color:#57534e;line-height:1.7;margin:0;">
          Please re-upload a clear receipt${link ? " using the link below" : " on your confirmation page"} and
          we'll review it again.
        </p>
      </div>

      ${
        link
          ? `<div style="padding:0 32px 28px;text-align:center;">
               <a href="${escapeHtml(link)}" style="display:inline-block;background:#1c1917;color:#ffffff;text-decoration:none;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;padding:14px 28px;">Re-upload Receipt</a>
             </div>`
          : ""
      }
    </div>
    <div style="max-width:560px;margin:16px auto 0;text-align:center;">
      <span style="font-size:11px;color:#a8a29e;">Questions? Just reply to this email.</span>
    </div>
  </div>`

  const text = [
    `Alloyed Living — Action Needed`,
    `Order: ${order.id}`,
    ``,
    `Dear ${order.customer.name || "there"},`,
    ``,
    `We weren't able to verify the payment receipt you submitted for order ${order.id}.`,
    ``,
    `Reason: ${opts.reason}`,
    ``,
    `Please re-upload a clear receipt and we'll review it again.`,
    ...(link ? [``, `Re-upload: ${link}`] : []),
  ].join("\n")

  const result = await sendViaResend(apiKey, {
    from: FROM_ADDRESS,
    to,
    subject: `Action needed — order ${order.id} — Alloyed Living`,
    html,
    text,
  })
  if (!result.ok) {
    console.error(`[payment-rejected-email] Resend error for order ${order.id}:`, result.error)
  }
  return result
}
