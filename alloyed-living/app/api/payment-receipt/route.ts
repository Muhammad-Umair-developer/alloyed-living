import { NextResponse, type NextRequest } from "next/server"
import { createHash } from "node:crypto"
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin"
import { getOrderByAccessToken } from "@/src/lib/data/orders"
import { applyPaymentTransition } from "@/src/lib/payments/transitions"
import { sendBankOrderReceivedEmail } from "@/src/lib/email/bank-order-received"
import { sendOwnerOrderNotificationEmail } from "@/src/lib/email/owner-notification"
import { rateLimit } from "@/src/lib/rate-limit"

// Customer receipt upload. Validates the order by its opaque access token (the
// same capability the confirmation page uses), stores the file in the PRIVATE
// payment-receipts bucket via the service-role client, and moves the order to
// payment_submitted through the guarded transition helper (which the DB trigger
// backs). Never marks anything verified.
//
// This is the ONLY point in the lifecycle where either notification email
// fires — order placement itself is silent for every payment method.
export const dynamic = "force-dynamic"

// Absolute origin for the confirmation-page link in the order-received email.
// Prefer an explicit public URL; fall back to the incoming request host.
function resolveOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured) return configured.replace(/\/+$/, "")
  const host = req.headers.get("host") ?? ""
  if (!host) return ""
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
  return `${proto}://${host}`
}

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB — matches the bucket's file_size_limit

interface Sniffed {
  ext: string
  contentType: string
}

// Identify the real file type from its leading bytes; the client-declared
// MIME/filename is never trusted. Allowlist mirrors the bucket: JPEG/PNG/WebP/PDF.
function sniff(buf: Buffer): Sniffed | null {
  const ascii = (start: number, len: number) => buf.subarray(start, start + len).toString("latin1")
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", contentType: "image/jpeg" }
  if (buf[0] === 0x89 && ascii(1, 3) === "PNG") return { ext: "png", contentType: "image/png" }
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return { ext: "webp", contentType: "image/webp" }
  if (ascii(0, 5) === "%PDF-") return { ext: "pdf", contentType: "application/pdf" }
  return null
}

export async function POST(req: NextRequest) {
  if (!(await rateLimit("payment-receipt", 10, 60_000))) {
    return NextResponse.json({ error: "Too many attempts. Please wait a minute and try again." }, { status: 429 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const token = String(form.get("token") ?? "").trim()
  const senderName = String(form.get("senderName") ?? "").trim().slice(0, 200)
  const senderMobile = String(form.get("senderMobile") ?? "").trim().slice(0, 32)
  const reference = String(form.get("reference") ?? "").trim().slice(0, 120)
  const file = form.get("file")

  if (!token) return NextResponse.json({ error: "Missing order reference." }, { status: 400 })
  if (!senderName || !reference) {
    return NextResponse.json({ error: "Please provide the sender name and transaction reference." }, { status: 400 })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Please attach your payment receipt." }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be smaller than 5MB." }, { status: 400 })
  }

  const order = await getOrderByAccessToken(token)
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 })
  if (order.paymentStatus !== "awaiting_payment" && order.paymentStatus !== "payment_rejected") {
    return NextResponse.json({ error: "This order is not awaiting a receipt." }, { status: 409 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const kind = sniff(buffer)
  if (!kind) {
    return NextResponse.json({ error: "Only JPG, PNG, WebP or PDF files are accepted." }, { status: 400 })
  }

  const hash = createHash("sha256").update(buffer).digest("hex")
  const supabase = createSupabaseAdminClient()

  // Duplicate detection: flag (never auto-reject) if this exact receipt image or
  // this transaction reference already appears on another order.
  const [{ data: byHash }, { data: byRef }] = await Promise.all([
    supabase.from("orders").select("id").eq("payment_receipt_hash", hash).neq("id", order.id).limit(1),
    supabase.from("orders").select("id").eq("payment_reference", reference).neq("id", order.id).limit(1),
  ])
  const dupHash = (byHash?.length ?? 0) > 0
  const dupRef = (byRef?.length ?? 0) > 0
  const flagged = dupHash || dupRef
  const flagReason = flagged
    ? [
        dupHash ? `Duplicate receipt image (matches ${byHash![0].id})` : null,
        dupRef ? `Duplicate reference (matches ${byRef![0].id})` : null,
      ]
        .filter(Boolean)
        .join("; ")
    : null

  // Upload to the PRIVATE bucket (service-role bypasses storage RLS).
  const path = `${order.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${kind.ext}`
  const { error: upErr } = await supabase.storage
    .from("payment-receipts")
    .upload(path, buffer, { contentType: kind.contentType, upsert: false })
  if (upErr) {
    console.error("[payment-receipt] upload failed:", upErr.message)
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 })
  }

  // awaiting_payment | payment_rejected -> payment_submitted, guarded server-side
  // (and by the DB trigger). Clears any prior rejection reason on re-upload.
  try {
    await applyPaymentTransition(order.id, "payment_submitted", {
      payment_receipt_path: path,
      payment_receipt_hash: hash,
      payment_sender_name: senderName,
      payment_sender_mobile: senderMobile || null,
      payment_reference: reference,
      payment_submitted_at: new Date().toISOString(),
      payment_flagged: flagged,
      payment_flag_reason: flagReason,
      payment_rejection_reason: null,
    })
  } catch (e) {
    console.error("[payment-receipt] transition failed:", e)
    // Best-effort cleanup so a retry isn't blocked by the orphaned object.
    await supabase.storage.from("payment-receipts").remove([path]).catch(() => {})
    return NextResponse.json({ error: "Could not record your receipt. Please try again." }, { status: 409 })
  }

  // Customer acknowledgement — the ONLY "order received" email in the
  // lifecycle, fired here rather than at placement. Non-blocking: an email
  // failure must never fail an otherwise-successful upload.
  try {
    const confirmUrl = `${resolveOrigin(req)}/checkout/confirm?token=${encodeURIComponent(token)}`
    await sendBankOrderReceivedEmail(order, { confirmUrl })
  } catch (e) {
    console.error("[payment-receipt] order-received email failed:", e)
  }

  // Owner alert: there's now something to verify. Separate inbox, separate
  // failure boundary — never blocks the customer's upload.
  try {
    await sendOwnerOrderNotificationEmail(order, { reason: "receipt_submitted" })
  } catch (e) {
    console.error("[payment-receipt] owner notification failed:", e)
  }

  return NextResponse.json({ ok: true })
}
