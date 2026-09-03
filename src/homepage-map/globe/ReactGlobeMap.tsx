'use client'

import { Hand } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createRoot, type Root } from 'react-dom/client'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { MapChrome } from '../components/MapChrome'
import { PillFace, PillMarker } from '../components/PillMarker'
import { pinsForLevel, type MapPin } from '../components/pinModels'
import { CITIES } from '../data/catalog'
import { catalogCountryCollection } from '../geo/catalogCountries'
import { layoutPins, type PlacedPin } from '../geo/pinLayout'
import type { MapLevel } from '../types'
import type { GlobeMapProps } from './globeMapProps'

type CountryFeature = {
  properties?: {
    countryId?: string | null
    selected?: boolean
    tier?: number
  }
}

function angularDistanceDeg(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
) {
  const toRad = Math.PI / 180
  const lat1 = aLat * toRad
  const lat2 = bLat * toRad
  const dLat = (bLat - aLat) * toRad
  const dLng = (bLng - aLng) * toRad
  const sine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return (2 * Math.asin(Math.min(1, Math.sqrt(sine)))) / toRad
}

function altitudeForLevel(level: MapLevel, frameHeight: number) {
  const lift =
    frameHeight > 0 ? Math.min(2.4, Math.max(1, 420 / frameHeight)) : 1
  if (level === 'world') return 2.35
  if (level === 'country') return 1.4
  if (level === 'poi') return 0.1 * lift
  return 0.13 * lift
}

function viewTarget(
  level: MapLevel,
  pins: MapPin[],
  fallback: { lat: number; lng: number },
  cityId: string | null,
  frameHeight: number,
) {
  if ((level !== 'city' && level !== 'poi') || pins.length === 0) {
    return {
      lat: fallback.lat,
      lng: fallback.lng,
      altitude: altitudeForLevel(level, frameHeight),
    }
  }
  const city = cityId ? CITIES[cityId] : null
  return {
    lat: city?.lat ?? pins.reduce((sum, pin) => sum + pin.lat, 0) / pins.length,
    lng: city?.lng ?? pins.reduce((sum, pin) => sum + pin.lng, 0) / pins.length,
    altitude: altitudeForLevel(level, frameHeight),
  }
}

function screenCityRings(
  centre: { x: number; y: number } | null,
  pins: { x: number; y: number }[],
  frame: { width: number; height: number },
) {
  if (!centre && pins.length === 0) return []
  const cx =
    centre?.x ?? pins.reduce((sum, pin) => sum + pin.x, 0) / pins.length
  const cy =
    centre?.y ?? pins.reduce((sum, pin) => sum + pin.y, 0) / pins.length
  let rx = 88
  let ry = 70
  for (const pin of pins) {
    rx = Math.max(rx, Math.abs(pin.x - cx) + 48)
    ry = Math.max(ry, Math.abs(pin.y - cy) + 56)
  }
  rx = Math.min(
    rx,
    Math.max(64, Math.min(cx - 18, frame.width - cx - 18)),
  )
  ry = Math.min(
    ry,
    Math.max(52, Math.min(cy - 70, frame.height - cy - 24)),
  )
  return [0.42, 0.7, 1].map((scale, index, all) => ({
    cx,
    cy,
    rx: rx * scale,
    ry: ry * scale,
    outer: index === all.length - 1,
  }))
}

function polygonCapColor(feature: object) {
  const properties = (feature as CountryFeature).properties
  if (properties?.selected) return '#d4c4aa'
  if (properties?.tier === 0) return '#e6d7c2'
  if (properties?.tier != null && properties.tier <= 3) return '#ede8de'
  return 'rgba(237, 232, 222, 0.58)'
}

function polygonAltitude(feature: object) {
  const properties = (feature as CountryFeature).properties
  if (properties?.selected) return 0.016
  if (properties?.countryId) return 0.007
  return 0.003
}

function polygonStrokeColor() {
  return '#d3ccbf'
}

function GlobeLoadingCover() {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden bg-[var(--hm-sea)]"
      role="status"
      aria-label="Loading globe"
    >
      <div className="absolute size-40 rounded-full bg-[radial-gradient(circle_at_35%_30%,#4aa3c7,transparent_62%)] opacity-70 sm:size-56" />
      <p className="relative z-10 rounded-full border border-white/70 bg-white/90 px-4 py-2 font-[var(--hm-sans)] text-xs font-semibold text-[var(--hm-ink2)] shadow-sm">
        Preparing your recommendation world…
      </p>
    </div>
  )
}

export default function ReactGlobeMap(props: GlobeMapProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const pinRootsRef = useRef(new Map<string, { root: Root; el: HTMLDivElement }>())
  const callbacksRef = useRef(props)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [ready, setReady] = useState(false)
  const [showHint, setShowHint] = useState(true)
  const [placed, setPlaced] = useState<PlacedPin[]>([])
  const [cityMark, setCityMark] = useState<{
    x: number
    y: number
    name: string
  } | null>(null)
  const [ringShapes, setRingShapes] = useState<
    { cx: number; cy: number; rx: number; ry: number; outer: boolean }[]
  >([])

  const overlayPins = props.level === 'city' || props.level === 'poi'

  const countries = useMemo(
    () => catalogCountryCollection(props.aud, props.countryId).features,
    [props.aud, props.countryId],
  )

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
        props.cityId,
        size.height,
      ),
    [pins, props.camera.center, props.cityId, props.level, size.height],
  )
  const viewRef = useRef(view)
  viewRef.current = view

  useEffect(() => {
    callbacksRef.current = props
  }, [props])

  useLayoutEffect(() => {
    const node = frameRef.current
    if (!node) return
    const measure = () => {
      setSize({ width: node.clientWidth, height: node.clientHeight })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const relayoutOverlay = useCallback(() => {
    const globe = globeRef.current
    if (!globe || !overlayPins || size.width === 0 || size.height === 0) {
      setPlaced([])
      setCityMark(null)
      setRingShapes([])
      return
    }
    const pov = globe.pointOfView()
    const city = props.cityId ? CITIES[props.cityId] : null
    if (city) {
      if (pov && angularDistanceDeg(pov.lat, pov.lng, city.lat, city.lng) > 88) {
        setCityMark(null)
      } else {
        const point = globe.getScreenCoords(city.lat, city.lng)
        if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) {
          setCityMark({ x: point.x, y: point.y, name: city.name })
        } else {
          setCityMark(null)
        }
      }
    } else {
      setCityMark(null)
    }
    const nextPlaced = layoutPins({
      pins,
      width: size.width,
      height: size.height,
      padding: { top: 72, right: 62, bottom: 44, left: 14 },
      mode: 'city',
      project: (lat, lng) => {
        if (pov && angularDistanceDeg(pov.lat, pov.lng, lat, lng) > 88) {
          return null
        }
        const point = globe.getScreenCoords(lat, lng)
        if (
          !point ||
          !Number.isFinite(point.x) ||
          !Number.isFinite(point.y)
        ) {
          return null
        }
        return [point.x, point.y]
      },
    })
    setPlaced(nextPlaced)
    const visiblePins = nextPlaced
      .filter((item) => !item.heldBack)
      .map((item) => ({ x: item.x, y: item.y }))
    const centre =
      city && globe.getScreenCoords(city.lat, city.lng)
    const centrePoint =
      centre && Number.isFinite(centre.x) && Number.isFinite(centre.y)
        ? { x: centre.x, y: centre.y }
        : null
    setRingShapes(
      screenCityRings(centrePoint, visiblePins, {
        width: size.width,
        height: size.height,
      }),
    )
  }, [overlayPins, pins, props.cityId, size.height, size.width])

  const htmlElement = useCallback((data: object) => {
    const pin = data as MapPin
    const existing = pinRootsRef.current.get(pin.key)
    const el = existing?.el ?? document.createElement('div')
    const root = existing?.root ?? createRoot(el)
    el.style.pointerEvents = 'auto'
    el.style.transform = 'translate(-50%, -88%)'
    root.render(
      <button
        type="button"
        aria-label={pin.label}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          pin.onClick()
        }}
        className="flex min-h-11 min-w-11 items-center justify-center [&_*]:pointer-events-none"
      >
        <PillFace
          label={pin.label}
          count={pin.count}
          tier={pin.tier}
          selected={pin.selected}
          quiet={pin.quiet}
        />
      </button>,
    )
    pinRootsRef.current.set(pin.key, { root, el })
    return el
  }, [])

  useEffect(() => {
    const live = overlayPins
      ? new Set<string>()
      : new Set(pins.map((pin) => pin.key))
    const stale: Root[] = []
    for (const [key, entry] of pinRootsRef.current) {
      if (live.has(key)) continue
      pinRootsRef.current.delete(key)
      stale.push(entry.root)
    }
    if (stale.length === 0) return
    queueMicrotask(() => {
      for (const root of stale) root.unmount()
    })
  }, [overlayPins, pins])

  useEffect(() => {
    const roots = pinRootsRef.current
    return () => {
      const entries = [...roots.values()]
      roots.clear()
      queueMicrotask(() => {
        for (const { root } of entries) root.unmount()
      })
    }
  }, [])

  useEffect(() => {
    if (size.width === 0 || size.height === 0) return
    const timeout = window.setTimeout(() => setReady(true), 1600)
    return () => window.clearTimeout(timeout)
  }, [size.height, size.width])

  useEffect(() => {
    const globe = globeRef.current
    if (!globe || !ready) return
    globe.pointOfView(
      {
        lat: view.lat,
        lng: view.lng,
        altitude: view.altitude,
      },
      850,
    )
  }, [ready, view])

  useEffect(() => {
    if (!ready || !overlayPins) {
      setPlaced([])
      setCityMark(null)
      setRingShapes([])
      return
    }
    let frame = 0
    const started = performance.now()
    const tick = (now: number) => {
      relayoutOverlay()
      if (now - started < 1100) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [overlayPins, ready, relayoutOverlay, view])

  const handleGlobeReady = useCallback(() => {
    const apply = () => {
      const globe = globeRef.current
      if (!globe) return false
      try {
        const controls = globe.controls()
        controls.enableZoom = false
        controls.enablePan = false
        controls.autoRotate = false
        const next = viewRef.current
        globe.pointOfView(
          {
            lat: next.lat,
            lng: next.lng,
            altitude: next.altitude,
          },
          0,
        )
      } catch {
        return false
      }
      return true
    }
    if (!apply()) {
      requestAnimationFrame(() => {
        apply()
        setReady(true)
      })
      return
    }
    setReady(true)
  }, [])

  function handlePolygonClick(feature: object) {
    if (callbacksRef.current.level !== 'world') return
    const countryId = (feature as CountryFeature).properties?.countryId
    if (typeof countryId === 'string' && countryId) {
      callbacksRef.current.onCountry(countryId)
    }
  }

  return (
    <div
      ref={frameRef}
      className="relative h-full w-full overflow-hidden bg-[var(--hm-navy)]"
    >
      {size.width > 0 && size.height > 0 ? (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="#0d2233"
          globeImageUrl="/globe-sea.png"
          atmosphereColor="#7eb8d4"
          atmosphereAltitude={0.18}
          animateIn
          polygonsData={countries}
          polygonGeoJsonGeometry="geometry"
          polygonCapColor={polygonCapColor}
          polygonSideColor={() => 'rgba(13, 34, 51, 0.35)'}
          polygonStrokeColor={polygonStrokeColor}
          polygonAltitude={polygonAltitude}
          polygonCapCurvatureResolution={6}
          polygonsTransitionDuration={280}
          onPolygonClick={handlePolygonClick}
          htmlElementsData={overlayPins ? [] : pins}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude={0.02}
          htmlElement={htmlElement}
          htmlElementVisibilityModifier={(el, isVisible) => {
            el.style.opacity = isVisible ? '1' : '0'
            el.style.pointerEvents = isVisible ? 'auto' : 'none'
          }}
          showPointerCursor={(type, data) =>
            props.level === 'world' &&
            type === 'polygon' &&
            Boolean((data as CountryFeature).properties?.countryId)
          }
          onGlobeReady={handleGlobeReady}
          onZoom={() => {
            setShowHint(false)
            relayoutOverlay()
          }}
        />
      ) : null}

      {overlayPins ? (
        <div
          className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
          aria-label="Recommendation pins"
        >
          <svg
            className="absolute inset-0 h-full w-full overflow-visible"
            viewBox={`0 0 ${size.width} ${size.height}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            {ringShapes.map((ring, index) => (
              <ellipse
                key={index}
                cx={ring.cx}
                cy={ring.cy}
                rx={ring.rx}
                ry={ring.ry}
                fill={
                  ring.outer
                    ? 'rgba(230, 57, 70, 0.12)'
                    : 'rgba(230, 57, 70, 0.06)'
                }
                stroke={ring.outer ? '#e63946' : 'rgba(230, 57, 70, 0.7)'}
                strokeWidth={ring.outer ? 2.5 : 1.5}
                strokeDasharray={ring.outer ? undefined : '5 4'}
              />
            ))}
          </svg>
          {cityMark ? (
            <span
              className="absolute -translate-x-1/2 translate-y-3 rounded-full bg-white/88 px-2 py-0.5 font-[var(--hm-sans)] text-[10px] font-semibold tracking-wide text-[var(--hm-ink)] shadow-sm"
              style={{ left: cityMark.x, top: cityMark.y }}
            >
              {cityMark.name}
            </span>
          ) : null}
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
        </div>
      ) : null}

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

      {showHint ? (
        <p className="pointer-events-none absolute bottom-4 left-3 z-40 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1.5 font-[var(--hm-sans)] text-[11px] font-semibold text-[var(--hm-ink)] shadow-[0_8px_24px_rgba(16,22,32,0.14)] backdrop-blur-sm sm:left-4">
          <Hand className="size-3.5 text-[var(--hm-ink2)]" aria-hidden />
          Drag to explore
        </p>
      ) : null}

      {!ready ? <GlobeLoadingCover /> : null}
    </div>
  )
}

