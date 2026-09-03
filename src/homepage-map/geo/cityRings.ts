import type { MapPin } from '../components/pinModels'
import { CITIES } from '../data/catalog'

function distanceKm(
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
  return 2 * Math.asin(Math.min(1, Math.sqrt(sine))) * 6371
}

function circleLngLat(
  lng: number,
  lat: number,
  radiusKm: number,
  steps = 96,
): [number, number][] {
  const coordinates: [number, number][] = []
  const latRadians = (lat * Math.PI) / 180
  const kmPerLngDegree = Math.max(1, 111.32 * Math.cos(latRadians))
  for (let index = 0; index <= steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2
    coordinates.push([
      lng + (Math.cos(angle) * radiusKm) / kmPerLngDegree,
      lat + (Math.sin(angle) * radiusKm) / 110.574,
    ])
  }
  return coordinates
}

function ringRadiiKm(cityId: string, pins: MapPin[]) {
  const city = CITIES[cityId]
  if (!city) return []
  let maxKm = 2
  for (const pin of pins) {
    maxKm = Math.max(maxKm, distanceKm(city.lat, city.lng, pin.lat, pin.lng))
  }
  const outerKm = Math.max(2.75, maxKm + 1.25)
  return [0.5, 1, 2, outerKm]
}

export function cityRingLatLngs(cityId: string, pins: MapPin[]) {
  const city = CITIES[cityId]
  const radii = ringRadiiKm(cityId, pins)
  if (!city || radii.length === 0) return []
  return radii.map((radiusKm, index) => ({
    radiusKm,
    outer: index === radii.length - 1,
    points: circleLngLat(city.lng, city.lat, radiusKm).map(([lng, lat]) => ({
      lat,
      lng,
    })),
  }))
}

export function cityRingSpanDegrees(cityId: string, pins: MapPin[]) {
  const radii = ringRadiiKm(cityId, pins)
  if (radii.length === 0) return 0
  return (radii[radii.length - 1] * 2) / 111.32
}
