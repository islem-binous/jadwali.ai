'use client'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base p-4">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-card">
          <svg className="h-8 w-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M12 12h.01" />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-bold text-text-primary">You&apos;re offline</h1>
        <p className="mt-2 text-sm text-text-secondary">Check your internet connection and try again.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
