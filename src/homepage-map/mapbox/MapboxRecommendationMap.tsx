'use client'

import mapboxgl, {
  type LngLatBoundsLike,
  type Map as MapboxMap,
} from 'mapbox-gl'
import { Hand } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapChrome } from '../components/MapChrome'
import { pinsForLevel } from '../components/pinModels'
import type { AudienceId, MapLevel } from '../types'
import type { CameraTarget } from '../useHomepageMap'
import { MapboxPinLayer } from './MapboxPinLayer'
import {
  MAP_BASEMAP_CONFIG,
  MAP_STYLE,
  addRecommendationLayers,
  applyAtmosphere,
  updateMapData,
} from './mapData'

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

function resolveProjection(
  mode: ProjectionMode,
  level: MapLevel,
): 'globe' | 'mercator' {
  if (mode === 'flat') return 'mercator'
  if (level === 'city' || level === 'poi') return 'mercator'
  return 'globe'
}

function globePitch(mode: ProjectionMode, level: MapLevel) {
  return resolveProjection(mode, level) === 'globe' ? 20 : 0
}

function moveCamera(
  map: MapboxMap,
  camera: CameraTarget,
  mode: ProjectionMode,
  level: MapLevel,
  duration: number,
) {
  const projection = resolveProjection(mode, level)
  const pitch = globePitch(mode, level)

  if (camera.bounds && projection !== 'globe') {
    const bounds: LngLatBoundsLike = [
      [camera.bounds.west, camera.bounds.south],
      [camera.bounds.east, camera.bounds.north],
    ]
    map.fitBounds(bounds, {
      padding: { top: 70, right: 66, bottom: 42, left: 26 },
      duration,
      pitch,
      bearing: 0,
      maxZoom: Math.max(camera.zoom, 2.4),
      essential: true,
    })
    return
  }

  map.flyTo({
    center: [camera.center.lng, camera.center.lat],
    zoom: projection === 'globe' ? Math.min(camera.zoom, 6.5) : camera.zoom,
    pitch,
    bearing: 0,
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
  const projectionModeRef = useRef<ProjectionMode>('globe')
  const [map, setMap] = useState<MapboxMap | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [projectionMode, setProjectionMode] =
    useState<ProjectionMode>('globe')
  const [error, setError] = useState<string | null>(null)
  const [showHint, setShowHint] = useState(true)

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
        config: { basemap: MAP_BASEMAP_CONFIG },
        center: [
          initialCameraRef.current.center.lng,
          initialCameraRef.current.center.lat,
        ],
        zoom: initialCameraRef.current.zoom,
        pitch: 20,
        projection: 'globe',
        attributionControl: false,
        logoPosition: 'bottom-left',
        dragRotate: true,
        pitchWithRotate: false,
        cooperativeGestures: true,
        fadeDuration: 120,
      })
      mapRef.current = instance
      instance.touchPitch.disable()
      instance.addControl(
        new mapboxgl.AttributionControl({
          compact: true,
          customAttribution:
            '<a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener">© Mapbox</a>',
        }),
        'bottom-right',
      )

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
      const handleStyleLoad = () => {
        if (disposed) return
        try {
          applyAtmosphere(instance)
          addRecommendationLayers(instance)
        } catch (reason) {
          const message =
            reason instanceof Error
              ? reason.message
              : 'The map renderer could not start.'
          setError(message)
        }
      }
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
            callbacksRef.current.level,
            360,
          )
        }, 40)
      }

      instance.on('style.load', handleStyleLoad)
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
    const projection = resolveProjection(projectionMode, props.level)
    projectionModeRef.current = projectionMode
    suppressZoomUntilRef.current = Date.now() + 1100
    nativeZoomRef.current = false
    map.setProjection(projection)
    if (projection === 'globe') {
      map.dragRotate.enable()
    } else {
      map.dragRotate.disable()
      map.setBearing(0)
    }
    moveCamera(map, props.camera, projectionMode, props.level, 850)
    zoomBaselineRef.current = map.getZoom()
  }, [loaded, map, projectionMode, props.camera, props.level])

  useEffect(() => {
    if (!map) return
    const hideHint = (event: mapboxgl.MapboxEvent) => {
      const originalEvent = (
        event as mapboxgl.MapboxEvent & { originalEvent?: Event }
      ).originalEvent
      if (originalEvent) setShowHint(false)
    }
    map.on('dragstart', hideHint)
    map.on('rotatestart', hideHint)
    return () => {
      map.off('dragstart', hideHint)
      map.off('rotatestart', hideHint)
    }
  }, [map])

  const hintVisible =
    showHint &&
    loaded &&
    !error &&
    (props.level === 'world' || props.level === 'country')

  return (
    <div className="hm-mapbox relative h-full w-full overflow-hidden bg-[var(--hm-sea)]">
      <div
        ref={containerRef}
        className="absolute inset-0"
        aria-label="Interactive recommendation map"
      />

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

      {hintVisible ? (
        <p className="pointer-events-none absolute bottom-10 left-3 z-40 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1.5 font-[var(--hm-sans)] text-[11px] font-semibold text-[var(--hm-ink)] shadow-[0_8px_24px_rgba(16,22,32,0.14)] backdrop-blur-sm sm:left-4">
          <Hand className="size-3.5 text-[var(--hm-ink2)]" aria-hidden />
          Drag to explore
        </p>
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
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden bg-[#16324a]"
          role="status"
          aria-label="Loading map"
        >
          <div className="absolute size-40 rounded-full bg-[radial-gradient(circle_at_35%_30%,#4aa3c7,transparent_62%)] opacity-70 sm:size-56" />
          <p className="relative z-10 rounded-full border border-white/70 bg-white/90 px-4 py-2 font-[var(--hm-sans)] text-xs font-semibold text-[var(--hm-ink2)] shadow-sm">
            Preparing your recommendation world…
          </p>
        </div>
      ) : null}
    </div>
  )
}
