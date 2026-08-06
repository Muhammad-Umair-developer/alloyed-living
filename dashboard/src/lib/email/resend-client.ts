import "server-only"

// Minimal Resend HTTP client, used instead of the `resend` npm package so this
// dashboard app doesn't need a new dependency for its first two email-sending
// features (order-confirmation.ts, bank-payment-rejected.ts) — CLAUDE.md
// requires explicit permission before adding packages. This calls the exact
// same REST endpoint the SDK wraps: POST https://api.resend.com/emails.
// If the dashboard later needs more of Resend's SDK surface, install the
// `resend` package (already a dependency of alloyed-living) instead of growing
// this file.

export interface ResendSendInput {
  from: string
  to: string
  subject: string
  html: string
  text: string
}

export interface ResendSendResult {
  ok: boolean
  error?: string
}

export async function sendViaResend(apiKey: string, input: ResendSendInput): Promise<ResendSendResult> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      const message = (body as { message?: string } | null)?.message ?? `HTTP ${res.status}`
      return { ok: false, error: message }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "send failed" }
  }
}
