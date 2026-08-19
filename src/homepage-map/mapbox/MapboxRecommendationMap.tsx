'use client'

import mapboxgl, {
  type LngLatBoundsLike,
  type Map as MapboxMap,
} from 'mapbox-gl'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapChrome } from '../components/MapChrome'
import { pinsForLevel } from '../components/pinModels'
import type { AudienceId, MapLevel } from '../types'
import type { CameraTarget } from '../useHomepageMap'
import { MapboxPinLayer } from './MapboxPinLayer'
import { MAP_STYLE, updateMapData } from './mapData'

export interface MapboxRecommendationMapProps {
  camera: CameraTarget
  aud: AudienceId
  level: MapLevel
  countryId: string | null
  cityId: string | null
  poiName: string | null
  onCountry: (id: string) => void
  onCity: (id: string) => void
  onPoi: (name: string) => void
  onWorld: () => void
  onBackCountry: () => void
  onBackCity: () => void
  onZoomIn: () => void
  onZoomOut: () => void
}

type ProjectionMode = 'flat' | 'globe'

function moveCamera(
  map: MapboxMap,
  camera: CameraTarget,
  mode: ProjectionMode,
  duration: number,
) {
  if (camera.bounds && mode !== 'globe') {
    const bounds: LngLatBoundsLike = [
      [camera.bounds.west, camera.bounds.south],
      [camera.bounds.east, camera.bounds.north],
    ]
    map.fitBounds(bounds, {
      padding: { top: 70, right: 66, bottom: 42, left: 26 },
      duration,
      maxZoom: Math.max(camera.zoom, 2.4),
      essential: true,
    })
    return
  }

  map.flyTo({
    center: [camera.center.lng, camera.center.lat],
    zoom: mode === 'globe' ? Math.min(camera.zoom, 5.8) : camera.zoom,
    duration,
    essential: true,
  })
}

function MapFallback({
  title,
  detail,
}: {
  title: string
  detail: string
}) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-[var(--hm-sea)] p-6"
      role="status"
    >
      <div className="max-w-sm rounded-2xl border border-[var(--hm-hair)] bg-white/95 px-5 py-4 text-center shadow-[0_12px_34px_rgba(16,22,32,0.1)]">
        <p className="font-[var(--hm-sans)] text-sm font-bold text-[var(--hm-ink)]">
          {title}
        </p>
        <p className="mt-1 font-[var(--hm-sans)] text-xs leading-5 text-[var(--hm-ink2)]">
          {detail}
        </p>
      </div>
    </div>
  )
}

export function MapboxRecommendationMap(
  props: MapboxRecommendationMapProps,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapboxMap | null>(null)
  const callbacksRef = useRef(props)
  const initialCameraRef = useRef(props.camera)
  const suppressZoomUntilRef = useRef(0)
  const nativeZoomRef = useRef(false)
  const zoomBaselineRef = useRef(props.camera.zoom)
  const projectionModeRef = useRef<ProjectionMode>('flat')
  const [map, setMap] = useState<MapboxMap | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [projectionMode, setProjectionMode] =
    useState<ProjectionMode>('flat')
  const [error, setError] = useState<string | null>(null)

  const token =
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ?? ''
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

  useEffect(() => {
    callbacksRef.current = props
  }, [props])

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return

    let disposed = false
    try {
      const instance = new mapboxgl.Map({
        accessToken: token,
        container: containerRef.current,
        style: MAP_STYLE,
        center: [
          initialCameraRef.current.center.lng,
          initialCameraRef.current.center.lat,
        ],
        zoom: initialCameraRef.current.zoom,
        projection: { name: 'naturalEarth' },
        attributionControl: false,
        logoPosition: 'bottom-left',
        dragRotate: false,
        pitchWithRotate: false,
        cooperativeGestures: false,
        fadeDuration: 120,
      })
      mapRef.current = instance
      instance.addControl(
        new mapboxgl.AttributionControl({
          compact: false,
          customAttribution:
            '<a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener">© Mapbox</a> · Natural Earth',
        }),
        'bottom-right',
      )

      const handleLoad = () => {
        if (disposed) return
        zoomBaselineRef.current = instance.getZoom()
        setMap(instance)
        setLoaded(true)
      }
      const handleError = (event: mapboxgl.ErrorEvent) => {
        if (disposed) return
        const message =
          event.error instanceof Error
            ? event.error.message
            : 'The map renderer could not start.'
        setError(message)
      }
      const handleZoomStart = (event: mapboxgl.MapboxEvent) => {
        const originalEvent = (
          event as mapboxgl.MapboxEvent & { originalEvent?: Event }
        ).originalEvent
        nativeZoomRef.current = Boolean(originalEvent)
      }
      const handleZoomEnd = () => {
        const currentZoom = instance.getZoom()
        const delta = currentZoom - zoomBaselineRef.current
        zoomBaselineRef.current = currentZoom
        if (
          !nativeZoomRef.current ||
          Date.now() < suppressZoomUntilRef.current ||
          Math.abs(delta) < 0.55
        ) {
          nativeZoomRef.current = false
          return
        }

        nativeZoomRef.current = false
        suppressZoomUntilRef.current = Date.now() + 950
        if (delta > 0) callbacksRef.current.onZoomIn()
        else callbacksRef.current.onZoomOut()

        window.setTimeout(() => {
          if (disposed) return
          moveCamera(
            instance,
            callbacksRef.current.camera,
            projectionModeRef.current,
            360,
          )
        }, 40)
      }
      const handleCountryClick = (
        event: mapboxgl.MapLayerMouseEvent,
      ) => {
        if (callbacksRef.current.level !== 'world') return
        const id = event.features?.[0]?.properties?.countryId
        if (typeof id === 'string' && id) callbacksRef.current.onCountry(id)
      }
      const showCountryPointer = () => {
        if (callbacksRef.current.level === 'world') {
          instance.getCanvas().style.cursor = 'pointer'
        }
      }
      const clearCountryPointer = () => {
        instance.getCanvas().style.cursor = ''
      }

      instance.on('load', handleLoad)
      instance.on('error', handleError)
      instance.on('zoomstart', handleZoomStart)
      instance.on('zoomend', handleZoomEnd)
      instance.on('click', 'country-fill', handleCountryClick)
      instance.on('mouseenter', 'country-fill', showCountryPointer)
      instance.on('mouseleave', 'country-fill', clearCountryPointer)

      return () => {
        disposed = true
        instance.remove()
        if (mapRef.current === instance) mapRef.current = null
      }
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : 'The map renderer could not start.'
      queueMicrotask(() => {
        if (!disposed) setError(message)
      })
    }
  }, [token])

  useEffect(() => {
    if (!map || !loaded) return
    updateMapData({
      map,
      aud: props.aud,
      level: props.level,
      countryId: props.countryId,
      cityId: props.cityId,
    })
  }, [
    loaded,
    map,
    props.aud,
    props.cityId,
    props.countryId,
    props.level,
  ])

  useEffect(() => {
    if (!map || !loaded) return
    const projection =
      projectionMode === 'globe'
        ? 'globe'
        : props.level === 'world'
          ? 'naturalEarth'
          : 'mercator'
    projectionModeRef.current = projectionMode
    suppressZoomUntilRef.current = Date.now() + 1100
    nativeZoomRef.current = false
    map.setProjection({ name: projection })
    moveCamera(map, props.camera, projectionMode, 850)
    zoomBaselineRef.current = map.getZoom()
  }, [loaded, map, projectionMode, props.camera, props.level])

  const showCityContext =
    props.level === 'city' || props.level === 'poi'

  return (
    <div className="hm-mapbox relative h-full w-full overflow-hidden bg-[var(--hm-sea)]">
      <div
        ref={containerRef}
        className="absolute inset-0"
        aria-label="Interactive recommendation map"
      />

      {showCityContext && loaded && !error ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 bottom-6 z-10 opacity-35"
          style={{
            backgroundImage:
              'radial-gradient(circle, var(--hm-hair2) 0.8px, transparent 0.9px)',
            backgroundSize: '12px 12px',
          }}
          aria-hidden
        />
      ) : null}

      {map && loaded && !error ? (
        <MapboxPinLayer
          map={map}
          pins={pins}
          level={props.level}
          cityId={props.cityId}
        />
      ) : null}

      {token && !error ? (
        <MapChrome
          level={props.level}
          countryId={props.countryId}
          cityId={props.cityId}
          projectionMode={projectionMode}
          onWorld={props.onWorld}
          onCountry={props.onBackCountry}
          onCity={props.onBackCity}
          onZoomIn={props.onZoomIn}
          onZoomOut={props.onZoomOut}
          onProjection={setProjectionMode}
        />
      ) : null}

      {!token ? (
        <MapFallback
          title="Map token required"
          detail="Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to enable the interactive Mapbox surface. The recommendations outside the map remain available."
        />
      ) : error ? (
        <MapFallback
          title="Map temporarily unavailable"
          detail={error}
        />
      ) : !loaded ? (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden bg-[var(--hm-sea)]"
          role="status"
          aria-label="Loading map"
        >
          <div className="absolute h-24 w-48 -rotate-6 rounded-[48%] border border-[var(--hm-hair2)] bg-[var(--hm-land)] opacity-80 sm:h-32 sm:w-72" />
          <div className="absolute h-12 w-24 translate-x-20 translate-y-16 rotate-12 rounded-[50%] border border-[var(--hm-hair2)] bg-[var(--hm-land)] opacity-75 sm:translate-x-32" />
          <p className="relative z-10 rounded-full border border-white/70 bg-white/90 px-4 py-2 font-[var(--hm-sans)] text-xs font-semibold text-[var(--hm-ink2)] shadow-sm">
            Preparing your recommendation world…
          </p>
        </div>
      ) : null}
    </div>
  )
}
