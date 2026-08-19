import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--hm-page)] p-6">
      <div className="max-w-md text-center">
        <p className="font-[var(--hm-sans)] text-xs font-bold tracking-widest text-[var(--hm-red)] uppercase">
          Recommendation not found
        </p>
        <h1 className="mt-2 font-[var(--hm-disp)] text-4xl text-[var(--hm-ink)]">
          This route is outside our shortlist.
        </h1>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[var(--hm-navy)] px-5 font-[var(--hm-sans)] text-sm font-semibold text-white no-underline"
        >
          Return to the discovery map
        </Link>
      </div>
    </main>
  )
}
