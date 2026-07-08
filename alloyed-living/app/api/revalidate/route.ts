import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

// Called by the dashboard (a separate Next.js app/deployment) right after it
// writes a product or content-page change, so the storefront reflects the
// edit immediately instead of waiting out the page's ISR window (up to 60s,
// and possibly several client reloads on Vercel's edge network before every
// region has picked up the regenerated page).
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) {
    return NextResponse.json({ error: "Revalidation not configured" }, { status: 500 })
  }
  if (request.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const paths = Array.isArray(body?.paths) ? body.paths.filter((p: unknown) => typeof p === "string") : []
  if (paths.length === 0) {
    return NextResponse.json({ error: "No paths provided" }, { status: 400 })
  }

  for (const path of paths) {
    revalidatePath(path)
  }

  return NextResponse.json({ revalidated: true, paths })
}
