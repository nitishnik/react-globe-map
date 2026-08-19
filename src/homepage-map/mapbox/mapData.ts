import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  Point,
  Polygon,
} from 'geojson'
import type {
  GeoJSONSource,
  Map as MapboxMap,
  StyleSpecification,
} from 'mapbox-gl'
import { CITIES } from '../data/catalog'
import { NUMERIC_TO_DEST } from '../geo/iso'
import { worldCountries } from '../geo/worldData'
import { cityTier, destinationById, tierOf } from '../ranking'
import type { AudienceId } from '../types'

const EMPTY_POINTS: FeatureCollection<Point> = {
  type: 'FeatureCollection',
  features: [],
}

const EMPTY_POLYGONS: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [],
}

export const MAP_STYLE: StyleSpecification = {
  version: 8,
  name: 'Recommendation map',
  glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
  sources: {
    countries: {
      type: 'geojson',
      data: worldCountries,
    },
    cityAttractions: {
      type: 'geojson',
      data: EMPTY_POINTS,
      cluster: true,
      clusterRadius: 32,
      clusterMaxZoom: 10,
    },
    cityRings: {
      type: 'geojson',
      data: EMPTY_POLYGONS,
    },
    cityCentre: {
      type: 'geojson',
      data: EMPTY_POINTS,
    },
  },
  layers: [
    {
      id: 'sea',
      type: 'background',
      paint: { 'background-color': '#e8eff3' },
    },
    {
      id: 'country-fill',
      type: 'fill',
      source: 'countries',
      paint: {
        'fill-color': [
          'case',
          ['boolean', ['get', 'selected'], false],
          '#d4c4aa',
          [
            'match',
            ['get', 'tier'],
            0,
            '#e6d7c2',
            1,
            '#e8dfd0',
            2,
            '#ebe6dc',
            3,
            '#efebe3',
            '#ede8de',
          ],
        ],
        'fill-opacity': [
          'case',
          ['boolean', ['get', 'selected'], false],
          0.98,
          0.9,
        ],
      },
    },
    {
      id: 'country-outline',
      type: 'line',
      source: 'countries',
      paint: {
        'line-color': [
          'case',
          ['boolean', ['get', 'selected'], false],
          '#9c8d73',
          '#d3ccbf',
        ],
        'line-width': [
          'case',
          ['boolean', ['get', 'selected'], false],
          1.6,
          0.7,
        ],
      },
    },
    {
      id: 'city-ring-fill',
      type: 'fill',
      source: 'cityRings',
      paint: {
        'fill-color': '#ffffff',
        'fill-opacity': 0.035,
      },
    },
    {
      id: 'city-rings',
      type: 'line',
      source: 'cityRings',
      paint: {
        'line-color': '#9fa7ad',
        'line-width': 1,
        'line-opacity': 0.66,
        'line-dasharray': [2, 3],
      },
    },
    {
      id: 'attraction-clusters',
      type: 'circle',
      source: 'cityAttractions',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#0d2233',
        'circle-opacity': 0.86,
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
    },
    {
      id: 'attraction-cluster-count',
      type: 'symbol',
      source: 'cityAttractions',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-size': 11,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      },
      paint: { 'text-color': '#ffffff' },
    },
    {
      id: 'unclustered-attractions',
      type: 'circle',
      source: 'cityAttractions',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'match',
          ['get', 'tier'],
          0,
          '#e0261f',
          1,
          '#0d2233',
          '#aab1b7',
        ],
        'circle-radius': 4,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1,
        'circle-opacity': 0.82,
      },
    },
    {
      id: 'city-centre-halo',
      type: 'circle',
      source: 'cityCentre',
      paint: {
        'circle-color': '#ffffff',
        'circle-radius': 9,
        'circle-opacity': 0.78,
      },
    },
    {
      id: 'city-centre',
      type: 'circle',
      source: 'cityCentre',
      paint: {
        'circle-color': '#0d2233',
        'circle-radius': 4,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5,
      },
    },
  ],
}

function source(map: MapboxMap, id: string): GeoJSONSource | null {
  return (map.getSource(id) as GeoJSONSource | undefined) ?? null
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
  level: 'world' | 'country' | 'city' | 'poi'
  countryId: string | null
  cityId: string | null
}) {
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
