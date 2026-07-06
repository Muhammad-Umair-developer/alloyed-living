"use client"

// Branded error boundary. Next.js already strips server error details in
// production (clients only receive a digest), so nothing sensitive can leak
// here — this exists to replace the default unstyled error screen.

const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-[#faf9f7] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <p style={EDITORIAL} className="text-3xl font-light text-stone-700 mb-3 tracking-wide">
          Something Went Wrong
        </p>
        <p className="text-[10px] tracking-[0.28em] uppercase text-stone-400 mb-8">
          Please try again
        </p>
        <p className="text-[11px] text-stone-400 tracking-wide leading-relaxed mb-10">
          An unexpected error occurred. If this keeps happening, please contact our
          concierge team.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 text-[9px] tracking-[0.34em] uppercase
                     text-stone-600 border-b border-stone-200 pb-0.5 cursor-pointer
                     hover:border-stone-700 hover:text-stone-900 transition-all duration-500"
        >
          Try Again
        </button>
      </div>
    </main>
  )
}
