import Link from 'next/link'
import { ArrowDown, Compass, Scale, Sparkles } from 'lucide-react'
import { HomepageExplorer } from '@/components/HomepageExplorer'
import { rankedDestinations } from '@/homepage-map/ranking'

const steps = [
  {
    icon: Compass,
    title: 'Start broad',
    copy: 'We shortlist countries for the traveller you are—not every place we sell.',
  },
  {
    icon: Scale,
    title: 'Show the cost',
    copy: 'Every recommendation carries a material trade-off before you move deeper.',
  },
  {
    icon: Sparkles,
    title: 'Get specific late',
    copy: 'Prices and product detail arrive only when they help the next decision.',
  },
]

export default function HomePage() {
  const defaultDestinations = rankedDestinations('family_traveler')

  return (
    <main className="min-h-screen bg-[var(--hm-page)]">
      <header className="border-b border-[var(--hm-hair)] bg-white/75 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-[1180px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="font-[var(--hm-disp)] text-xl font-semibold tracking-tight text-[var(--hm-ink)] no-underline"
          >
            RosoTravel
          </Link>
          <span className="font-[var(--hm-sans)] text-[10px] font-bold tracking-[0.16em] text-[var(--hm-ink3)] uppercase">
            Recommendation map prototype
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1180px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <section className="mb-12 grid gap-8 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
          <div>
            <p className="font-[var(--hm-sans)] text-xs font-bold tracking-[0.17em] text-[var(--hm-red)] uppercase">
              Destination discovery
            </p>
            <h1 className="mt-3 max-w-4xl font-[var(--hm-disp)] text-5xl leading-[.98] tracking-[-0.035em] text-[var(--hm-ink)] sm:text-6xl lg:text-7xl">
              Where should someone like me go?
            </h1>
          </div>
          <div className="border-l border-[var(--hm-hair2)] pl-5">
            <p className="font-[var(--hm-sans)] text-base leading-7 text-[var(--hm-ink2)]">
              Not a catalogue. A four-step recommendation funnel from country
              to the version worth booking.
            </p>
            <a
              href="#discovery-title"
              className="mt-4 inline-flex min-h-11 items-center gap-2 font-[var(--hm-sans)] text-sm font-semibold text-[var(--hm-ink)]"
            >
              Explore recommendations <ArrowDown size={16} aria-hidden />
            </a>
          </div>
        </section>

        <HomepageExplorer />

        <section
          aria-labelledby="how-title"
          className="mt-16 border-t border-[var(--hm-hair)] pt-10 sm:mt-20"
        >
          <p className="font-[var(--hm-sans)] text-[11px] font-semibold tracking-[0.16em] text-[var(--hm-ink3)] uppercase">
            How we do it
          </p>
          <h2
            id="how-title"
            className="mt-2 max-w-2xl font-[var(--hm-disp)] text-3xl text-[var(--hm-ink)] sm:text-4xl"
          >
            Fewer options. Better reasons.
          </h2>
          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, copy }, index) => (
              <article
                key={title}
                className="rounded-2xl border border-[var(--hm-hair)] bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <Icon size={20} className="text-[var(--hm-red)]" aria-hidden />
                  <span className="font-[var(--hm-sans)] text-xs text-[var(--hm-ink3)]">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-8 font-[var(--hm-sans)] text-base font-semibold text-[var(--hm-ink)]">
                  {title}
                </h3>
                <p className="mt-2 font-[var(--hm-sans)] text-sm leading-6 text-[var(--hm-ink2)]">
                  {copy}
                </p>
              </article>
            ))}
          </div>
        </section>

        <noscript>
          <section className="mt-10">
            <h2 className="font-[var(--hm-disp)] text-2xl">
              Recommended destinations
            </h2>
            <ul className="mt-4 space-y-2">
              {defaultDestinations.map((destination) => (
                <li key={destination.id}>
                  <Link href={`/destinations/${destination.id}`}>
                    {destination.name} — {destination.picks} picks
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </noscript>
      </div>
    </main>
  )
}
