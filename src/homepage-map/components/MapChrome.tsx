import { ChevronRight } from 'lucide-react'
import { CITIES } from '../data/catalog'
import { destinationById } from '../ranking'
import type { MapLevel } from '../types'

interface MapChromeProps {
  level: MapLevel
  countryId: string | null
  cityId: string | null
  projectionMode: 'flat' | 'globe'
  onWorld: () => void
  onCountry: () => void
  onCity: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onProjection: (mode: 'flat' | 'globe') => void
}

const controlClass =
  'flex size-11 items-center justify-center rounded-full border border-white/80 bg-white/95 text-lg font-medium text-[var(--hm-ink)] shadow-[0_6px_18px_rgba(16,22,32,0.14)] transition hover:bg-white'

function Crumb({
  label,
  active,
  onClick,
}: {
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`inline-flex min-h-11 items-center rounded-full px-3 font-[var(--hm-sans)] text-[11px] font-semibold tracking-wide shadow-[0_6px_16px_rgba(16,22,32,0.1)] transition ${
        active
          ? 'bg-[var(--hm-red)] text-white'
          : 'border border-white/80 bg-white/95 text-[var(--hm-ink)] hover:bg-white'
      }`}
    >
      {label}
    </button>
  )
}

export function MapChrome({
  level,
  countryId,
  cityId,
  projectionMode,
  onWorld,
  onCountry,
  onCity,
  onZoomIn,
  onZoomOut,
  onProjection,
}: MapChromeProps) {
  const country = countryId ? destinationById(countryId) : null
  const city = cityId ? CITIES[cityId] : null

  return (
    <>
      <div className="pointer-events-none absolute left-3 top-3 z-50 flex max-w-[70%] flex-wrap items-center gap-1 sm:left-4 sm:top-4">
        <div className="pointer-events-auto flex flex-wrap items-center gap-1">
          <Crumb
            label="World"
            active={level === 'world'}
            onClick={level === 'world' ? undefined : onWorld}
          />
          {country && level !== 'world' && (
            <>
              <ChevronRight className="size-3 text-white drop-shadow" />
              <Crumb
                label={country.name}
                active={level === 'country'}
                onClick={level === 'country' ? undefined : onCountry}
              />
            </>
          )}
          {city && (level === 'city' || level === 'poi') && (
            <>
              <ChevronRight className="size-3 text-white drop-shadow" />
              <Crumb
                label={city.name}
                active={level === 'city' || level === 'poi'}
                onClick={level === 'poi' ? onCity : undefined}
              />
            </>
          )}
        </div>
      </div>

      <div className="absolute right-3 top-3 z-50 flex flex-col gap-2 sm:right-4 sm:top-4">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={onZoomIn}
          className={controlClass}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={onZoomOut}
          disabled={level === 'world'}
          className={`${controlClass} disabled:cursor-default disabled:opacity-40`}
        >
          −
        </button>
        <button
          type="button"
          aria-label={
            projectionMode === 'globe'
              ? 'Switch to flat map'
              : 'Switch to globe'
          }
          aria-pressed={projectionMode === 'globe'}
          onClick={() =>
            onProjection(projectionMode === 'globe' ? 'flat' : 'globe')
          }
          className={`flex size-11 items-center justify-center rounded-full border font-[var(--hm-sans)] text-[9px] font-bold tracking-wide uppercase shadow-[0_6px_18px_rgba(16,22,32,0.14)] transition ${
            projectionMode === 'globe'
              ? 'border-[var(--hm-red)] bg-[var(--hm-red)] text-white'
              : 'border-white/80 bg-white/95 text-[var(--hm-ink2)] hover:bg-white'
          }`}
        >
          Globe
        </button>
      </div>
    </>
  )
}
