import "server-only"
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin"
import type { Settings } from "./types"

type SettingsRow = Record<string, unknown>

function rowToSettings(r: SettingsRow): Settings {
  return {
    storeName: (r.store_name as string) ?? "",
    accentColor: (r.accent_color as string) ?? "",
    supportEmail: (r.support_email as string) ?? "",
    admins: (r.admins as Settings["admins"]) ?? [],
    apiKeys: (r.api_keys as Settings["apiKeys"]) ?? [],
  }
}

export async function getSettings(): Promise<Settings> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from("settings").select("*").eq("id", 1).single()
  if (error) throw error
  return rowToSettings(data)
}


export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const supabase = createSupabaseAdminClient()
  const row: SettingsRow = {}
  if (patch.storeName !== undefined) row.store_name = patch.storeName
  if (patch.accentColor !== undefined) row.accent_color = patch.accentColor
  if (patch.supportEmail !== undefined) row.support_email = patch.supportEmail
  if (patch.admins !== undefined) row.admins = patch.admins
  if (patch.apiKeys !== undefined) row.api_keys = patch.apiKeys

  const { data, error } = await supabase.from("settings").update(row).eq("id", 1).select("*").single()
  if (error) throw error
  return rowToSettings(data)
}
