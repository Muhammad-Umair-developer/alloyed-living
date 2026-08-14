import "server-only"
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin"
import type { Address, AddressInput } from "./types"

// Service-role client throughout (mirrors orders.ts/products.ts) — this is
// server-only, trusted-caller data access. Every query is explicitly scoped
// by user_id so a caller can never read/write another customer's addresses,
// even though the service-role key itself bypasses RLS; the table's RLS
// policies are a second, independent backstop for any path that ever uses
// the anon/authenticated client instead of this module.

type AddressRow = Record<string, unknown>

function rowToAddress(r: AddressRow): Address {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    label: (r.label as string) ?? "",
    street: r.street as string,
    city: r.city as string,
    province: (r.province as string | null) ?? undefined,
    postalCode: (r.postal_code as string | null) ?? undefined,
    country: r.country as string,
    isDefault: Boolean(r.is_default),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

function inputToRow(patch: Partial<AddressInput>): AddressRow {
  const row: AddressRow = {}
  if (patch.label !== undefined) row.label = patch.label
  if (patch.street !== undefined) row.street = patch.street
  if (patch.city !== undefined) row.city = patch.city
  if (patch.province !== undefined) row.province = patch.province ?? null
  if (patch.postalCode !== undefined) row.postal_code = patch.postalCode ?? null
  if (patch.country !== undefined) row.country = patch.country
  return row
}

// Default address first, then oldest-first — a stable, predictable order for
// an address picker (default always at the top).
export async function getAddressesForUser(userId: string): Promise<Address[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data ?? []).map(rowToAddress)
}

export async function getAddress(userId: string, id: string): Promise<Address | null> {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from("addresses")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle()
  return data ? rowToAddress(data) : null
}

// A user's first saved address becomes their default automatically; later
// ones are added as non-default unless promoted via setDefaultAddress.
export async function createAddress(userId: string, input: AddressInput): Promise<Address> {
  const supabase = createSupabaseAdminClient()

  const { count, error: countErr } = await supabase
    .from("addresses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
  if (countErr) throw countErr

  const now = new Date().toISOString()
  const row = {
    ...inputToRow(input),
    user_id: userId,
    is_default: (count ?? 0) === 0,
    created_at: now,
    updated_at: now,
  }
  const { data, error } = await supabase.from("addresses").insert(row).select("*").single()
  if (error) throw error
  return rowToAddress(data)
}

// Scoped by user_id on the update itself — attempting to update someone
// else's address id returns null rather than throwing, same "not found"
// shape as a genuinely missing id.
export async function updateAddress(
  userId: string,
  id: string,
  patch: Partial<AddressInput>,
): Promise<Address | null> {
  const supabase = createSupabaseAdminClient()
  const row = { ...inputToRow(patch), updated_at: new Date().toISOString() }
  const { data, error } = await supabase
    .from("addresses")
    .update(row)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle()
  if (error) throw error
  return data ? rowToAddress(data) : null
}

export async function deleteAddress(userId: string, id: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from("addresses").delete().eq("id", id).eq("user_id", userId)
  if (error) throw error
}

// Flips is_default onto `id` and off every other address for this user.
// Clears the OLD default before setting the new one — never the other order —
// so the partial unique index (addresses_one_default_per_user_idx) never sees
// two defaults for the same user at once, even momentarily.
export async function setDefaultAddress(userId: string, id: string): Promise<Address | null> {
  const supabase = createSupabaseAdminClient()

  const target = await getAddress(userId, id)
  if (!target) return null
  if (target.isDefault) return target

  const { error: clearErr } = await supabase
    .from("addresses")
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_default", true)
  if (clearErr) throw clearErr

  const { data, error } = await supabase
    .from("addresses")
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle()
  if (error) throw error
  return data ? rowToAddress(data) : null
}
