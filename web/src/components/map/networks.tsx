import { useQueries } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Extent } from 'virtual:extension-catalog'

import { Spinner } from '@/components/ui/spinner'
import { useMap } from '@/components/ui/map'
import { MESSAGES, useLocale } from '@/i18n'
import { allCities } from '@/lib/catalog'
import { networkQuery } from '@/lib/networks'
import { CityNetwork } from './city-network'
import { LINES_FROM } from './style'

// Every city the map has been close enough to draw, drawn. A city's geometry
// is fetched the first time the map comes near it, a zoom level before its
// lines would show, and the city picked in the panel is fetched straight
// away. Once drawn, a city stays drawn: taking it off again when the map
// moves away would only mean fetching and drawing it once more on the way
// back.
export function Networks({
  cityId,
  lineId,
}: {
  cityId: string | undefined
  lineId: string | undefined
}) {
  const { map } = useMap()
  const locale = useLocale()
  const nearby = useCitiesNearby(map)
  const wanted =
    cityId && !nearby.includes(cityId) ? [...nearby, cityId] : nearby

  const networks = useQueries({
    queries: wanted.map((id) => networkQuery(id)),
    combine: (results) => ({
      loaded: results.flatMap(({ data }, index) =>
        data ? [{ id: wanted[index], data }] : [],
      ),
      loading: results.some(({ isFetching }) => isFetching),
    }),
  })

  return (
    <>
      {networks.loaded.map(({ id, data }) => (
        <CityNetwork key={id} cityId={id} data={data} lineId={lineId} />
      ))}

      {networks.loading && (
        <p
          role="status"
          className="bg-background text-muted-foreground absolute top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-md border px-2.5 py-1 text-xs shadow-sm"
        >
          <Spinner className="size-3" />
          {MESSAGES[locale].loading}
        </p>
      )}
    </>
  )
}

function useCitiesNearby(map: MapLibreMap | null) {
  const [nearby, setNearby] = useState<string[]>([])

  useEffect(() => {
    if (!map) return

    const cities = allCities('fr')

    const update = () => {
      if (map.getZoom() < LINES_FROM - 1) return

      const bounds = map.getBounds()
      const view: Extent = [
        [bounds.getWest(), bounds.getSouth()],
        [bounds.getEast(), bounds.getNorth()],
      ]

      const seen = cities
        .filter(({ extent }) => overlaps(extent, view))
        .map(({ id }) => id)

      setNearby((previous) => {
        const next = [...new Set([...previous, ...seen])]

        return next.length === previous.length ? previous : next
      })
    }

    update()
    map.on('moveend', update)

    return () => {
      map.off('moveend', update)
    }
  }, [map])

  return nearby
}

function overlaps(
  [[west, south], [east, north]]: Extent,
  [[viewWest, viewSouth], [viewEast, viewNorth]]: Extent,
) {
  return (
    west <= viewEast &&
    east >= viewWest &&
    south <= viewNorth &&
    north >= viewSouth
  )
}
