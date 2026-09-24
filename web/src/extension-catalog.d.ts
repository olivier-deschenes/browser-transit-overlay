// The extension's name and its cities and lines, in each of the site's
// languages, built from its registry by plugins/extension-catalog.ts each time
// the site is built.
declare module 'virtual:extension-catalog' {
  import type { Locale } from '#/locales'

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
  }

  export interface CatalogSystem {
    id: string
    name: string
    lines: CatalogLine[]
  }

  export interface CatalogCity {
    id: string
    name: string
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
    countries: CatalogCountry[]
  }

  const catalogs: Record<Locale, Catalog>

  export default catalogs
}
