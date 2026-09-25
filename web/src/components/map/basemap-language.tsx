import { useEffect } from 'react'
import type { ExpressionSpecification } from 'maplibre-gl'

import { useMap } from '@/components/ui/map'
import { useLocale } from '@/i18n'
import type { Locale } from '@/locales'

// The basemap names places in English. The site speaks French too, so its
// names are asked for in the page's language first, then in Latin script,
// then as they are written locally: Londres, Montréal, 東京.
const NAME: Record<Locale, ExpressionSpecification> = {
  fr: ['coalesce', ['get', 'name:fr'], ['get', 'name:latin'], ['get', 'name']],
  en: [
    'coalesce',
    ['get', 'name:en'],
    ['get', 'name_en'],
    ['get', 'name:latin'],
    ['get', 'name'],
  ],
}

// OpenFreeMap's tiles, as both of its styles call them.
const BASEMAP_SOURCE = 'openmaptiles'

export function BasemapLanguage() {
  const { map, isLoaded } = useMap()
  const locale = useLocale()

  useEffect(() => {
    if (!map || !isLoaded) return

    for (const id of map.getLayersOrder()) {
      const layer = map.getLayer(id)

      if (layer?.type !== 'symbol' || layer.source !== BASEMAP_SOURCE) continue

      // Only the labels that name a place: road shields show a number, and
      // an icon on its own has no text at all.
      const field: unknown = map.getLayoutProperty(id, 'text-field')

      if (!JSON.stringify(field ?? null).includes('"name')) continue

      map.setLayoutProperty(id, 'text-field', NAME[locale])
    }
  }, [map, isLoaded, locale])

  return null
}
