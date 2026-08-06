import "server-only"
import { Resend } from "resend"
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin"
import type { Order } from "@/src/lib/data/types"

// Sends the customer the "awaiting payment" email: what to transfer, to which
// account, and a link to the confirmation page to upload their receipt. Reuses
// the same Resend channel, layout and branding as the order-confirmation email
// (src/lib/email/order-confirmation.ts). Server-only: RESEND_API_KEY never
// reaches the client. `EMAIL_FROM` must be a domain verified in Resend.
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Alloyed Living <onboarding@resend.dev>"

export interface BankAwaitingEmailResult {
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

// ── Account details, read server-side from the payment-methods content row ──
interface UblDetails {
  accountTitle?: string
  bankName?: string
  accountNumber?: string
  iban?: string
}
interface JazzcashDetails {
  accountTitle?: string
  number?: string
}
interface PaymentMethodsFields {
  ubl?: UblDetails
  jazzcash?: JazzcashDetails
}

async function getPaymentMethods(): Promise<PaymentMethodsFields> {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from("content_pages")
    .select("fields")
    .eq("slug", "payment-methods")
    .maybeSingle()
  return (data?.fields as PaymentMethodsFields | undefined) ?? {}
}

// Returns the display label + the detail lines for the account the customer must
// pay into: the chosen deposit account for COD, otherwise the method's own bank.
function accountBlock(
  account: "ubl" | "jazzcash",
  pm: PaymentMethodsFields,
): { label: string; lines: string[] } {
  if (account === "jazzcash") {
    const j = pm.jazzcash ?? {}
    return {
      label: "JazzCash",
      lines: [j.accountTitle, j.number && `Number: ${j.number}`].filter(Boolean) as string[],
    }
  }
  const u = pm.ubl ?? {}
  return {
    label: "UBL Bank Transfer",
    lines: [
      u.accountTitle,
      u.bankName,
      u.accountNumber && `Account: ${u.accountNumber}`,
      u.iban && `IBAN: ${u.iban}`,
    ].filter(Boolean) as string[],
  }
}

export async function sendBankAwaitingPaymentEmail(
  order: Order,
  opts: { confirmUrl: string },
): Promise<BankAwaitingEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("[awaiting-email] Missing RESEND_API_KEY — cannot send awaiting-payment email.")
    return { ok: false, error: "email not configured" }
  }

  const to = (order.customer?.email ?? "").trim()
  if (!to) {
    console.error(`[awaiting-email] Order ${order.id} has no customer email; skipping.`)
    return { ok: false, error: "no recipient" }
  }

  const name = escapeHtml(order.customer.name || "there")
  const isCod = order.paymentMethod === "cod"
  const account: "ubl" | "jazzcash" = isCod
    ? order.depositAccount === "jazzcash"
      ? "jazzcash"
      : "ubl"
    : order.paymentMethod === "jazzcash"
      ? "jazzcash"
      : "ubl"

  const pm = await getPaymentMethods()
  const acct = accountBlock(account, pm)

  const payable = order.payableAmount ?? 0
  const balance = order.codBalanceDue ?? 0
  const payInFull = isCod && balance <= 0

  const headingLabel = isCod ? "Deposit Due" : "Awaiting Payment"
  const amountLabel = isCod ? (payInFull ? "Amount to pay now" : "Deposit to pay now") : "Amount to transfer"
  const ctaLabel = isCod && !payInFull ? "Upload your deposit receipt" : "Upload your receipt"

  const intro = !isCod
    ? `Thank you for your order. To confirm it, please transfer the exact amount below to our ${acct.label} account, then upload your receipt.`
    : payInFull
      ? `Thank you for your order. Your order total is at or below our deposit amount, so please pay it in full now to our ${acct.label} account — nothing is due on delivery.`
      : `Thank you for your order. To confirm your Cash-on-Delivery order, please pay a deposit now to our ${acct.label} account. The balance is paid in cash to our courier on delivery.`

  const closing = !isCod
    ? "Once we've verified your payment, we'll email your order confirmation. We usually confirm within a few hours."
    : payInFull
      ? "Once we've verified your payment, we'll email your order confirmation. Nothing is due to the courier. We usually confirm within a few hours."
      : `Once we've verified your deposit, we'll email your order confirmation, and your courier will bring your order with ${pkr(balance)} due on delivery. We usually confirm within a few hours.`

  const itemsHtml = order.items
    .map((i) => itemRow(escapeHtml(i.name), i.quantity, pkr(i.price * i.quantity)))
    .join("")

  const accountLinesHtml = acct.lines.length
    ? acct.lines.map((l) => escapeHtml(l)).join("<br>")
    : "—"

  const balanceLineHtml =
    isCod && !payInFull
      ? `<div style="padding:0 32px;">
           <p style="font-size:12px;color:#57534e;text-align:center;margin:8px 0 0;">Balance due to courier on delivery — ${pkr(balance)}</p>
         </div>`
      : ""

  const codTotalsHtml =
    isCod && !payInFull
      ? totalRow("Deposit", pkr(payable)) + totalRow("Balance on delivery", pkr(balance))
      : ""

  const html = `
  <div style="background:#faf9f7;padding:32px;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ece9e4;">
      <div style="padding:28px 32px;border-bottom:1px solid #ece9e4;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:0.32em;text-transform:uppercase;color:#1c1917;">Alloyed Living</div>
        <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a29e;margin-top:6px;">${headingLabel} · ${escapeHtml(order.id)}</div>
      </div>

      <div style="padding:28px 32px 8px;">
        <p style="font-size:15px;color:#292524;line-height:1.6;margin:0 0 8px;">Dear ${name},</p>
        <p style="font-size:13px;color:#57534e;line-height:1.7;margin:0;">${escapeHtml(intro)}</p>
      </div>

      <div style="padding:16px 32px 4px;">
        <div style="border:1px solid #ece9e4;background:#faf9f7;padding:18px 20px;text-align:center;">
          <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a29e;">${amountLabel}</div>
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#1c1917;margin-top:6px;">${pkr(payable)}</div>
        </div>
      </div>
      ${balanceLineHtml}

      <div style="padding:18px 32px 4px;">
        <span style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a29e;">${escapeHtml(acct.label)} — Account Details</span>
        <p style="font-size:13px;color:#292524;line-height:1.7;margin:6px 0 0;">${accountLinesHtml}</p>
      </div>

      <div style="padding:20px 32px;text-align:center;">
        <a href="${escapeHtml(opts.confirmUrl)}" style="display:inline-block;background:#1c1917;color:#ffffff;text-decoration:none;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;padding:14px 28px;">${ctaLabel}</a>
      </div>

      <div style="padding:4px 32px 8px;">
        <table style="width:100%;border-collapse:collapse;">${itemsHtml}</table>
      </div>

      <div style="padding:8px 32px 20px;">
        <table style="width:100%;border-collapse:collapse;">
          ${totalRow("Order Total", pkr(order.total), true)}
          ${codTotalsHtml}
        </table>
      </div>

      <div style="padding:0 32px 28px;">
        <p style="font-size:13px;color:#57534e;line-height:1.7;margin:0;">${escapeHtml(closing)}</p>
      </div>
    </div>
    <div style="max-width:560px;margin:16px auto 0;text-align:center;">
      <span style="font-size:11px;color:#a8a29e;">Questions? Just reply to this email.</span>
    </div>
  </div>`

  const textLines = [
    `Alloyed Living — ${headingLabel}`,
    `Order: ${order.id}`,
    ``,
    `Dear ${order.customer.name || "there"},`,
    ``,
    intro,
    ``,
    `${amountLabel}: ${pkr(payable)}`,
    ...(isCod && !payInFull ? [`Balance due to courier on delivery: ${pkr(balance)}`] : []),
    ``,
    `${acct.label} — Account Details:`,
    ...(acct.lines.length ? acct.lines.map((l) => `  ${l}`) : ["  —"]),
    ``,
    `Upload your receipt: ${opts.confirmUrl}`,
    ``,
    `Items:`,
    ...order.items.map((i) => `  - ${i.name} × ${i.quantity} — ${pkr(i.price * i.quantity)}`),
    ``,
    `Order total: ${pkr(order.total)}`,
    ...(isCod && !payInFull
      ? [`Deposit: ${pkr(payable)}`, `Balance on delivery: ${pkr(balance)}`]
      : []),
    ``,
    closing,
  ]

  const subject = !isCod
    ? `Complete your payment — order ${order.id} — Alloyed Living`
    : payInFull
      ? `Confirm your order — payment due — order ${order.id} — Alloyed Living`
      : `Confirm your order — deposit due — order ${order.id} — Alloyed Living`

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
      text: textLines.join("\n"),
    })
    if (error) {
      console.error(`[awaiting-email] Resend error for order ${order.id}:`, error)
      return { ok: false, error: error.message || "send failed" }
    }
    return { ok: true }
  } catch (err) {
    console.error(`[awaiting-email] Unexpected send failure for order ${order.id}:`, err)
    return { ok: false, error: "send failed" }
  }
}
