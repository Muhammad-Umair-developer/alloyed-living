/**
 * Supabase Auth "Send Email" Hook — Alloyed Living
 * ================================================
 * Replaces Supabase's built-in auth emails (signup confirmation, password reset,
 * admin invite, magic link, email change) with branded emails sent through
 * Resend. This runs on Supabase's Edge (Deno) infrastructure — NOT in Next.js —
 * because Auth Hooks are invoked by the Auth server, not the app.
 *
 * Once enabled, the existing `signUp()`, `resetPasswordForEmail()`, and
 * `inviteUserByEmail()` calls automatically route their emails through here.
 * No frontend changes are required.
 *
 * ── Secrets (set via the Supabase CLI, NOT in any .env consumed by Next.js) ──
 *   RESEND_API_KEY          Resend API key used to send mail.
 *   SEND_EMAIL_HOOK_SECRET  Signing secret shown when you create the hook in the
 *                           dashboard (format: "v1,whsec_...."). Used to verify
 *                           every request actually came from Supabase Auth.
 *   RESEND_FROM_EMAIL       (optional) Verified sender, e.g.
 *                           "Alloyed Living <no-reply@yourdomain.com>".
 *                           Defaults to Resend's test sender.
 *   SUPABASE_URL            Auto-injected by the platform — do NOT set manually.
 *
 * ── Deploy ──
 *   supabase functions deploy send-email-hook --no-verify-jwt --project-ref <REF>
 *   (The hook is authenticated by its webhook signature, not a user JWT, so
 *    --no-verify-jwt is REQUIRED or the platform will reject the Auth server's
 *    call.)
 *
 * ── Set the secrets ──
 *   supabase secrets set RESEND_API_KEY="re_xxx" --project-ref <REF>
 *   supabase secrets set SEND_EMAIL_HOOK_SECRET="v1,whsec_xxx" --project-ref <REF>
 *   supabase secrets set RESEND_FROM_EMAIL="Alloyed Living <no-reply@yourdomain.com>" --project-ref <REF>
 *
 * ── Enable the hook ──
 *   Supabase Dashboard → Authentication → Hooks (Send Email) → Enable "HTTPS"
 *   hook and point it at:
 *     https://<REF>.functions.supabase.co/send-email-hook
 *   Copy the generated signing secret into SEND_EMAIL_HOOK_SECRET (above).
 *   (Or configure it in supabase/config.toml under [auth.hook.send_email].)
 */

import { Webhook } from "standardwebhooks"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const FROM_ADDRESS =
  Deno.env.get("RESEND_FROM_EMAIL") ?? "Alloyed Living <onboarding@resend.dev>"

// ── Types Supabase sends for the Send Email hook ──────────────────────────────
interface SendEmailPayload {
  user: { email: string }
  email_data: {
    token: string
    token_hash: string
    redirect_to: string
    email_action_type: string
    site_url: string
  }
}

// ── Supabase expects `{}` (200) on success, or `{ error: {...} }` on failure ──
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}
function errorResponse(httpCode: number, message: string): Response {
  console.error(`[send-email-hook] ${httpCode}: ${message}`)
  return jsonResponse({ error: { http_code: httpCode, message } }, httpCode)
}

// ── Branded email templates (Alloyed Living) ─────────────────────────────────
// Cream #faf9f7 canvas, white card, dark-stone #1c1917 CTA, editorial serif
// (Georgia fallback for email clients), letter-spaced uppercase micro-labels.
function shell(opts: {
  heading: string
  intro: string
  buttonLabel: string
  buttonUrl: string
  token: string
}): string {
  return `
  <div style="background:#faf9f7;padding:40px 24px;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #ece9e4;">
      <div style="padding:32px 40px 24px;border-bottom:1px solid #ece9e4;text-align:center;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;letter-spacing:0.36em;text-transform:uppercase;color:#1c1917;">Alloyed Living</div>
      </div>
      <div style="padding:40px 40px 36px;">
        <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:26px;line-height:1.25;color:#1c1917;">${opts.heading}</h1>
        <p style="margin:0 0 28px;font-size:14px;line-height:1.7;color:#57534e;">${opts.intro}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
          <tr>
            <td style="background:#1c1917;">
              <a href="${opts.buttonUrl}" style="display:inline-block;padding:15px 34px;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#ffffff;text-decoration:none;">${opts.buttonLabel}</a>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:#a8a29e;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="margin:0 0 24px;font-size:12px;line-height:1.6;word-break:break-all;"><a href="${opts.buttonUrl}" style="color:#57534e;">${opts.buttonUrl}</a></p>
        <p style="margin:0;font-size:12px;line-height:1.6;color:#a8a29e;">Or use this code: <span style="font-family:Georgia,serif;letter-spacing:0.2em;color:#1c1917;">${opts.token}</span></p>
      </div>
      <div style="padding:22px 40px;border-top:1px solid #ece9e4;">
        <p style="margin:0;font-size:11px;line-height:1.6;color:#a8a29e;">If you didn't request this email, you can safely ignore it. This link is time-limited and single-use.</p>
      </div>
    </div>
    <div style="max-width:520px;margin:16px auto 0;text-align:center;">
      <span style="font-size:10px;letter-spacing:0.24em;text-transform:uppercase;color:#c4beb5;">Alloyed Living</span>
    </div>
  </div>`
}

function buildEmail(
  actionType: string,
  actionUrl: string,
  token: string,
): { subject: string; html: string } {
  switch (actionType) {
    case "signup":
      return {
        subject: "Confirm your email — Alloyed Living",
        html: shell({
          heading: "Confirm your email",
          intro:
            "Welcome to Alloyed Living. Please confirm your email address to activate your account and begin.",
          buttonLabel: "Verify Email",
          buttonUrl: actionUrl,
          token,
        }),
      }
    case "recovery":
      return {
        subject: "Reset your password — Alloyed Living",
        html: shell({
          heading: "Reset your password",
          intro:
            "We received a request to reset your password. Choose a new one using the button below. If you didn't ask for this, no action is needed.",
          buttonLabel: "Reset Password",
          buttonUrl: actionUrl,
          token,
        }),
      }
    case "invite":
      return {
        subject: "You're invited to Alloyed Living",
        html: shell({
          heading: "You're invited",
          intro:
            "You've been invited to the Alloyed Living admin dashboard. Accept the invitation below to set your password and get started.",
          buttonLabel: "Accept Invitation",
          buttonUrl: actionUrl,
          token,
        }),
      }
    case "magiclink":
      return {
        subject: "Your sign-in link — Alloyed Living",
        html: shell({
          heading: "Your sign-in link",
          intro: "Use the button below to sign in to Alloyed Living securely.",
          buttonLabel: "Sign In",
          buttonUrl: actionUrl,
          token,
        }),
      }
    case "email_change":
    case "email_change_current":
      return {
        subject: "Confirm your new email — Alloyed Living",
        html: shell({
          heading: "Confirm your email change",
          intro:
            "Please confirm this email address to finish updating your Alloyed Living account.",
          buttonLabel: "Confirm Email",
          buttonUrl: actionUrl,
          token,
        }),
      }
    default:
      return {
        subject: "Alloyed Living",
        html: shell({
          heading: "Action required",
          intro: "Please continue using the button below.",
          buttonLabel: "Continue",
          buttonUrl: actionUrl,
          token,
        }),
      }
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return errorResponse(405, "Method not allowed")
  }
  if (!RESEND_API_KEY || !HOOK_SECRET) {
    return errorResponse(500, "Function is missing RESEND_API_KEY or SEND_EMAIL_HOOK_SECRET")
  }

  const payloadStr = await req.text()
  const headers = Object.fromEntries(req.headers)

  // 1) Verify the request genuinely came from Supabase Auth (standardwebhooks
  //    signature over webhook-id / webhook-timestamp / webhook-signature).
  let payload: SendEmailPayload
  try {
    const wh = new Webhook(HOOK_SECRET.replace("v1,whsec_", ""))
    payload = wh.verify(payloadStr, headers) as SendEmailPayload
  } catch (_err) {
    return errorResponse(401, "Invalid webhook signature")
  }

  // 2) Build the confirmation/action link. The verify endpoint lives on the
  //    project's auth domain; SUPABASE_URL is auto-injected by the platform.
  const { user, email_data } = payload
  const { token, token_hash, redirect_to, email_action_type } = email_data
  const actionUrl =
    `${SUPABASE_URL}/auth/v1/verify?token=${token_hash}` +
    `&type=${email_action_type}` +
    `&redirect_to=${encodeURIComponent(redirect_to)}`

  const { subject, html } = buildEmail(email_action_type, actionUrl, token)

  // 3) Send via Resend's REST API (plain fetch — no Node SDK in Deno).
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [user.email],
        subject,
        html,
      }),
    })
    if (!res.ok) {
      const detail = await res.text()
      return errorResponse(502, `Resend send failed (${res.status}): ${detail}`)
    }
  } catch (err) {
    return errorResponse(502, `Resend request error: ${err instanceof Error ? err.message : String(err)}`)
  }

  // 4) Supabase expects an empty JSON object with 200 on success.
  return jsonResponse({}, 200)
})
