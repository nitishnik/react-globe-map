'use client'

import { FlashToast } from '@/homepage-map/components/FlashToast'
import { Matchline } from '@/homepage-map/components/Matchline'
import { PreferenceBar } from '@/homepage-map/components/PreferenceBar'
import { RankedPanel } from '@/homepage-map/components/RankedPanel'
import { RecommendationMapSurface } from '@/homepage-map/mapbox/RecommendationMapSurface'
import { useHomepageMap } from '@/homepage-map/useHomepageMap'

export function HomepageExplorer() {
  const map = useHomepageMap()

  return (
    <section aria-labelledby="discovery-title" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            id="discovery-title"
            className="font-[var(--hm-sans)] text-[11px] font-semibold tracking-[0.16em] text-[var(--hm-ink3)] uppercase"
          >
            Travel preferences
          </p>
          {/* <h2
            id="discovery-title"
            className="mt-1 max-w-xl font-[var(--hm-disp)] text-3xl leading-tight text-[var(--hm-ink)] sm:text-4xl"
          >
            Start with what matters to you.
          </h2> */}
        </div>
        {/* <p className="max-w-sm font-[var(--hm-sans)] text-sm leading-6 text-[var(--hm-ink2)]">
          Every place stays visible. What changes is our recommendation—and
          the trade-off we ask you to consider.
        </p> */}
      </div>

      <PreferenceBar aud={map.aud} onChange={map.setAud} />

      <div className="overflow-hidden rounded-[28px] border border-[var(--hm-hair)] bg-white shadow-[0_24px_70px_rgba(16,22,32,0.09)]">
        <div className="border-b border-[var(--hm-hair)] px-4 py-3 sm:px-5">
          <Matchline aud={map.aud} />
        </div>

        <div className="relative h-[280px] w-full border-b border-[var(--hm-hair)] sm:h-[400px] lg:h-[480px]">
          <RecommendationMapSurface
            camera={map.camera}
            aud={map.aud}
            level={map.level}
            countryId={map.countryId}
            cityId={map.cityId}
            poiName={map.poiName}
            onCountry={map.goCountry}
            onCity={map.goCity}
            onPoi={map.goPoi}
            onWorld={map.backWorld}
            onBackCountry={map.backCountry}
            onBackCity={map.backCity}
            onZoomIn={map.zoomIn}
            onZoomOut={map.zoomOut}
          />
          <FlashToast message={map.flash} onDone={map.clearFlash} />
        </div>

        <div
          className="h-[370px] overflow-y-auto overscroll-contain p-4 sm:h-[420px] sm:p-5"
          aria-live="polite"
        >
          <RankedPanel
            aud={map.aud}
            level={map.level}
            countryId={map.countryId}
            cityId={map.cityId}
            poiName={map.poiName}
            onCountry={map.goCountry}
            onCity={map.goCity}
            onPoi={map.goPoi}
          />
        </div>
      </div>

      <p className="font-[var(--hm-sans)] text-xs leading-5 text-[var(--hm-ink3)]">
        Prototype catalog: photo slots, review excerpts, prices, and booking
        actions await production services.
      </p>
    </section>
  )
}
