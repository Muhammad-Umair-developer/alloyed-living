"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client"

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  role: string
}

interface AuthContextValue {
  supabase: SupabaseClient
  user: User | null
  profile: Profile | null
  loading: boolean
  displayName: string
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({
  supabaseUrl,
  supabaseAnonKey,
  children,
}: {
  supabaseUrl: string
  supabaseAnonKey: string
  children: React.ReactNode
}) {
  // One stable browser client for the app's lifetime.
  const [supabase] = useState(() => createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey))
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(
    async (u: User | null) => {
      if (!u) {
        setProfile(null)
        return
      }
      // Row created automatically by the DB trigger on sign-up; RLS lets a user
      // read their own profile. We never create/duplicate it here.
      const { data } = await supabase
        .from("profiles")
        .select("id,email,full_name,avatar_url,role")
        .eq("id", u.id)
        .single()
      setProfile((data as Profile) ?? null)
    },
    [supabase],
  )

  useEffect(() => {
    let active = true
    // Track the last identity we loaded a profile for, so token refreshes
    // (which fire TOKEN_REFRESHED every hour and on tab focus) don't trigger a
    // redundant profile re-fetch when the user hasn't actually changed.
    let loadedUserId: string | null = null

    // onAuthStateChange emits INITIAL_SESSION synchronously on subscribe, so it
    // covers the initial read too — no separate getSession() call is needed
    // (calling both caused the profile to be fetched twice on every mount).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)

      const nextId = nextUser?.id ?? null
      if (nextId === loadedUserId) {
        setLoading(false)
        return
      }
      loadedUserId = nextId

      // Defer the profile query out of the callback. Awaiting another Supabase
      // call *inside* onAuthStateChange can deadlock gotrue's internal auth
      // lock, stalling sign-in/navigation for seconds until it times out.
      setTimeout(() => {
        if (!active) return
        void loadProfile(nextUser).finally(() => {
          if (active) setLoading(false)
        })
      }, 0)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase, loadProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [supabase])

  const displayName =
    profile?.full_name ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Account"

  const value = useMemo<AuthContextValue>(
    () => ({ supabase, user, profile, loading, displayName, signOut }),
    [supabase, user, profile, loading, displayName, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>")
  return ctx
}
