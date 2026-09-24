import { useEffect, useRef } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Extent } from 'virtual:extension-catalog'

import { useMap } from '@/components/ui/map'
import { useLocale } from '@/i18n'
import { WORLD_EXTENT, catalogIn } from '@/lib/catalog'
import type { Locale } from '@/locales'

// What the map frames: a line picked out, or else the city being read about,
// or else every city at once.
export function extentFor(
  locale: Locale,
  cityId: string | undefined,
  lineId: string | undefined,
): Extent {
  const { cities, lines } = catalogIn(locale)

  return (
    (lineId && lines.get(lineId)?.line.extent) ||
    (cityId && cities.get(cityId)?.city.extent) ||
    WORLD_EXTENT
  )
}

// Room around what is framed, so that a terminus is not drawn against the
// edge of the map. A phone has little to spare. Every city at once is framed
// by the dots, and each dot has its name beside it, so that frame leaves
// room at the sides for the name of the city furthest out.
export function framePadding(extent: Extent) {
  const room = window.matchMedia('(min-width: 768px)').matches ? 64 : 24
  const names = extent === WORLD_EXTENT ? 64 : 0

  return { top: room, bottom: room, left: room + names, right: room + names }
}

// Moves the map when the page changes what it is about. Going to another
// city, or back to all of them, always does. Picking out a line only moves
// the map if some of the line is out of sight: a line clicked on the map is
// already in view, and jumping would lose the reader's place.
export function Camera({
  cityId,
  lineId,
}: {
  cityId: string | undefined
  lineId: string | undefined
}) {
  const { map } = useMap()
  const locale = useLocale()
  const previous = useRef({ cityId, lineId })

  // North stays up on phones and keyboards too, as it does for a mouse.
  useEffect(() => {
    map?.touchZoomRotate.disableRotation()
    map?.keyboard.disableRotation()
  }, [map])

  useEffect(() => {
    if (!map) return

    const before = previous.current
    previous.current = { cityId, lineId }

    if (before.cityId === cityId && before.lineId === lineId) return

    const extent = extentFor(locale, cityId, lineId)

    if (before.cityId !== cityId) {
      frame(map, extent)
    } else if (lineId && !inView(map, extent)) {
      frame(map, extent)
    }
  }, [map, locale, cityId, lineId])

  return null
}

function frame(map: MapLibreMap, extent: Extent) {
  map.fitBounds(extent, { padding: framePadding(extent), maxZoom: 14 })
}

function inView(map: MapLibreMap, [[west, south], [east, north]]: Extent) {
  const bounds = map.getBounds()

  return (
    bounds.contains([west, south]) &&
    bounds.contains([east, north]) &&
    map.getZoom() >= 9
  )
}
