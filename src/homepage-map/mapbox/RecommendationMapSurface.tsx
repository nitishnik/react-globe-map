'use client'

import dynamic from 'next/dynamic'
import type { GlobeMapProps } from '../globe/globeMapProps'

function MapLoadingCover() {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden bg-[var(--hm-sea)]"
      role="status"
      aria-label="Loading map"
    >
      <div className="absolute size-40 rounded-full bg-[radial-gradient(circle_at_35%_30%,#4aa3c7,transparent_62%)] opacity-70 sm:size-56" />
      <p className="relative z-10 rounded-full border border-white/70 bg-white/90 px-4 py-2 font-[var(--hm-sans)] text-xs font-semibold text-[var(--hm-ink2)] shadow-sm">
        Preparing your recommendation world…
      </p>
    </div>
  )
}

const LiveMap = dynamic(() => import('./MapboxMapSurface'), {
  ssr: false,
  loading: () => <MapLoadingCover />,
})

export function RecommendationMapSurface(props: GlobeMapProps) {
  return <LiveMap {...props} />
}
