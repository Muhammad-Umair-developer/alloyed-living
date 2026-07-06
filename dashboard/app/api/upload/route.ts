import { NextResponse } from "next/server"
import { requireDashboardUser } from "@/src/lib/auth/require-admin"
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin"

// Media uploads go to the Supabase Storage "media" bucket (created by the
// security-hardening migration) instead of the local filesystem — local writes
// are ephemeral/read-only on serverless hosts and never reached the storefront
// when the two apps run on separate machines.
//
// SECURITY:
//   • Admin-gated in the handler itself (the proxy covers navigation, but
//     route handlers verify independently — defense in depth).
//   • The file's real type is sniffed from its magic bytes; the client-declared
//     MIME/filename are never trusted. The stored name and extension are derived
//     entirely server-side, so a payload can't smuggle an executable extension.

const MAX_IMAGE_BYTES = 8 * 1024 * 1024 // 8MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024 // 100MB

interface SniffedType {
  ext: string
  contentType: string
  kind: "image" | "video"
}

// Identify the actual file type from its leading bytes.
function sniffType(buf: Buffer): SniffedType | null {
  const ascii = (start: number, len: number) => buf.subarray(start, start + len).toString("latin1")

  if (buf.length < 12) return null
  // Images
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return { ext: "jpg", contentType: "image/jpeg", kind: "image" }
  if (buf[0] === 0x89 && ascii(1, 3) === "PNG")
    return { ext: "png", contentType: "image/png", kind: "image" }
  if (ascii(0, 4) === "GIF8")
    return { ext: "gif", contentType: "image/gif", kind: "image" }
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP")
    return { ext: "webp", contentType: "image/webp", kind: "image" }
  if (ascii(4, 4) === "ftyp" && ["avif", "avis"].includes(ascii(8, 4)))
    return { ext: "avif", contentType: "image/avif", kind: "image" }
  // Videos
  if (ascii(4, 4) === "ftyp") // MP4 family (isom/mp42/qt…)
    return { ext: "mp4", contentType: "video/mp4", kind: "video" }
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3)
    return { ext: "webm", contentType: "video/webm", kind: "video" }
  if (ascii(0, 4) === "OggS")
    return { ext: "ogv", contentType: "video/ogg", kind: "video" }
  return null
}

export async function POST(request: Request) {
  try {
    await requireDashboardUser()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return NextResponse.json({ error: "File must be smaller than 100MB" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const sniffed = sniffType(buffer)
  if (!sniffed) {
    return NextResponse.json({ error: "Only image or video files are supported" }, { status: 400 })
  }
  if (sniffed.kind === "image" && buffer.length > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image must be smaller than 8MB" }, { status: 400 })
  }

  // Server-generated name — nothing from the client's filename survives.
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${sniffed.ext}`

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.storage
    .from("media")
    .upload(filename, buffer, { contentType: sniffed.contentType, upsert: false })
  if (error) {
    console.error("[upload] storage error:", error.message)
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 })
  }

  const { data } = supabase.storage.from("media").getPublicUrl(filename)
  return NextResponse.json({ url: data.publicUrl, kind: sniffed.kind })
}
