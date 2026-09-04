'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Map, { Marker, type MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { FeatureCollection, Feature, Polygon, LineString } from 'geojson'
import { Hand } from 'lucide-react'
import { MapChrome } from '../components/MapChrome'
import { PillFace } from '../components/PillMarker'
import { pinsForLevel, type MapPin } from '../components/pinModels'
import { CITIES } from '../data/catalog'
import { geoBounds } from '../geo/bounds'
import { countryFeature } from '../geo/worldData'
import { cityRingLatLngs } from '../geo/cityRings'
import type { MapLevel } from '../types'
import type { GlobeMapProps } from '../globe/globeMapProps'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!

/* ───── Level → projection ───── */

function projectionForLevel(level: MapLevel): 'globe' | 'mercator' {
  return level === 'world' ? 'globe' : 'mercator'
}

/* ───── View target calculation ───── */

function viewTarget(
  level: MapLevel,
  pins: MapPin[],
  fallbackCenter: { lat: number; lng: number },
  countryId: string | null,
  cityId: string | null,
): {
  latitude: number
  longitude: number
  zoom: number
  bounds?: { north: number; south: number; east: number; west: number }
} {
  if (level === 'country' && countryId) {
    const feature = countryFeature(countryId)
    if (feature) {
      const bounds = geoBounds(feature.geometry)
      return {
        latitude: (bounds.north + bounds.south) / 2,
        longitude: (bounds.east + bounds.west) / 2,
        zoom: 5.5,
        bounds,
      }
    }
  }

  if ((level === 'city' || level === 'poi') && cityId) {
    const city = CITIES[cityId]
    if (city) {
      return {
        latitude: city.lat,
        longitude: city.lng,
        zoom: 12.5,
      }
    }
  }

  return {
    latitude: fallbackCenter.lat,
    longitude: fallbackCenter.lng,
    zoom: 1.8,
  }
}

/* ───── City ring GeoJSON source ───── */

function cityRingsGeoJSON(cityId: string | null, pins: MapPin[]): FeatureCollection | null {
  if (!cityId) return null
  const rings = cityRingLatLngs(cityId, pins)
  if (rings.length === 0) return null
  const features: (Feature<Polygon> | Feature<LineString>)[] = rings.flatMap((ring) => {
    const coords: [number, number][] = ring.points.map((p) => [p.lng, p.lat])
    return [
      {
        type: 'Feature' as const,
        properties: { outer: ring.outer, kind: 'fill' },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [coords],
        },
      },
      {
        type: 'Feature' as const,
        properties: { outer: ring.outer, kind: 'stroke' },
        geometry: {
          type: 'LineString' as const,
          coordinates: coords,
        },
      },
    ]
  })
  return { type: 'FeatureCollection', features }
}

/* ───── MapboxPinMarker ───── */

function MapboxPinMarker({
  pin,
  onClick,
}: {
  pin: MapPin
  onClick: () => void
}) {
  return (
    <Marker
      latitude={pin.lat}
      longitude={pin.lng}
      anchor="bottom"
      style={{ zIndex: pin.selected ? 60 : 20 + (3 - pin.rank) }}
    >
      <button
        type="button"
        aria-label={pin.label}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center transition-transform duration-150 hover:scale-105 [&_*]:pointer-events-none"
      >
        <PillFace
          label={pin.label}
          count={pin.count}
          tier={pin.tier}
          selected={pin.selected}
          quiet={pin.quiet}
        />
      </button>
    </Marker>
  )
}

/* ───── Loading cover ───── */

function MapLoadingCover() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-[var(--hm-sea)]"
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

/* ───── Manage ring layers ───── */

function ensureRingLayers(map: mapboxgl.Map, data: FeatureCollection | null) {
  const sourceId = 'city-rings'

  if (data) {
    const existingSource = map.getSource(sourceId)
    if (existingSource && 'setData' in existingSource) {
      ;(existingSource as { setData: (d: object) => void }).setData(data)
      return
    }

    // Clean slate
    try { if (map.getLayer('city-rings-fill')) map.removeLayer('city-rings-fill') } catch { /* noop */ }
    try { if (map.getLayer('city-rings-outer-stroke')) map.removeLayer('city-rings-outer-stroke') } catch { /* noop */ }
    try { if (map.getLayer('city-rings-inner-stroke')) map.removeLayer('city-rings-inner-stroke') } catch { /* noop */ }
    try { if (map.getSource(sourceId)) map.removeSource(sourceId) } catch { /* noop */ }

    map.addSource(sourceId, {
      type: 'geojson',
      data,
    })

    // Fill layer
    map.addLayer({
      id: 'city-rings-fill',
      type: 'fill',
      source: sourceId,
      filter: ['==', ['get', 'kind'], 'fill'],
      paint: {
        'fill-color': [
          'case',
          ['get', 'outer'],
          'rgba(230, 57, 70, 0.10)',
          'rgba(230, 57, 70, 0.04)',
        ],
      },
    })

    // Outer ring stroke (solid)
    map.addLayer({
      id: 'city-rings-outer-stroke',
      type: 'line',
      source: sourceId,
      filter: ['all', ['==', ['get', 'kind'], 'stroke'], ['==', ['get', 'outer'], true]],
      paint: {
        'line-color': '#e63946',
        'line-width': 2.5,
      },
    })

    // Inner ring strokes (dashed)
    map.addLayer({
      id: 'city-rings-inner-stroke',
      type: 'line',
      source: sourceId,
      filter: ['all', ['==', ['get', 'kind'], 'stroke'], ['==', ['get', 'outer'], false]],
      paint: {
        'line-color': 'rgba(230, 57, 70, 0.5)',
        'line-width': 1.5,
        'line-dasharray': [4, 3],
      },
    })
  } else {
    // Remove ring layers
    try { if (map.getLayer('city-rings-fill')) map.removeLayer('city-rings-fill') } catch { /* noop */ }
    try { if (map.getLayer('city-rings-outer-stroke')) map.removeLayer('city-rings-outer-stroke') } catch { /* noop */ }
    try { if (map.getLayer('city-rings-inner-stroke')) map.removeLayer('city-rings-inner-stroke') } catch { /* noop */ }
    try { if (map.getSource(sourceId)) map.removeSource(sourceId) } catch { /* noop */ }
  }
}

/* ───── Configure atmosphere ───── */

function configureAtmosphere(map: mapboxgl.Map, isGlobe: boolean) {
  try {
    if (isGlobe) {
      map.setProjection('globe')
      map.setFog({
        color: 'rgb(186, 210, 235)',
        'high-color': 'rgb(36, 92, 223)',
        'horizon-blend': 0.02,
        'space-color': 'rgb(11, 11, 25)',
        'star-intensity': 0.6,
      })
    } else {
      map.setProjection('mercator')
      map.setFog(null as never)
    }
  } catch {
    // noop
  }
}

/* ───── Main component ───── */

export default function MapboxMapSurface(props: GlobeMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [ready, setReady] = useState(false)
  const [showHint, setShowHint] = useState(true)
  const prevLevelRef = useRef<MapLevel>(props.level)

  const pins = useMemo(
    () =>
      pinsForLevel({
        aud: props.aud,
        level: props.level,
        countryId: props.countryId,
        cityId: props.cityId,
        poiName: props.poiName,
        onCountry: props.onCountry,
        onCity: props.onCity,
        onPoi: props.onPoi,
      }),
    [
      props.aud,
      props.cityId,
      props.countryId,
      props.level,
      props.onCity,
      props.onCountry,
      props.onPoi,
      props.poiName,
    ],
  )

  const view = useMemo(
    () =>
      viewTarget(
        props.level,
        pins,
        props.camera.center,
        props.countryId,
        props.cityId,
      ),
    [pins, props.camera.center, props.cityId, props.countryId, props.level],
  )

  /* Fly the camera when the target changes */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const mapInstance = map.getMap()

    // Update projection and atmosphere
    const isGlobe = projectionForLevel(props.level) === 'globe'
    configureAtmosphere(mapInstance, isGlobe)

    // Determine animation speed based on level transition
    const levelChanged = prevLevelRef.current !== props.level
    prevLevelRef.current = props.level
    const duration = levelChanged ? 1400 : 800

    // If we have bounds (country level), fit to bounds
    if (view.bounds) {
      map.fitBounds(
        [
          [view.bounds.west, view.bounds.south],
          [view.bounds.east, view.bounds.north],
        ],
        {
          padding: { top: 60, bottom: 40, left: 40, right: 40 },
          duration,
          maxZoom: 8,
        },
      )
    } else {
      map.flyTo({
        center: [view.longitude, view.latitude],
        zoom: view.zoom,
        duration,
        essential: true,
      })
    }
  }, [ready, view, props.level])

  /* City ring layers */
  const showRings = props.level === 'city' || props.level === 'poi'
  const ringData = useMemo(
    () => (showRings ? cityRingsGeoJSON(props.cityId, pins) : null),
    [showRings, props.cityId, pins],
  )

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !ready) return
    ensureRingLayers(map, ringData)
  }, [ready, ringData])

  /* Map style — use a single style; Mapbox Standard works for both globe and flat */
  const mapStyle = 'mapbox://styles/mapbox/light-v11'

  const handleMapLoad = useCallback(() => {
    setReady(true)
    const map = mapRef.current?.getMap()
    if (!map) return

    // Set initial projection and atmosphere
    const isGlobe = projectionForLevel(props.level) === 'globe'
    configureAtmosphere(map, isGlobe)
  }, [props.level])

  const handleMoveStart = useCallback(() => {
    setShowHint(false)
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          latitude: view.latitude,
          longitude: view.longitude,
          zoom: view.zoom,
        }}
        mapStyle={mapStyle}
        projection="globe"
        interactive
        scrollZoom={false}
        doubleClickZoom={false}
        onLoad={handleMapLoad}
        onMoveStart={handleMoveStart}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        {/* Pin markers */}
        {ready &&
          pins.map((pin) => (
            <MapboxPinMarker
              key={pin.key}
              pin={pin}
              onClick={pin.onClick}
            />
          ))}
      </Map>

      {/* Map chrome (breadcrumbs + zoom controls) */}
      <MapChrome
        level={props.level}
        countryId={props.countryId}
        cityId={props.cityId}
        onWorld={props.onWorld}
        onCountry={props.onBackCountry}
        onCity={props.onBackCity}
        onZoomIn={props.onZoomIn}
        onZoomOut={props.onZoomOut}
      />

      {/* Drag hint */}
      {showHint && ready ? (
        <p className="pointer-events-none absolute bottom-4 left-3 z-40 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1.5 font-[var(--hm-sans)] text-[11px] font-semibold text-[var(--hm-ink)] shadow-[0_8px_24px_rgba(16,22,32,0.14)] backdrop-blur-sm sm:left-4">
          <Hand className="size-3.5 text-[var(--hm-ink2)]" aria-hidden />
          Drag to explore
        </p>
      ) : null}

      {/* Loading cover */}
      {!ready ? <MapLoadingCover /> : null}
    </div>
  )
}
