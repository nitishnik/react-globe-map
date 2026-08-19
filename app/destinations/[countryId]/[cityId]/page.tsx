import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DetailShell } from '@/components/DetailShell'
import { CITIES } from '@/homepage-map/data/catalog'
import { rankedAttractions, whyCity } from '@/homepage-map/ranking'

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function generateStaticParams() {
  return Object.values(CITIES).map((city) => ({
    countryId: city.countryId,
    cityId: city.id,
  }))
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ countryId: string; cityId: string }>
}) {
  const { countryId, cityId } = await params
  const city = CITIES[cityId]
  if (!city || city.countryId !== countryId) notFound()
  const attractions = rankedAttractions(cityId, 'family_traveler')

  return (
    <DetailShell
      eyebrow="City recommendation"
      title={city.name}
      summary={whyCity(city, 'family_traveler')}
      backHref={`/destinations/${countryId}`}
      backLabel="Back to country"
    >
      <h2 className="font-[var(--hm-sans)] text-sm font-bold tracking-wide uppercase">
        What is worth your time
      </h2>
      <div className="mt-4 space-y-2">
        {attractions.map((attraction) => (
          <Link
            key={attraction.name}
            href={`/destinations/${countryId}/${cityId}/${slug(attraction.name)}`}
            className="flex min-h-11 items-center justify-between rounded-xl border border-[var(--hm-hair)] p-4 font-[var(--hm-sans)] text-sm text-[var(--hm-ink)] no-underline hover:border-[var(--hm-hair2)]"
          >
            <span>
              <strong>{attraction.name}</strong>
              <small className="mt-1 block text-[var(--hm-ink3)]">
                {attraction.category} · ★ {attraction.rating}
              </small>
            </span>
            <span className="font-semibold">from €{attraction.from}</span>
          </Link>
        ))}
      </div>
    </DetailShell>
  )
}
