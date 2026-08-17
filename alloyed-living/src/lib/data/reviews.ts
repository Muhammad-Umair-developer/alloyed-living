import "server-only"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { createSupabasePublicClient } from "@/src/lib/supabase/public"
import type { Review, ReviewInput } from "./types"

type ReviewRow = Record<string, unknown>

// Public reads go through public_reviews (see the reviews_public_view
// migration) — a view whose column list structurally excludes author_id, so
// the reviewer's internal auth UUID can't leak even via a raw select("*")
// against the anon key. Never query the base `reviews` table for a public
// read; RLS denies anon/authenticated there by design.
const PUBLIC_COLUMNS = "id, product_id, author, rating, comment, created_at"

function rowToReview(r: ReviewRow): Review {
  return {
    id: r.id as string,
    productId: r.product_id as string,
    author: r.author as string,
    authorId: (r.author_id as string | null) ?? undefined,
    rating: Number(r.rating),
    comment: (r.comment as string) ?? "",
    createdAt: r.created_at as string,
  }
}

export interface ReviewSummary {
  count: number
  average: number // 0 when there are no reviews
}

export async function getReviews(): Promise<Review[]> {
  const supabase = createSupabasePublicClient()
  const { data, error } = await supabase.from("public_reviews").select(PUBLIC_COLUMNS)
  if (error) throw error
  return ((data ?? []) as ReviewRow[]).map(rowToReview)
}

export async function getReviewsByProduct(productId: string): Promise<Review[]> {
  const supabase = createSupabasePublicClient()
  const { data, error } = await supabase
    .from("public_reviews")
    .select(PUBLIC_COLUMNS)
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return ((data ?? []) as ReviewRow[]).map(rowToReview)
}

export function summarize(reviews: Review[]): ReviewSummary {
  if (reviews.length === 0) return { count: 0, average: 0 }
  const total = reviews.reduce((sum, r) => sum + r.rating, 0)
  return {
    count: reviews.length,
    average: Math.round((total / reviews.length) * 10) / 10,
  }
}

// Random ID instead of read-all-then-max: no extra round-trip and no duplicate
// key races when two reviews land concurrently.
function newReviewId(): string {
  return `rv${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

// Inserted with the authenticated user's session client so the RLS policy can
// verify auth.uid() matches the author_id being written (anonymous inserts are
// rejected at the database since the security-hardening migration).
export async function createReview(input: ReviewInput): Promise<Review> {
  const supabase = await createSupabaseServerClient()
  const row = {
    id: newReviewId(),
    product_id: input.productId,
    author: input.author,
    author_id: input.authorId ?? null,
    rating: Math.max(1, Math.min(5, Math.round(input.rating))),
    comment: input.comment,
    created_at: new Date().toISOString(),
  }
  const { data, error } = await supabase.from("reviews").insert(row).select("*").single()
  if (error) throw error
  return rowToReview(data)
}
