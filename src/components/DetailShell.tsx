import Link from 'next/link'

export function DetailShell({
  eyebrow,
  title,
  summary,
  backHref,
  backLabel,
  children,
}: {
  eyebrow: string
  title: string
  summary: string
  backHref: string
  backLabel: string
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-[var(--hm-page)] px-4 py-8 sm:px-6 sm:py-12">
      <article className="mx-auto max-w-3xl">
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center font-[var(--hm-sans)] text-sm font-semibold text-[var(--hm-ink2)]"
        >
          ← {backLabel}
        </Link>
        <div className="mt-5 rounded-[28px] border border-[var(--hm-hair)] bg-white p-6 shadow-[0_18px_50px_rgba(16,22,32,0.07)] sm:p-9">
          <p className="font-[var(--hm-sans)] text-[11px] font-bold tracking-[0.16em] text-[var(--hm-red)] uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-[var(--hm-disp)] text-4xl leading-tight text-[var(--hm-ink)] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl font-[var(--hm-sans)] text-base leading-7 text-[var(--hm-ink2)]">
            {summary}
          </p>
          <div className="mt-8 border-t border-[var(--hm-hair)] pt-6">
            {children}
          </div>
        </div>
      </article>
    </main>
  )
}
