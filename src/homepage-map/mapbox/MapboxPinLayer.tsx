'use client'

import type { Map as MapboxMap } from 'mapbox-gl'
import { useCallback, useEffect, useState } from 'react'
import { PillMarker } from '../components/PillMarker'
import type { MapPin } from '../components/pinModels'
import { CITIES } from '../data/catalog'
import { layoutPins, type PlacedPin } from '../geo/pinLayout'
import type { MapLevel } from '../types'

export function MapboxPinLayer({
  map,
  pins,
  level,
  cityId,
}: {
  map: MapboxMap
  pins: MapPin[]
  level: MapLevel
  cityId: string | null
}) {
  const [placed, setPlaced] = useState<PlacedPin[]>([])
  const [scaleWidth, setScaleWidth] = useState(72)
  const [cityCentre, setCityCentre] = useState<{
    x: number
    y: number
    name: string
  } | null>(null)
  const update = useCallback(() => {
    const container = map.getContainer()
    const width = container.clientWidth
    const height = container.clientHeight
    if (!width || !height) return

    setPlaced(
      layoutPins({
        pins,
        width,
        height,
        padding: { top: 64, right: 62, bottom: 36, left: 14 },
        mode:
          level === 'world'
            ? 'world'
            : level === 'country'
              ? 'country'
              : 'city',
        project: (lat, lng) => {
          const point = map.project([lng, lat])
          if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
            return null
          }
          return [point.x, point.y]
        },
      }),
    )

    const city = cityId ? CITIES[cityId] : null
    if (city && (level === 'city' || level === 'poi')) {
      const kmPerLngDegree = Math.max(
        1,
        111.32 * Math.cos((city.lat * Math.PI) / 180),
      )
      const centre = map.project([city.lng, city.lat])
      const east = map.project([city.lng + 1 / kmPerLngDegree, city.lat])
      setScaleWidth(Math.max(38, Math.min(132, Math.abs(east.x - centre.x))))
      setCityCentre({ x: centre.x, y: centre.y, name: city.name })
    } else {
      setCityCentre(null)
    }
  }, [cityId, level, map, pins])

  useEffect(() => {
    const resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(map.getContainer())
    map.on('move', update)
    map.on('resize', update)
    map.on('idle', update)
    const initialFrame = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(initialFrame)
      resizeObserver.disconnect()
      map.off('move', update)
      map.off('resize', update)
      map.off('idle', update)
    }
  }, [map, update])

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
      aria-label="Recommendation pins"
    >
      <svg
        className="pointer-events-none absolute inset-0 overflow-visible"
        width="100%"
        height="100%"
        aria-hidden
      >
        {placed.map((item) => {
          if (
            item.heldBack ||
            Math.hypot(item.x - item.anchorX, item.y - item.anchorY) < 18
          ) {
            return null
          }
          return (
            <line
              key={`${item.pin.key}-leader`}
              x1={item.anchorX}
              y1={item.anchorY}
              x2={item.x}
              y2={item.y}
              stroke="var(--hm-hair2)"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
          )
        })}
      </svg>

      {placed
        .filter((item) => !item.heldBack)
        .map(({ pin, x, y, showLabel, showCount }) => (
          <PillMarker
            key={pin.key}
            x={x}
            y={y}
            label={pin.label}
            count={pin.count}
            tier={pin.tier}
            selected={pin.selected}
            quiet={pin.quiet}
            showLabel={showLabel}
            showCount={showCount}
            zIndex={pin.selected ? 40 : 20 + (3 - pin.rank)}
            onClick={pin.onClick}
          />
        ))}

      {(level === 'city' || level === 'poi') && cityId ? (
        <div className="absolute bottom-12 left-4 rounded-md border border-[var(--hm-hair)] bg-white/90 px-2 py-1.5 font-[var(--hm-sans)] text-[10px] font-semibold tracking-wide text-[var(--hm-ink2)] shadow-sm backdrop-blur-sm">
          <span
            className="mb-1 block border-x border-t border-[var(--hm-ink2)]"
            style={{ width: scaleWidth, height: 4 }}
            aria-hidden
          />
          1 km
        </div>
      ) : null}

      {cityCentre ? (
        <span
          className="absolute -translate-x-1/2 translate-y-3 font-[var(--hm-sans)] text-[10px] font-semibold tracking-wide text-[var(--hm-ink2)]"
          style={{ left: cityCentre.x, top: cityCentre.y }}
        >
          {cityCentre.name}
        </span>
      ) : null}
    </div>
  )
}
