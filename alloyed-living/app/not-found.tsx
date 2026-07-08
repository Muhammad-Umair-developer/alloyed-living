import Link from "next/link"

const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#faf9f7] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <p style={EDITORIAL} className="text-3xl font-light text-stone-700 mb-3 tracking-wide">
          Page Not Found
        </p>
        <p className="text-[10px] tracking-[0.28em] uppercase text-stone-600 mb-8">
          This piece has moved on
        </p>
        <p className="text-[11px] text-stone-600 tracking-wide leading-relaxed mb-10">
          The page you&apos;re looking for doesn&apos;t exist or is no longer available.
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-[9px] tracking-[0.34em] uppercase
                     text-stone-600 border-b border-stone-200 pb-0.5
                     hover:border-stone-700 hover:text-stone-900 transition-all duration-500"
        >
          Browse the Collection
        </Link>
      </div>
    </main>
  )
}
