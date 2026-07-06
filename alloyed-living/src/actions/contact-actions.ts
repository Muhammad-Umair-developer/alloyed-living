"use server"

import { Resend } from "resend"
import { rateLimit } from "@/src/lib/rate-limit"

// Contact-form submissions are emailed to the business via Resend. This runs on
// the server only — RESEND_API_KEY is read from the environment and is never
// exposed to the client. Configure in alloyed-living/.env:
//   RESEND_API_KEY        — your Resend API key (server-side secret)
//   CONTACT_FORM_TO_EMAIL — inbox that should receive enquiries
// The `from` address must be on a domain verified in your Resend account. Set
// EMAIL_FROM in production (e.g. "Alloyed Living <orders@alloyedliving.com>");
// the resend.dev fallback only delivers to your own Resend account email.
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Alloyed Living <onboarding@resend.dev>"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface ContactInput {
  name: string
  email: string
  phone: string
  message: string
}

export interface ContactResult {
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

function row(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #ece9e4;vertical-align:top;width:150px;">
        <span style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a29e;">${label}</span>
      </td>
      <td style="padding:14px 0;border-bottom:1px solid #ece9e4;vertical-align:top;">
        <span style="font-size:14px;color:#292524;line-height:1.6;">${value}</span>
      </td>
    </tr>`
}

export async function sendContactMessageAction(input: ContactInput): Promise<ContactResult> {
  // The form relays to Resend, so an unthrottled caller could burn send quota
  // or use us to spam an inbox.
  if (!(await rateLimit("contact-form", 3, 10 * 60_000))) {
    return { ok: false, error: "Too many messages. Please wait a few minutes and try again." }
  }
  const name = (input?.name ?? "").trim()
  const email = (input?.email ?? "").trim()
  const phone = (input?.phone ?? "").trim()
  const message = (input?.message ?? "").trim()

  // Validation (mirrored on the client, enforced here as the source of truth).
  if (!name || !email || !message) {
    return { ok: false, error: "Please fill in your name, email, and message." }
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Please enter a valid email address." }
  }
  if (message.length > 5000) {
    return { ok: false, error: "Your message is too long. Please keep it under 5000 characters." }
  }

  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.CONTACT_FORM_TO_EMAIL
  if (!apiKey || !to) {
    console.error("[contact] Missing RESEND_API_KEY or CONTACT_FORM_TO_EMAIL env var.")
    return { ok: false, error: "We couldn't send your message right now. Please email us directly." }
  }

  const safe = {
    name: escapeHtml(name),
    email: escapeHtml(email),
    phone: phone ? escapeHtml(phone) : "—",
    message: escapeHtml(message).replace(/\n/g, "<br />"),
  }

  const html = `
  <div style="background:#faf9f7;padding:32px;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ece9e4;">
      <div style="padding:28px 32px;border-bottom:1px solid #ece9e4;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:0.32em;text-transform:uppercase;color:#1c1917;">Alloyed Living</div>
        <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a29e;margin-top:6px;">New Contact Enquiry</div>
      </div>
      <div style="padding:12px 32px 28px;">
        <table style="width:100%;border-collapse:collapse;">
          ${row("Name", safe.name)}
          ${row("Email", safe.email)}
          ${row("Phone", safe.phone)}
          ${row("Message", safe.message)}
        </table>
      </div>
    </div>
    <div style="max-width:560px;margin:16px auto 0;text-align:center;">
      <span style="font-size:11px;color:#a8a29e;">Reply directly to this email to respond to ${safe.name}.</span>
    </div>
  </div>`

  const text =
    `New contact enquiry\n\n` +
    `Name: ${name}\n` +
    `Email: ${email}\n` +
    `Phone: ${phone || "—"}\n\n` +
    `Message:\n${message}\n`

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      replyTo: email,
      subject: `New contact enquiry from ${name}`,
      html,
      text,
    })
    if (error) {
      console.error("[contact] Resend error:", error)
      return { ok: false, error: "We couldn't send your message right now. Please try again shortly." }
    }
    return { ok: true }
  } catch (err) {
    console.error("[contact] Unexpected send failure:", err)
    return { ok: false, error: "We couldn't send your message right now. Please try again shortly." }
  }
}
