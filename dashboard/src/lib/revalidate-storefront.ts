import "server-only"

// Pings the storefront's /api/revalidate route right after a product or
// content-page write, so the change shows up immediately instead of waiting
// on the storefront page's own ISR window. The dashboard and storefront are
// separate Next.js deployments — revalidatePath() in this app only affects
// this app's cache, never the storefront's — so this is the only way to push
// a change across. Best-effort: if the storefront is briefly unreachable, the
// dashboard write itself still succeeds and the storefront's ISR timer is the
// fallback.
export async function revalidateStorefront(
  paths: string[],
  type: "page" | "layout" = "page",
): Promise<void> {
  const baseUrl = process.env.STOREFRONT_URL
  const secret = process.env.STOREFRONT_REVALIDATE_SECRET
  if (!baseUrl || !secret) {
    console.error("[revalidateStorefront] STOREFRONT_URL or STOREFRONT_REVALIDATE_SECRET not configured — skipping.")
    return
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/revalidate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ paths, type }),
    })
    if (!res.ok) {
      console.error(`[revalidateStorefront] Storefront returned ${res.status} for paths:`, paths)
    }
  } catch (err) {
    console.error("[revalidateStorefront] Failed to reach storefront:", err)
  }
}
