import { queryOptions } from '@tanstack/react-query'
import { stations as loadStations } from 'virtual:extension-catalog'
import type {
  CatalogCity,
  CatalogCountry,
  CatalogLine,
  CatalogStation,
} from 'virtual:extension-catalog'

import { LOCALES } from '../locales'
import type { Locale } from '../locales'
import { catalogIn } from './catalog'

// The home page's search: one field that finds cities, lines and stations by
// the start of any word in their names, whatever the case, the accents or the
// punctuation. A city stays in the list if it answers the search, or if one
// of its lines or stations does, and those are listed under it.

// A name as the search compares it: its words, without case, accents or
// punctuation, so that "chatelet" finds Châtelet, "berri uqam" Berri-UQAM
// and "gare de l'est" Gare de l’Est.
export function wordsOf(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Mark}/gu, '')
    .toLowerCase()
    .split(/[^\p{Letter}\p{Number}]+/u)
    .filter(Boolean)
}

function hits(words: string[], term: string) {
  return words.some((word) => word.startsWith(term))
}

// Whether a line or a station answers the search: every term of it is found
// either in the item's own words or in those of its city, and at least one
// only in the item's. "paris" finds Paris rather than every line and station
// in it, and "montreal" does not find every line of the Métro de Montréal,
// while "paris 14" finds line 14 there.
function answers(terms: string[], own: string[], around: string[]) {
  let alone = false

  for (const term of terms) {
    const nearby = hits(around, term)

    if (hits(own, term)) {
      alone ||= !nearby
    } else if (!nearby) {
      return false
    }
  }

  return alone
}

// The words of each city's name, and of each line's, with its badge, its
// detail and its network's name, so that "bart" finds every BART line and
// "broadway" the New York trains that run under it. Countries are left out:
// the "st" of United States would find every American city, and hide their
// stations.
function wordsIn(locale: Locale) {
  const cities = new Map<string, string[]>()
  const lines = new Map<string, string[]>()

  for (const country of catalogIn(locale).catalog.countries) {
    for (const city of country.cities) {
      cities.set(city.id, wordsOf(city.name))

      for (const system of city.systems) {
        for (const line of system.lines) {
          lines.set(
            line.id,
            wordsOf(`${line.name} ${line.badge} ${line.detail} ${system.name}`),
          )
        }
      }
    }
  }

  return { cities, lines }
}

const WORDS = Object.fromEntries(
  LOCALES.map((locale) => [locale, wordsIn(locale)]),
) as Record<Locale, ReturnType<typeof wordsIn>>

interface IndexedStation extends CatalogStation {
  // As the map knows it: montreal:station:12.
  id: string
  words: string[]
}

export type StationIndex = Partial<Record<string, IndexedStation[]>>

// Every city's stations, fetched once someone searches and kept for the rest
// of the visit, each with the words the search compares.
export function stationsQuery() {
  return queryOptions({
    queryKey: ['stations'],
    queryFn: async (): Promise<StationIndex> => {
      if (!loadStations) {
        throw new Error('The site only searches in the browser.')
      }

      const { default: byCity } = await loadStations()

      return Object.fromEntries(
        Object.entries(byCity).map(([cityId, list = []]) => [
          cityId,
          list.map((station, index) => ({
            ...station,
            id: `${cityId}:station:${index}`,
            words: wordsOf(station.name),
          })),
        ]),
      )
    },
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export interface StationMatch {
  id: string
  name: string
  lines: CatalogLine[]
}

export interface CityMatch {
  city: CatalogCity
  // Its lines and stations that answer the search, if any does.
  lines: CatalogLine[]
  stations: StationMatch[]
}

export interface CountryMatch {
  country: CatalogCountry
  cities: CityMatch[]
}

// The countries and cities that answer the search, in the catalogue's order,
// each city with the lines and stations under it that do. Stations only join
// in once they have been fetched. An empty search is answered by every city.
export function searchCatalog(
  locale: Locale,
  query: string,
  stationIndex: StationIndex | undefined,
): CountryMatch[] {
  const terms = wordsOf(query)
  const { catalog, lines: lineIndex } = catalogIn(locale)
  const words = WORDS[locale]

  // A station whose name starts with what is searched comes first: "st"
  // lists St George before 14 St.
  const leads = ({ words: [first = ''] }: IndexedStation) =>
    terms.some((term) => first.startsWith(term))

  return catalog.countries.flatMap((country) => {
    const cities = country.cities.flatMap((city): CityMatch[] => {
      if (terms.length === 0) return [{ city, lines: [], stations: [] }]

      const around = words.cities.get(city.id) ?? []

      const lines = city.systems
        .flatMap((system) => system.lines)
        .filter((line) =>
          answers(terms, words.lines.get(line.id) ?? [], around),
        )

      const stations = (stationIndex?.[city.id] ?? [])
        .filter((station) => answers(terms, station.words, around))
        .sort((a, b) => Number(leads(b)) - Number(leads(a)))
        .map(({ id, name, lines: served }) => ({
          id,
          name,
          lines: served.flatMap((lineId) => {
            const entry = lineIndex.get(lineId)

            return entry ? [entry.line] : []
          }),
        }))

      const itself = terms.every((term) => hits(around, term))

      return itself || lines.length > 0 || stations.length > 0
        ? [{ city, lines, stations }]
        : []
    })

    return cities.length > 0 ? [{ country, cities }] : []
  })
}
