import { useState } from 'react'

import { Map, MapControls } from '@/components/ui/map'
import { useLocale } from '@/i18n'
import { BasemapLanguage } from './basemap-language'
import { Camera, extentFor, framePadding } from './camera'
import { CityMarkers } from './city-markers'
import { Networks } from './networks'
import { Pointer } from './pointer'

// The map, with every city the extension draws on it. It only ever runs in
// the browser: the page around it is prerendered, and this is loaded once
// that page is up.
export default function TransitMap({
  cityId,
  lineId,
}: {
  cityId: string | undefined
  lineId: string | undefined
}) {
  const locale = useLocale()

  // Where the map opens. After that the camera follows the page.
  const [initial] = useState(() => {
    const bounds = extentFor(locale, cityId, lineId)

    return { bounds, padding: framePadding(bounds) }
  })

  return (
    <Map
      bounds={initial.bounds}
      fitBoundsOptions={{ padding: initial.padding, maxZoom: 14 }}
      minZoom={0}
      maxZoom={17}
      // A flat, north-up map: turning or tilting it adds nothing to reading
      // where a line runs.
      dragRotate={false}
      pitchWithRotate={false}
      touchPitch={false}
    >
      <BasemapLanguage />
      <CityMarkers />
      <Networks cityId={cityId} lineId={lineId} />
      <Pointer cityId={cityId} lineId={lineId} />
      <Camera cityId={cityId} lineId={lineId} />
      {/* Phones pinch to zoom, and there the buttons would only sit on the
          credits. */}
      <MapControls position="bottom-right" className="max-md:hidden" />
    </Map>
  )
}
