import "server-only"
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin"

// Single source of truth for the manual bank-transfer / COD-deposit payment
// lifecycle. This mirrors — and is backed by — the database trigger
// `enforce_payment_status_transition` (see the bank_transfer_payments migration):
// the trigger is the ultimate guard (it fires even for the service-role client),
// and this module refuses illegal transitions before they ever reach the DB and
// gives callers a clear error.
//
// Lifecycle:
//   null              -> awaiting_payment
//   awaiting_payment  -> payment_submitted
//   payment_submitted -> payment_verified | payment_rejected
//   payment_rejected  -> payment_submitted
//   payment_verified is terminal.

export type PaymentStatus =
  | "awaiting_payment"
  | "payment_submitted"
  | "payment_verified"
  | "payment_rejected"

// Allowed next states keyed by the current state. The empty-string key stands in
// for a null/unset payment_status (a brand-new order). `payment_verified` maps to
// an empty list — it is terminal.
const ALLOWED: Record<string, readonly PaymentStatus[]> = {
  "": ["awaiting_payment"],
  awaiting_payment: ["payment_submitted"],
  payment_submitted: ["payment_verified", "payment_rejected"],
  payment_rejected: ["payment_submitted"],
  payment_verified: [],
}

// ── Pure guard (no I/O — unit-testable) ─────────────────────────────────────
// `from` may be null (new order) or any string read from the DB; an unknown
// source state simply has no allowed transitions and returns false.
export function isAllowedPaymentTransition(
  from: PaymentStatus | null | undefined,
  to: PaymentStatus,
): boolean {
  const next = ALLOWED[from ?? ""]
  return !!next && next.includes(to)
}

export function assertPaymentTransition(
  from: PaymentStatus | null | undefined,
  to: PaymentStatus,
): void {
  if (!isAllowedPaymentTransition(from, to)) {
    throw new Error(`Illegal payment status transition: ${from ?? "null"} -> ${to}`)
  }
}

// ── Thin DB-reading wrapper ─────────────────────────────────────────────────
// Reads the order's CURRENT payment_status from the database and validates the
// transition against THAT — never against a status supplied by the caller — then
// applies the change guarded on the value it just read, so a concurrent
// transition cannot slip through (the DB trigger is the final backstop). Extra
// column updates (receipt fields, verified_by, rejection reason, …) ride along
// via `patch`; the validated target status always wins over anything in `patch`.
export interface PaymentTransitionResult {
  id: string
  paymentStatus: PaymentStatus
}

export async function applyPaymentTransition(
  orderId: string,
  to: PaymentStatus,
  patch: Record<string, unknown> = {},
): Promise<PaymentTransitionResult> {
  const supabase = createSupabaseAdminClient()

  // 1. Current status straight from the DB — the only source of truth.
  const { data: current, error: readErr } = await supabase
    .from("orders")
    .select("payment_status")
    .eq("id", orderId)
    .maybeSingle()
  if (readErr) throw readErr
  if (!current) throw new Error(`Order ${orderId} not found.`)

  const from = (current.payment_status as PaymentStatus | null) ?? null

  // 2. Validate with the pure guard.
  assertPaymentTransition(from, to)

  // 3. Apply, guarded on the exact status we read (optimistic concurrency).
  let query = supabase
    .from("orders")
    .update({ ...patch, payment_status: to, updated_at: new Date().toISOString() })
    .eq("id", orderId)
  query = from === null ? query.is("payment_status", null) : query.eq("payment_status", from)

  const { data: updated, error: updateErr } = await query
    .select("id, payment_status")
    .maybeSingle()
  if (updateErr) throw updateErr
  if (!updated) {
    throw new Error(
      `Order ${orderId} payment status changed concurrently; transition to ${to} aborted.`,
    )
  }

  return {
    id: updated.id as string,
    paymentStatus: updated.payment_status as PaymentStatus,
  }
}
