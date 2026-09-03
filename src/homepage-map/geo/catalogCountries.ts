import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson'
import { destinationById, tierOf } from '../ranking'
import type { AudienceId } from '../types'
import { NUMERIC_TO_DEST } from './iso'
import { worldCountries } from './worldData'

export function catalogCountryCollection(
  aud: AudienceId,
  selectedId: string | null,
): FeatureCollection<Geometry, GeoJsonProperties> {
  return {
    type: 'FeatureCollection',
    features: worldCountries.features.map((feature) => {
      const countryId =
        feature.id == null
          ? null
          : (NUMERIC_TO_DEST[String(feature.id)] ?? null)
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
