import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DetailShell } from '@/components/DetailShell'
import { DESTINATIONS } from '@/homepage-map/data/catalog'
import {
  destinationById,
  rankedCities,
  tradeCountry,
  whyCountry,
} from '@/homepage-map/ranking'

export function generateStaticParams() {
  return DESTINATIONS.map((destination) => ({
    countryId: destination.id,
  }))
}

export default async function CountryPage({
  params,
}: {
  params: Promise<{ countryId: string }>
}) {
  const { countryId } = await params
  const destination = destinationById(countryId)
  if (!destination) notFound()
  const cities = rankedCities(countryId, 'family_traveler')

  return (
    <DetailShell
      eyebrow="Country recommendation"
      title={destination.name}
      summary={whyCountry(destination, 'family_traveler')}
      backHref="/"
      backLabel="Back to discovery map"
    >
      <h2 className="font-[var(--hm-sans)] text-sm font-bold tracking-wide uppercase">
        Where to base yourself
      </h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {cities.map((city) => (
          <Link
            key={city.id}
            href={`/destinations/${countryId}/${city.id}`}
            className="min-h-11 rounded-xl border border-[var(--hm-hair)] p-4 font-[var(--hm-sans)] text-sm font-semibold text-[var(--hm-ink)] no-underline hover:border-[var(--hm-hair2)]"
          >
            {city.name}
            <span className="mt-1 block text-xs font-normal text-[var(--hm-ink3)]">
              {city.picks} picks
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-6 rounded-xl bg-[var(--hm-wash)] p-4">
        <strong className="font-[var(--hm-sans)] text-xs uppercase">
          Trade-off
        </strong>
        <p className="mt-1 font-[var(--hm-sans)] text-sm leading-6 text-[var(--hm-ink2)]">
          {tradeCountry(destination, 'family_traveler')}
        </p>
      </div>
    </DetailShell>
  )
}
