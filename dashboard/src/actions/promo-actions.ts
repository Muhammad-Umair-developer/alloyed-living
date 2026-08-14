"use server"

import { revalidatePath } from "next/cache"
import { requireDashboardUser } from "@/src/lib/auth/require-admin"
import { createPromoCode, updatePromoCode, setPromoCodeActive } from "@/src/lib/data/promo-codes"
import type { PromoCode, PromoCodeInput } from "@/src/lib/data/promo-codes"

// Every action here writes through the service-role client, so each one
// starts with requireDashboardUser() — same pattern as product-actions.ts.
// No deletePromoCodeAction exists here — deactivate (toggleActiveAction) is
// the only removal path; see promo-codes.ts's comment on setPromoCodeActive.

function revalidatePromoRoutes(id?: string) {
  revalidatePath("/promo-codes")
  if (id) revalidatePath(`/promo-codes/${id}/edit`)
}

export async function createPromoCodeAction(input: PromoCodeInput): Promise<PromoCode> {
  await requireDashboardUser()
  const promo = await createPromoCode(input)
  revalidatePromoRoutes()
  return promo
}

export async function updatePromoCodeAction(id: string, patch: Partial<PromoCodeInput>): Promise<PromoCode | null> {
  await requireDashboardUser()
  const promo = await updatePromoCode(id, patch)
  revalidatePromoRoutes(id)
  return promo
}

export async function toggleActiveAction(id: string, active: boolean): Promise<PromoCode | null> {
  await requireDashboardUser()
  const promo = await setPromoCodeActive(id, active)
  revalidatePromoRoutes(id)
  return promo
}
