import { notFound } from 'next/navigation'
import { DetailShell } from '@/components/DetailShell'
import { CITIES } from '@/homepage-map/data/catalog'
import {
  rankedProducts,
  whyAttraction,
} from '@/homepage-map/ranking'

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function generateStaticParams() {
  return Object.values(CITIES).flatMap((city) =>
    city.attractions.map((attraction) => ({
      countryId: city.countryId,
      cityId: city.id,
      attraction: slug(attraction.name),
    })),
  )
}

export default async function AttractionPage({
  params,
}: {
  params: Promise<{
    countryId: string
    cityId: string
    attraction: string
  }>
}) {
  const { countryId, cityId, attraction: attractionSlug } = await params
  const city = CITIES[cityId]
  const attraction = city?.attractions.find(
    (candidate) => slug(candidate.name) === attractionSlug,
  )
  if (!city || city.countryId !== countryId || !attraction) notFound()
  const products = rankedProducts(attraction)

  return (
    <DetailShell
      eyebrow={`${city.name} · ${attraction.category}`}
      title={attraction.name}
      summary={whyAttraction(attraction, 'family_traveler')}
      backHref={`/destinations/${countryId}/${cityId}`}
      backLabel="Back to city"
    >
      <h2 className="font-[var(--hm-sans)] text-sm font-bold tracking-wide uppercase">
        Choose your version
      </h2>
      <div className="mt-4 space-y-3">
        {products.map((product) => (
          <article
            key={product.title}
            className="rounded-2xl border border-[var(--hm-hair)] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-[var(--hm-sans)] text-sm font-semibold">
                  {product.title}
                </h3>
                <p className="mt-1 font-[var(--hm-sans)] text-xs text-[var(--hm-ink3)]">
                  ★ {product.rating} · {product.duration} ·{' '}
                  {product.reviews.toLocaleString('en-US')} reviews
                </p>
              </div>
              <strong className="font-[var(--hm-sans)] text-sm">
                €{product.price}
              </strong>
            </div>
            <p className="mt-3 font-[var(--hm-sans)] text-sm leading-6 text-[var(--hm-ink2)]">
              {product.why}
            </p>
            <div className="mt-3 rounded-lg bg-[var(--hm-wash)] p-3 font-[var(--hm-sans)] text-xs leading-5 text-[var(--hm-ink2)]">
              <strong className="text-[var(--hm-ink)]">Trade-off:</strong>{' '}
              {product.trade}
            </div>
            <button
              type="button"
              className="mt-4 min-h-11 w-full rounded-full bg-[var(--hm-red)] px-4 font-[var(--hm-sans)] text-sm font-semibold text-white"
            >
              Check dates · from €{product.price}
            </button>
          </article>
        ))}
      </div>
      <p className="mt-5 font-[var(--hm-sans)] text-xs text-[var(--hm-ink3)]">
        Prototype prices and booking actions are not live.
      </p>
    </DetailShell>
  )
}
