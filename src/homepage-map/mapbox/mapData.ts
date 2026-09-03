import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  Point,
  Polygon,
} from 'geojson'
import type { FilterSpecification, GeoJSONSource, Map as MapboxMap } from 'mapbox-gl'
import { CITIES } from '../data/catalog'
import { NUMERIC_TO_DEST } from '../geo/iso'
import { worldCountries } from '../geo/worldData'
import { cityTier, destinationById, tierOf } from '../ranking'
import type { AudienceId, MapLevel } from '../types'

const EMPTY_POINTS: FeatureCollection<Point> = {
  type: 'FeatureCollection',
  features: [],
}

const EMPTY_POLYGONS: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [],
}

export const MAP_STYLE = 'mapbox://styles/mapbox/standard-satellite'

export const MAP_FOG = {
  color: 'rgb(186, 210, 235)',
  'high-color': 'rgb(36, 92, 223)',
  'horizon-blend': 0.04,
  'space-color': 'rgb(220, 232, 245)',
  'star-intensity': 0,
} as const

export const MAP_BASEMAP_CONFIG = {
  showPedestrianRoads: false,
  showPlaceLabels: false,
  showPointOfInterestLabels: false,
  showRoadLabels: false,
  showTransitLabels: false,
  showAdminBoundaries: false,
  showRoadsAndTransit: false,
}

const CATALOG_FILTER: FilterSpecification = ['!=', ['get', 'tier'], 4]

function source(map: MapboxMap, id: string): GeoJSONSource | null {
  return (map.getSource(id) as GeoJSONSource | undefined) ?? null
}

export function applyBasemapConfig(map: MapboxMap, level: MapLevel) {
  const showRoads = level === 'city' || level === 'poi'
  try {
    map.setConfigProperty('basemap', 'showRoadsAndTransit', showRoads)
    map.setConfigProperty('basemap', 'showPedestrianRoads', false)
    map.setConfigProperty('basemap', 'showPlaceLabels', false)
    map.setConfigProperty('basemap', 'showPointOfInterestLabels', false)
    map.setConfigProperty('basemap', 'showRoadLabels', false)
    map.setConfigProperty('basemap', 'showTransitLabels', false)
    map.setConfigProperty('basemap', 'showAdminBoundaries', false)
  } catch {
    // Older styles without Standard config ignore these keys.
  }
}

export function applyAtmosphere(map: MapboxMap) {
  map.setFog({ ...MAP_FOG })
  try {
    if (!map.getSource('mapbox-dem')) {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      })
    }
    map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.1 })
  } catch {
    // Standard satellite may already expose terrain.
  }
}

export function addRecommendationLayers(map: MapboxMap) {
  if (map.getSource('countries')) return

  map.addSource('countries', {
    type: 'geojson',
    data: worldCountries,
  })
  map.addSource('cityAttractions', {
    type: 'geojson',
    data: EMPTY_POINTS,
    cluster: true,
    clusterRadius: 32,
    clusterMaxZoom: 10,
  })
  map.addSource('cityRings', {
    type: 'geojson',
    data: EMPTY_POLYGONS,
  })
  map.addSource('cityCentre', {
    type: 'geojson',
    data: EMPTY_POINTS,
  })

  map.addLayer({
    id: 'country-fill',
    type: 'fill',
    source: 'countries',
    slot: 'top',
    filter: CATALOG_FILTER,
    paint: {
      'fill-color': [
        'case',
        ['boolean', ['get', 'selected'], false],
        '#f4c56d',
        [
          'match',
          ['get', 'tier'],
          0,
          '#f2b84b',
          1,
          '#e8c078',
          2,
          '#d9c8a0',
          3,
          '#d4cbb8',
          'rgba(0,0,0,0)',
        ],
      ],
      'fill-opacity': [
        'case',
        ['boolean', ['get', 'selected'], false],
        0.32,
        [
          'match',
          ['get', 'tier'],
          0,
          0.28,
          1,
          0.16,
          2,
          0.08,
          3,
          0.04,
          0,
        ],
      ],
    },
  })
  map.addLayer({
    id: 'country-outline',
    type: 'line',
    source: 'countries',
    slot: 'top',
    filter: CATALOG_FILTER,
    paint: {
      'line-color': [
        'case',
        ['boolean', ['get', 'selected'], false],
        '#fff3c4',
        'rgba(255, 248, 236, 0.55)',
      ],
      'line-width': [
        'case',
        ['boolean', ['get', 'selected'], false],
        1.8,
        0.8,
      ],
    },
  })
  map.addLayer({
    id: 'city-ring-fill',
    type: 'fill',
    source: 'cityRings',
    slot: 'top',
    paint: {
      'fill-color': '#f4c56d',
      'fill-opacity': 0.06,
    },
  })
  map.addLayer({
    id: 'city-rings',
    type: 'line',
    source: 'cityRings',
    slot: 'top',
    paint: {
      'line-color': '#ffffff',
      'line-width': 1.2,
      'line-opacity': 0.55,
      'line-dasharray': [2, 3],
    },
  })
  map.addLayer({
    id: 'attraction-clusters',
    type: 'circle',
    source: 'cityAttractions',
    slot: 'top',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#e63946',
      'circle-opacity': 0.92,
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        13,
        3,
        16,
        8,
        19,
      ],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  })
  map.addLayer({
    id: 'attraction-cluster-count',
    type: 'symbol',
    source: 'cityAttractions',
    slot: 'top',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-size': 11,
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
    },
    paint: { 'text-color': '#ffffff' },
  })
  map.addLayer({
    id: 'unclustered-attractions',
    type: 'circle',
    source: 'cityAttractions',
    slot: 'top',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': [
        'match',
        ['get', 'tier'],
        0,
        '#e63946',
        1,
        '#c23b44',
        '#d4a0a4',
      ],
      'circle-radius': 4,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.25,
      'circle-opacity': 0.92,
    },
  })
  map.addLayer({
    id: 'city-centre-halo',
    type: 'circle',
    source: 'cityCentre',
    slot: 'top',
    paint: {
      'circle-color': '#ffffff',
      'circle-radius': 9,
      'circle-opacity': 0.86,
    },
  })
  map.addLayer({
    id: 'city-centre',
    type: 'circle',
    source: 'cityCentre',
    slot: 'top',
    paint: {
      'circle-color': '#e63946',
      'circle-radius': 4,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.5,
    },
  })
}

export function countryData(
  aud: AudienceId,
  selectedId: string | null,
): FeatureCollection<Geometry, GeoJsonProperties> {
  return {
    type: 'FeatureCollection',
    features: worldCountries.features.map((feature) => {
      const countryId =
        feature.id == null ? null : (NUMERIC_TO_DEST[String(feature.id)] ?? null)
      const destination = countryId ? destinationById(countryId) : null
      return {
        ...feature,
        properties: {
          ...feature.properties,
          countryId,
          tier: destination ? tierOf(destination, aud) : 4,
          selected: countryId === selectedId,
        },
      }
    }),
  }
}

export function attractionData(
  countryId: string | null,
  aud: AudienceId,
): FeatureCollection<Point> {
  if (!countryId) return EMPTY_POINTS
  const features: Feature<Point>[] = []
  for (const city of Object.values(CITIES)) {
    if (city.countryId !== countryId) continue
    for (const attraction of city.attractions) {
      features.push({
        type: 'Feature',
        properties: {
          cityId: city.id,
          cityName: city.name,
          tier: cityTier(city, aud),
        },
        geometry: {
          type: 'Point',
          coordinates: [attraction.lng, attraction.lat],
        },
      })
    }
  }
  return { type: 'FeatureCollection', features }
}

function circlePolygon(
  lng: number,
  lat: number,
  radiusKm: number,
  steps = 80,
): Feature<Polygon> {
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
  return {
    type: 'Feature',
    properties: { radiusKm },
    geometry: { type: 'Polygon', coordinates: [coordinates] },
  }
}

export function cityContextData(cityId: string | null) {
  const city = cityId ? CITIES[cityId] : null
  if (!city) {
    return { rings: EMPTY_POLYGONS, centre: EMPTY_POINTS }
  }
  return {
    rings: {
      type: 'FeatureCollection',
      features: [0.5, 1, 2].map((radius) =>
        circlePolygon(city.lng, city.lat, radius),
      ),
    } satisfies FeatureCollection<Polygon>,
    centre: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: city.name },
          geometry: {
            type: 'Point',
            coordinates: [city.lng, city.lat],
          },
        },
      ],
    } satisfies FeatureCollection<Point>,
  }
}

export function updateMapData({
  map,
  aud,
  level,
  countryId,
  cityId,
}: {
  map: MapboxMap
  aud: AudienceId
  level: MapLevel
  countryId: string | null
  cityId: string | null
}) {
  if (!map.getLayer('country-fill')) return

  applyBasemapConfig(map, level)

  const countryVisible = level === 'world' || level === 'country'
  const clustersVisible = level === 'country'
  const cityVisible = level === 'city' || level === 'poi'
  for (const layerId of ['country-fill', 'country-outline']) {
    map.setLayoutProperty(
      layerId,
      'visibility',
      countryVisible ? 'visible' : 'none',
    )
  }
  for (const layerId of [
    'attraction-clusters',
    'attraction-cluster-count',
    'unclustered-attractions',
  ]) {
    map.setLayoutProperty(
      layerId,
      'visibility',
      clustersVisible ? 'visible' : 'none',
    )
  }
  for (const layerId of [
    'city-ring-fill',
    'city-rings',
    'city-centre-halo',
    'city-centre',
  ]) {
    map.setLayoutProperty(
      layerId,
      'visibility',
      cityVisible ? 'visible' : 'none',
    )
  }

  source(map, 'countries')?.setData(countryData(aud, countryId))
  source(map, 'cityAttractions')?.setData(
    level === 'country' ? attractionData(countryId, aud) : EMPTY_POINTS,
  )
  const cityContext =
    level === 'city' || level === 'poi'
      ? cityContextData(cityId)
      : { rings: EMPTY_POLYGONS, centre: EMPTY_POINTS }
  source(map, 'cityRings')?.setData(cityContext.rings)
  source(map, 'cityCentre')?.setData(cityContext.centre)
}
