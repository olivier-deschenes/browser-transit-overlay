import { queryOptions } from '@tanstack/react-query'
import { networks } from 'virtual:extension-catalog'

// A city's lines and stations, fetched once and kept for the rest of the
// visit: the geometry is part of the build, so what has arrived cannot go
// stale.
export function networkQuery(cityId: string) {
  return queryOptions({
    queryKey: ['network', cityId],
    queryFn: async () => {
      const load = networks[cityId]

      if (!load) throw new Error(`The site has no network for "${cityId}".`)

      return (await load()).default
    },
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
