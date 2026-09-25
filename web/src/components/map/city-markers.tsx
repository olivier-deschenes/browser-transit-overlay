import { useEffect, useRef } from 'react'
import type { FeatureCollection, Point } from 'geojson'

import { useMap } from '@/components/ui/map'
import { useLocale } from '@/i18n'
import { allCities } from '@/lib/catalog'
import { CITIES, cityLayerSpecs, cityPaint, setPaint } from './style'

// Each city as a dot with its name, for as long as the map is too far out to
// draw its lines.
export function CityMarkers() {
  const { map, isLoaded, resolvedTheme } = useMap()
  const locale = useLocale()

  const theme = useRef(resolvedTheme)
  theme.current = resolvedTheme

  useEffect(() => {
    if (!map || !isLoaded) return

    const data: FeatureCollection<Point, { id: string; name: string }> = {
      type: 'FeatureCollection',
      features: allCities(locale).map(({ id, name, center }) => ({
        type: 'Feature',
        properties: { id, name },
        geometry: { type: 'Point', coordinates: center },
      })),
    }

    const specs = cityLayerSpecs(theme.current)

    map.addSource(CITIES.source, { type: 'geojson', data })
    map.addLayer(specs.dots)
    map.addLayer(specs.names)

    return () => {
      try {
        if (!map.getSource(CITIES.source)) return

        for (const id of [CITIES.names, CITIES.dots]) {
          if (map.getLayer(id)) map.removeLayer(id)
        }

        map.removeSource(CITIES.source)
      } catch {
        // The map is being taken down, and its style with it.
      }
    }
  }, [map, isLoaded, locale])

  useEffect(() => {
    if (!map || !isLoaded || !map.getLayer(CITIES.dots)) return

    const paint = cityPaint(resolvedTheme)

    setPaint(map, CITIES.dots, paint.dots)
    setPaint(map, CITIES.names, paint.names)
  }, [map, isLoaded, resolvedTheme])

  return null
}
