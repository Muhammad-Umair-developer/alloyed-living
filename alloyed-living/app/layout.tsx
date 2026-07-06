import type { Metadata } from "next"
import { Geist, Geist_Mono, Cormorant_Garamond } from "next/font/google"
import "./globals.css"
import Footer from "@/src/components/layout/Footer"
import { CartProvider } from "@/src/context/CartContext"
import { AuthProvider } from "@/src/context/AuthContext"
import { getSupabaseEnv } from "@/src/lib/supabase/env"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const cormorant = Cormorant_Garamond({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Alloyed Living",
  description: "Ultra-luxury furniture and home decor, curated for the discerning home.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { url, anonKey } = getSupabaseEnv()
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#faf9f7] text-stone-800" suppressHydrationWarning>
        <AuthProvider supabaseUrl={url} supabaseAnonKey={anonKey}>
          <CartProvider>
            {children}
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
