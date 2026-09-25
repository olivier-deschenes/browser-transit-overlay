// The extension's name, its cities and lines in each of the site's languages,
// and each city's geometry, built from its registry by
// plugins/extension-catalog.ts each time the site is built.
declare module 'virtual:extension-catalog' {
  import type { Feature, MultiLineString, Point } from 'geojson'
  import type { Locale } from '#/locales'

  // [[west, south], [east, north]], in degrees.
  export type Extent = [[number, number], [number, number]]

  export interface CatalogLine {
    // The full id, as the extension keys its settings: paris:metro:3bis.
    id: string
    // The short name on the line's bullet, spelled the way the extension
    // draws it: 1, 3bis, A, M1.
    badge: string
    color: string
    // Black or white, whichever the extension prints on this colour.
    ink: string
    name: string
    // What the line is beyond its name: "Line 1", "Light rail", the
    // terminals it runs between.
    detail: string
    // Where the line runs, to frame it on the map.
    extent: Extent
    // How many of the city's stations it calls at.
    stations: number
  }

  export interface CatalogSystem {
    id: string
    name: string
    // Who published the data the lines are drawn from, and on what terms.
    attribution: {
      label: string
      terms: string
      license: { label: string; url: string }
    }
    lines: CatalogLine[]
  }

  export interface CatalogCity {
    id: string
    name: string
    // A point in the city itself, where the map marks it from afar.
    center: [number, number]
    // Everything the city's lines draw, to frame it on the map.
    extent: Extent
    // How many stations the city's lines call at, each counted once.
    stations: number
    // What the data's licences ask a copy of it to say, as published.
    notice: string
    systems: CatalogSystem[]
  }

  export interface CatalogCountry {
    id: string
    name: string
    cities: CatalogCity[]
  }

  export interface Catalog {
    // What the extension calls itself in this language.
    name: string
    // What the extension's own map puts before its data credits.
    creditLead: string
    countries: CatalogCountry[]
  }

  export interface LineProperties {
    kind: 'line'
    id: string
    color: string
  }

  export interface StationProperties {
    kind: 'station'
    id: string
    name: string
    // The ids of the lines calling at the station, each with a bar on either
    // side: |montreal:stm:1|montreal:stm:2|.
    lines: string
    lineCount: number
  }

  export type NetworkFeature =
    Feature<MultiLineString, LineProperties> | Feature<Point, StationProperties>

  // One city's lines and stations, as the map draws them.
  export interface Network {
    type: 'FeatureCollection'
    features: NetworkFeature[]
  }

  // A station as the search finds it.
  export interface CatalogStation {
    // As its operator publishes it, the same in every language.
    name: string
    // The full ids of the lines calling at it: montreal:stm:1.
    lines: string[]
  }

  const catalogs: Record<Locale, Catalog>

  // Each city's geometry, by city id, fetched the first time it is asked
  // for. Only the browser's copy of the module has any: the server never
  // draws a map.
  export const networks: Partial<
    Record<string, () => Promise<{ default: Network }>>
  >

  // Every city's stations, by city id, fetched the first time someone
  // searches. As with the geometry, only the browser's copy has them.
  export const stations:
    | (() => Promise<{
        default: Partial<Record<string, CatalogStation[]>>
      }>)
    | undefined

  export default catalogs
}
