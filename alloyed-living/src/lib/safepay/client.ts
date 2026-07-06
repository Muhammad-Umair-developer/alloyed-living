import "server-only"
import { Safepay } from "@sfpy/node-sdk"

// Server-only Safepay client. The `import "server-only"` above is a build-time
// guard: if this file is ever pulled into a Client Component's import graph, the
// build fails. Secrets are read from server-only env vars (NO NEXT_PUBLIC_
// prefix), so they can never be inlined into the browser bundle.
//
// Env vars (set in alloyed-living/.env — none prefixed NEXT_PUBLIC_):
//   SAFEPAY_API_KEY        Safepay API key   → SDK `apiKey`
//   SAFEPAY_SECRET         Safepay v1 secret → SDK `v1Secret` (redirect signatures)
//   SAFEPAY_WEBHOOK_SECRET Webhook secret    → SDK `webhookSecret` (webhook signatures)
//   SAFEPAY_ENVIRONMENT    "sandbox" (default) | "production"

type SafepayEnvironment = ConstructorParameters<typeof Safepay>[0]["environment"]

export function getSafepayEnvironment(): "sandbox" | "production" {
  return process.env.SAFEPAY_ENVIRONMENT === "production" ? "production" : "sandbox"
}

export function createSafepayClient(): Safepay {
  const apiKey = process.env.SAFEPAY_API_KEY
  const v1Secret = process.env.SAFEPAY_SECRET
  const webhookSecret = process.env.SAFEPAY_WEBHOOK_SECRET

  if (!apiKey || !v1Secret || !webhookSecret) {
    throw new Error(
      "Safepay is not configured. Set SAFEPAY_API_KEY, SAFEPAY_SECRET and " +
        "SAFEPAY_WEBHOOK_SECRET (server-only, no NEXT_PUBLIC_ prefix) in alloyed-living/.env",
    )
  }

  return new Safepay({
    // The SDK types `environment` as a string enum whose values are exactly
    // "sandbox"/"production"; cast our string to that expected type.
    environment: getSafepayEnvironment() as SafepayEnvironment,
    apiKey,
    v1Secret,
    webhookSecret,
  })
}
