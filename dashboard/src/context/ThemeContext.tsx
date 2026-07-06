"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

function readStoredChoice(): ThemeChoice {
  if (typeof window === "undefined") return "system"
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw === "light" || raw === "dark" || raw === "system") return raw
  } catch {
    // localStorage unavailable — fall back to system.
  }
  return "system"
}

// Light / Dark / System theme system for the dashboard.
//
// - "system" resolves live from `prefers-color-scheme` and reacts to OS changes.
// - The resolved theme is applied by toggling `.dark` on <html> and setting
//   `color-scheme`, so CSS-variable overrides in globals.css take effect.
// - The user's explicit choice is persisted in localStorage. A tiny inline
//   script in the root layout applies the same logic pre-hydration to avoid a
//   flash of the wrong theme.

export type ThemeChoice = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

// Keep this key in sync with the inline no-flash script in app/layout.tsx.
export const THEME_STORAGE_KEY = "alloyed-dashboard-theme"

interface ThemeContextValue {
  theme: ThemeChoice
  resolvedTheme: ResolvedTheme
  setTheme: (t: ThemeChoice) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  )
}

function resolve(choice: ThemeChoice): ResolvedTheme {
  if (choice === "system") return systemPrefersDark() ? "dark" : "light"
  return choice
}

function apply(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.classList.toggle("dark", resolved === "dark")
  root.style.colorScheme = resolved
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializers read the persisted choice on the client (the inline
  // no-flash script has already applied it to the DOM). On the server they
  // resolve to "system" — the provider renders no theme-dependent markup, so
  // there is no hydration mismatch.
  const [theme, setThemeState] = useState<ThemeChoice>(readStoredChoice)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolve(readStoredChoice()),
  )

  // Apply the resolved theme to the DOM whenever the choice changes, and — only
  // in system mode — follow live OS colour-scheme changes. State is only ever
  // updated inside the event callback below, never synchronously in the effect.
  useEffect(() => {
    apply(resolve(theme))

    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => {
      const next: ResolvedTheme = mq.matches ? "dark" : "light"
      apply(next)
      setResolvedTheme(next)
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme])

  const setTheme = useCallback((t: ThemeChoice) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t)
    } catch {
      // Ignore persistence failures (e.g. private mode); state still updates.
    }
    setThemeState(t)
    setResolvedTheme(resolve(t))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider")
  return ctx
}
