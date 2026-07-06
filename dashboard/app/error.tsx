"use client"

// Branded error boundary — replaces the default unstyled crash screen. Next.js
// strips server error details in production (digest only), so nothing leaks.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <p className="text-2xl font-light text-stone-700 mb-2">Something went wrong</p>
        <p className="text-sm text-stone-400 mb-8">
          An unexpected error occurred. Try again, or sign out and back in if it persists.
        </p>
        <button
          onClick={reset}
          className="text-sm text-stone-600 border-b border-stone-300 pb-0.5 cursor-pointer
                     hover:text-stone-900 hover:border-stone-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
