import { useEffect, useRef } from 'react'
import type { Network } from 'virtual:extension-catalog'

import { useMap } from '@/components/ui/map'
import { catalogIn } from '@/lib/catalog'
import { useLocale } from '@/i18n'
import {
  networkLayerSpecs,
  networkLayers,
  networkPaint,
  setPaint,
} from './style'

// One city's lines and stations on the map, from the moment its geometry
// arrives. Lines go over the basemap's roads and railways and under the names
// of its places, so that districts stay legible across them; stations and
// their names go over everything.
export function CityNetwork({
  cityId,
  data,
  lineId,
}: {
  cityId: string
  data: Network
  lineId: string | undefined
}) {
  const { map, isLoaded, resolvedTheme } = useMap()
  const locale = useLocale()

  // The layers are made once per style; what they start with is whatever is
  // picked out when they are made, and the effect below keeps them current.
  const latest = useRef({ lineId, theme: resolvedTheme })
  latest.current = { lineId, theme: resolvedTheme }

  useEffect(() => {
    if (!map || !isLoaded) return

    const layers = networkLayers(cityId)
    const specs = networkLayerSpecs(
      layers,
      latest.current.lineId,
      latest.current.theme,
    )

    map.addSource(layers.source, {
      type: 'geojson',
      data,
      promoteId: 'id',
      attribution: credit(cityId, locale),
    })

    // Found by what the layer names rather than by its being the first label:
    // OpenFreeMap's dark style names its water before it draws a single road,
    // and lines put under that went under the roads and under the basemap's
    // own railways, which cut them into dashes wherever they share a track.
    const underPlaces = map
      .getLayersOrder()
      .find((id) => map.getLayer(id)?.sourceLayer === 'place')

    map.addLayer(specs.lines, underPlaces)
    map.addLayer(specs.hit, underPlaces)
    map.addLayer(specs.stations)
    map.addLayer(specs.names)

    return () => {
      try {
        // A style swap has already taken all of this away with it.
        if (!map.getSource(layers.source)) return

        for (const id of [
          layers.names,
          layers.stations,
          layers.hit,
          layers.lines,
        ]) {
          if (map.getLayer(id)) map.removeLayer(id)
        }

        map.removeSource(layers.source)
      } catch {
        // And a map being taken down has no style left to ask.
      }
    }
  }, [map, isLoaded, cityId, data, locale])

  useEffect(() => {
    if (!map || !isLoaded) return

    const layers = networkLayers(cityId)

    if (!map.getLayer(layers.lines)) return

    const paint = networkPaint(lineId, resolvedTheme)

    setPaint(map, layers.lines, paint.lines)
    setPaint(map, layers.stations, paint.stations)
    setPaint(map, layers.names, paint.names)
  }, [map, isLoaded, cityId, lineId, resolvedTheme])

  return null
}

// The same credit the extension puts on the maps it draws on, once per
// publisher: Paris's métro and RER both come from Île-de-France Mobilités.
function credit(cityId: string, locale: Parameters<typeof catalogIn>[0]) {
  const { catalog, cities } = catalogIn(locale)
  const city = cities.get(cityId)?.city

  if (!city) return undefined

  const publishers = new Map(
    city.systems.map(({ attribution }) => [attribution.label, attribution]),
  )

  const link = (href: string, label: string) =>
    `<a href="${escape(href)}" target="_blank" rel="noreferrer">${escape(label)}</a>`

  return `${escape(catalog.creditLead)} ${[...publishers.values()]
    .map(
      ({ label, terms, license }) =>
        `${link(terms, label)} (${link(license.url, license.label)})`,
    )
    .join(' · ')}`
}

function escape(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
