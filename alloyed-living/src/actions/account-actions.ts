"use server"

import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { updateProfile } from "@/src/lib/data/profiles"
import {
  getAddressesForUser,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "@/src/lib/data/addresses"
import { rateLimit } from "@/src/lib/rate-limit"
import type { Address, AddressInput } from "@/src/lib/data/types"

// Every action below re-derives the caller's identity from the SERVER-SIDE
// session before touching any account-scoped row — never from a user id
// passed in from the client. This is defense-in-depth alongside the table's
// own RLS: profiles.ts/addresses.ts use the service-role client (which
// bypasses RLS), so THIS check is what actually stops one account from
// reading/writing another's data via these actions, same rule cancelOrderByToken
// followed for orders.
async function requireUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("You must be signed in.")
  return user.id
}

// ── Profile ──────────────────────────────────────────────────────────────────

export interface UpdateProfileResult {
  ok: boolean
  error?: string
  fullName?: string | null
  phone?: string | null
}

export async function updateProfileAction(input: {
  fullName: string
  phone: string
}): Promise<UpdateProfileResult> {
  let userId: string
  try {
    userId = await requireUserId()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "You must be signed in." }
  }
  if (!(await rateLimit("update-profile", 10, 60_000))) {
    return { ok: false, error: "Too many attempts. Please wait a minute and try again." }
  }

  const fullName = (input.fullName ?? "").trim().slice(0, 200)
  const phone = (input.phone ?? "").trim().slice(0, 32)
  if (!fullName) return { ok: false, error: "Please enter your name." }

  const updated = await updateProfile(userId, { fullName, phone: phone || null })
  if (!updated) return { ok: false, error: "Could not update your profile." }
  return { ok: true, fullName: updated.fullName, phone: updated.phone }
}

// ── Addresses ────────────────────────────────────────────────────────────────

function cleanAddressInput(input: AddressInput): { ok: true; value: AddressInput } | { ok: false; error: string } {
  const label = (input.label ?? "").trim().slice(0, 60)
  const street = (input.street ?? "").trim().slice(0, 500)
  const city = (input.city ?? "").trim().slice(0, 100)
  const province = input.province?.trim().slice(0, 100) || undefined
  const postalCode = input.postalCode?.trim().slice(0, 20) || undefined
  const country = (input.country ?? "Pakistan").trim().slice(0, 100) || "Pakistan"
  if (!street || !city) return { ok: false, error: "Please provide a street address and city." }
  return { ok: true, value: { label, street, city, province, postalCode, country } }
}

export interface AddressActionResult {
  ok: boolean
  error?: string
  address?: Address
}

export async function listAddressesAction(): Promise<Address[]> {
  const userId = await requireUserId()
  return getAddressesForUser(userId)
}

export async function createAddressAction(input: AddressInput): Promise<AddressActionResult> {
  let userId: string
  try {
    userId = await requireUserId()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "You must be signed in." }
  }
  if (!(await rateLimit("create-address", 10, 60_000))) {
    return { ok: false, error: "Too many attempts. Please wait a minute and try again." }
  }
  const clean = cleanAddressInput(input)
  if (!clean.ok) return { ok: false, error: clean.error }

  const address = await createAddress(userId, clean.value)
  return { ok: true, address }
}

export async function updateAddressAction(id: string, input: AddressInput): Promise<AddressActionResult> {
  let userId: string
  try {
    userId = await requireUserId()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "You must be signed in." }
  }
  const clean = cleanAddressInput(input)
  if (!clean.ok) return { ok: false, error: clean.error }

  const address = await updateAddress(userId, id, clean.value)
  if (!address) return { ok: false, error: "Address not found." }
  return { ok: true, address }
}

export async function deleteAddressAction(id: string): Promise<{ ok: boolean; error?: string }> {
  let userId: string
  try {
    userId = await requireUserId()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "You must be signed in." }
  }
  await deleteAddress(userId, id)
  return { ok: true }
}

export async function setDefaultAddressAction(id: string): Promise<AddressActionResult> {
  let userId: string
  try {
    userId = await requireUserId()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "You must be signed in." }
  }
  const address = await setDefaultAddress(userId, id)
  if (!address) return { ok: false, error: "Address not found." }
  return { ok: true, address }
}
