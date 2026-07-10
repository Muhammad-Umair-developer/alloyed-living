import { NextResponse } from "next/server"
import { Resend } from "resend"
import { rateLimit } from "@/src/lib/rate-limit"

// Custom-order requests are emailed to the business via Resend — the SAME mailer
// service/API layer the Contact Us form uses (see src/actions/contact-actions.ts):
// same RESEND_API_KEY, CONTACT_FORM_TO_EMAIL and EMAIL_FROM env vars. This lives
// in a route handler rather than a server action only because the request carries
// file uploads (blueprints/images), which a server action's small body limit
// can't take — the uploaded files ride along as email attachments.
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Alloyed Living <onboarding@resend.dev>"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MAX_FILES = 10
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB per file
const MAX_TOTAL_BYTES = 25 * 1024 * 1024 // 25MB across all attachments

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : ""
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

export async function POST(request: Request) {
  // Relays to Resend, so throttle to protect send quota / the inbox (mirrors the
  // contact form's own rate limit).
  if (!(await rateLimit("custom-order", 3, 10 * 60_000))) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please wait a few minutes and try again." },
      { status: 429 },
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid submission." }, { status: 400 })
  }

  const fullName = str(form.get("fullName"))
  const email = str(form.get("email"))
  const phone = str(form.get("phone"))
  const requestTypeRaw = str(form.get("requestType"))
  const existingProduct = str(form.get("existingProduct"))
  const description = str(form.get("description"))
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0)

  // Validation (mirrored on the client, enforced here as the source of truth).
  if (!fullName || !email || !description) {
    return NextResponse.json(
      { ok: false, error: "Please fill in your name, email, and project description." },
      { status: 400 },
    )
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 })
  }
  const requestType = requestTypeRaw === "modify" ? "modify" : "new"
  if (requestType === "modify" && !existingProduct) {
    return NextResponse.json(
      { ok: false, error: "Please tell us which existing product you'd like to modify." },
      { status: 400 },
    )
  }
  if (description.length > 5000) {
    return NextResponse.json(
      { ok: false, error: "Your description is too long. Please keep it under 5000 characters." },
      { status: 400 },
    )
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { ok: false, error: `Please attach at most ${MAX_FILES} files.` },
      { status: 400 },
    )
  }

  // Read the uploads into attachments, enforcing per-file and total size caps.
  const attachments: { filename: string; content: Buffer }[] = []
  let total = 0
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { ok: false, error: `"${file.name}" is too large — each file must be under 10MB.` },
        { status: 400 },
      )
    }
    total += file.size
    if (total > MAX_TOTAL_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Attachments are too large in total. Please keep them under 25MB." },
        { status: 400 },
      )
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    attachments.push({ filename: file.name || "attachment", content: buffer })
  }

  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.CONTACT_FORM_TO_EMAIL
  if (!apiKey || !to) {
    console.error("[custom-order] Missing RESEND_API_KEY or CONTACT_FORM_TO_EMAIL env var.")
    return NextResponse.json(
      { ok: false, error: "We couldn't send your request right now. Please email us directly." },
      { status: 500 },
    )
  }

  const requestTypeLabel =
    requestType === "modify" ? "Modify an Existing Product" : "Completely New Design Idea"

  const safe = {
    name: escapeHtml(fullName),
    email: escapeHtml(email),
    phone: phone ? escapeHtml(phone) : "—",
    requestType: escapeHtml(requestTypeLabel),
    existingProduct: existingProduct ? escapeHtml(existingProduct) : "—",
    description: escapeHtml(description).replace(/\n/g, "<br />"),
    files: attachments.length
      ? attachments.map((a) => escapeHtml(a.filename)).join("<br />")
      : "None attached",
  }

  const html = `
  <div style="background:#faf9f7;padding:32px;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ece9e4;">
      <div style="padding:28px 32px;border-bottom:1px solid #ece9e4;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:0.32em;text-transform:uppercase;color:#1c1917;">Alloyed Living</div>
        <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#a8a29e;margin-top:6px;">New Custom Order Request</div>
      </div>
      <div style="padding:12px 32px 28px;">
        <table style="width:100%;border-collapse:collapse;">
          ${row("Name", safe.name)}
          ${row("Email", safe.email)}
          ${row("Phone", safe.phone)}
          ${row("Request Type", safe.requestType)}
          ${requestType === "modify" ? row("Existing Product", safe.existingProduct) : ""}
          ${row("Description", safe.description)}
          ${row("Attachments", safe.files)}
        </table>
      </div>
    </div>
    <div style="max-width:560px;margin:16px auto 0;text-align:center;">
      <span style="font-size:11px;color:#a8a29e;">Reply directly to this email to respond to ${safe.name}.</span>
    </div>
  </div>`

  const text =
    `New custom order request\n\n` +
    `Name: ${fullName}\n` +
    `Email: ${email}\n` +
    `Phone: ${phone || "—"}\n` +
    `Request Type: ${requestTypeLabel}\n` +
    (requestType === "modify" ? `Existing Product: ${existingProduct}\n` : "") +
    `\nDescription:\n${description}\n\n` +
    `Attachments: ${attachments.length ? attachments.map((a) => a.filename).join(", ") : "None attached"}\n`

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      replyTo: email,
      subject: `New custom order request from ${fullName}`,
      html,
      text,
      ...(attachments.length ? { attachments } : {}),
    })
    if (error) {
      console.error("[custom-order] Resend error:", error)
      return NextResponse.json(
        { ok: false, error: "We couldn't send your request right now. Please try again shortly." },
        { status: 502 },
      )
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[custom-order] Unexpected send failure:", err)
    return NextResponse.json(
      { ok: false, error: "We couldn't send your request right now. Please try again shortly." },
      { status: 500 },
    )
  }
}
