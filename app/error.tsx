'use client'

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--hm-page)] p-6">
      <div className="max-w-md rounded-3xl border border-[var(--hm-hair)] bg-white p-7 text-center">
        <h1 className="font-[var(--hm-disp)] text-3xl text-[var(--hm-ink)]">
          Recommendations are temporarily unavailable
        </h1>
        <p className="mt-3 font-[var(--hm-sans)] text-sm leading-6 text-[var(--hm-ink2)]">
          The page could not be prepared. Try again without losing your place.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 min-h-11 rounded-xl bg-[var(--hm-navy)] px-5 font-[var(--hm-sans)] text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
