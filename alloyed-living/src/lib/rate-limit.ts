import "server-only"
import { headers } from "next/headers"

// Minimal in-memory sliding-window rate limiter for the public server actions
// (checkout, contact form, reviews, analytics pings). Keyed by caller IP.
//
// LIMITATION: state is per-process. On a single Node server this is a real
// limit; on multi-instance/serverless hosting each instance keeps its own
// window, so treat this as a spam brake, not a hard guarantee — swap the Map
// for Redis (e.g. Upstash) when deploying to a multi-instance platform.

const windows = new Map<string, number[]>()
const MAX_KEYS = 10_000

async function callerKey(action: string): Promise<string> {
  const h = await headers()
  const ip =
    (h.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "unknown"
  return `${action}:${ip}`
}

// Returns true when the call is allowed, false when the caller is over limit.
export async function rateLimit(action: string, limit: number, windowMs: number): Promise<boolean> {
  const key = await callerKey(action)
  const now = Date.now()

  const hits = (windows.get(key) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) {
    windows.set(key, hits)
    return false
  }
  hits.push(now)
  windows.set(key, hits)

  // Opportunistic pruning so the map cannot grow without bound.
  if (windows.size > MAX_KEYS) {
    for (const [k, v] of windows) {
      if (v.every((t) => now - t >= windowMs)) windows.delete(k)
    }
  }
  return true
}
