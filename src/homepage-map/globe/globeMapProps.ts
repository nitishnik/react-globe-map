import type { AudienceId, MapLevel } from '../types'
import type { CameraTarget } from '../useHomepageMap'

export interface GlobeMapProps {
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
