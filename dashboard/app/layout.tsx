import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import ToastContainer from "@/src/components/ui/ToastAlert"
import { AuthProvider } from "@/src/context/AuthContext"
import { ThemeProvider } from "@/src/context/ThemeContext"
import { getSupabaseEnv } from "@/src/lib/supabase/env"

// Applies the persisted Light/Dark/System choice before first paint to avoid a
// flash of the wrong theme. Kept in sync with THEME_STORAGE_KEY in ThemeContext.
const THEME_NO_FLASH_SCRIPT = `(function(){try{var k='alloyed-dashboard-theme';var t=localStorage.getItem(k);if(t!=='light'&&t!=='dark'&&t!=='system')t='system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(e){}})();`

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Alloyed Living — Admin Dashboard",
  description: "Manage products, content, orders, and analytics for Alloyed Living.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { url, anonKey } = getSupabaseEnv()
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_NO_FLASH_SCRIPT }} />
      </head>
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider supabaseUrl={url} supabaseAnonKey={anonKey}>
            <ToastContainer />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
