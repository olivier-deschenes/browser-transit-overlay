import catalogs from 'virtual:extension-catalog'
import type {
  Catalog,
  CatalogCity,
  CatalogCountry,
  CatalogLine,
  CatalogSystem,
  Extent,
} from 'virtual:extension-catalog'

import { LOCALES } from '../locales'
import type { Locale } from '../locales'

// The catalogue read the ways the site looks things up in it: a city or a
// line by its id, and the totals the home page states. Ids are the same in
// every language, so any one catalogue answers which ids exist.

export interface CityEntry {
  city: CatalogCity
  country: CatalogCountry
}

export interface LineEntry {
  line: CatalogLine
  system: CatalogSystem
  city: CatalogCity
}

interface Index {
  catalog: Catalog
  cities: Map<string, CityEntry>
  lines: Map<string, LineEntry>
  totals: { cities: number; lines: number; stations: number }
}

function indexOf(catalog: Catalog): Index {
  const cities = new Map<string, CityEntry>()
  const lines = new Map<string, LineEntry>()
  let stations = 0

  for (const country of catalog.countries) {
    for (const city of country.cities) {
      cities.set(city.id, { city, country })
      stations += city.stations

      for (const system of city.systems) {
        for (const line of system.lines) {
          lines.set(line.id, { line, system, city })
        }
      }
    }
  }

  return {
    catalog,
    cities,
    lines,
    totals: { cities: cities.size, lines: lines.size, stations },
  }
}

const INDEXES = Object.fromEntries(
  LOCALES.map((locale) => [locale, indexOf(catalogs[locale])]),
) as Record<Locale, Index>

export function catalogIn(locale: Locale) {
  return INDEXES[locale]
}

export function isCityId(id: string) {
  return INDEXES.fr.cities.has(id)
}

// Every city, flat, in the order the catalogue lists them.
export function allCities(locale: Locale) {
  return [...INDEXES[locale].cities.values()].map(({ city }) => city)
}

// What the whole catalogue covers, for framing every city at once.
export const WORLD_EXTENT: Extent = (() => {
  const centers = allCities('fr').map(({ center }) => center)

  return [
    [
      Math.min(...centers.map(([longitude]) => longitude)),
      Math.min(...centers.map(([, latitude]) => latitude)),
    ],
    [
      Math.max(...centers.map(([longitude]) => longitude)),
      Math.max(...centers.map(([, latitude]) => latitude)),
    ],
  ]
})()

// The lines a station feature serves, from the |a|b| string it carries.
export function stationLines(lines: string) {
  return lines.split('|').filter(Boolean)
}

// A line picked out on its city's page is named in the page's fragment, by
// its id within the city: /paris#metro:14. It is part of the page rather
// than a page of its own, the prerendered page never has one, and the router
// only compares fragments once the page is running in the browser, so the
// list of lines renders the same on the server as on its first render here.
export function lineHash(lineId: string) {
  return lineId.slice(lineId.indexOf(':') + 1)
}

export function lineFromHash(cityId: string | undefined, hash: string) {
  if (!cityId || !hash) return undefined

  const id = `${cityId}:${decodeURIComponent(hash)}`

  return INDEXES.fr.lines.has(id) ? id : undefined
}
