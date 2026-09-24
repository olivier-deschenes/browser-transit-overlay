import { readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import type { Plugin } from 'vite'
import type {
  Catalog,
  CatalogCity,
  Extent,
  Network,
  NetworkFeature,
} from 'virtual:extension-catalog'

// The website names the extension, lists the cities and lines it draws and
// draws them on its own map, and reads all of it out of the extension itself
// at build time rather than keeping a copy of its own. The registry in
// networks.js says which cities, operators and lines there are, i18n.js what
// the extension and each of them is called in each language, and the files
// under networks/ where each line runs and where its stations are. This
// plugin runs the two scripts the way Chrome does, reads the geometry beside
// them, and hands the site the result as ordinary modules:
//
//   import catalogs, { networks } from 'virtual:extension-catalog'
//   catalogs.en.countries
//   await networks.paris()
//
// The catalogue is small and every page names what is in it, so it is one
// module. The geometry is most of the weight, and the map only ever wants the
// cities it is looking at, so each city's is a module of its own that the
// browser fetches the first time the map needs it.
//
// Nothing of the extension ships to the browser but that data. A city added
// to the registry therefore appears on the next build of the site, and a
// registry the site cannot read fails that build instead of publishing a
// stale list or a map with a line missing.

const MODULE_ID = 'virtual:extension-catalog'
const RESOLVED_ID = `\0${MODULE_ID}`

// One module per city: virtual:extension-network/paris.
const NETWORK_PREFIX = 'virtual:extension-network/'
const RESOLVED_NETWORK_PREFIX = `\0${NETWORK_PREFIX}`

// In the order the manifest loads them. They are classic scripts sharing one
// global scope, not modules, so they are run in a single context here too.
const SCRIPTS = ['i18n.js', 'networks.js']

interface Options {
  // The extension's own directory, where manifest.json is.
  extension: string
  // The language blocks of i18n.js the site is written in.
  locales: readonly string[]
}

export function extensionCatalog({ extension, locales }: Options): Plugin {
  const scripts = SCRIPTS.map((name) => path.join(extension, name))

  return {
    name: 'extension-catalog',

    resolveId(id) {
      if (id === MODULE_ID) return RESOLVED_ID
      if (id.startsWith(NETWORK_PREFIX)) return `\0${id}`
    },

    load(id) {
      if (id === RESOLVED_ID) {
        const registry = readRegistry(scripts)
        const geometry = readGeometry(extension, registry)

        // So that editing the registry or a city's geometry in dev reloads
        // the pages that list or draw it.
        for (const file of [
          ...scripts,
          ...[...geometry.values()].map(({ file: drawn }) => drawn),
        ]) {
          this.addWatchFile(file)
        }

        const catalogs = Object.fromEntries(
          locales.map((locale) => [
            locale,
            catalogIn(registry, geometry, locale),
          ]),
        )

        // The server renders the names but never draws a map, so only the
        // browser's copy of this module points at the geometry, and the
        // server bundle carries none of it.
        const loaders =
          this.environment.config.consumer === 'client'
            ? registry.STM_CITIES.map(
                ({ id: city }) =>
                  `${JSON.stringify(city)}: () => import(${JSON.stringify(NETWORK_PREFIX + city)})`,
              )
            : []

        return [
          `export default ${JSON.stringify(catalogs)}`,
          `export const networks = {${loaders.join(', ')}}`,
        ].join('\n')
      }

      if (id.startsWith(RESOLVED_NETWORK_PREFIX)) {
        const cityId = id.slice(RESOLVED_NETWORK_PREFIX.length)
        const registry = readRegistry(scripts)
        const city = registry.STM_CITIES.find(({ id: each }) => each === cityId)

        if (!city) throw new Error(`The extension has no city "${cityId}".`)

        const file = path.join(extension, city.data)

        this.addWatchFile(file)

        return `export default ${JSON.stringify(networkOf(city, readJson(file)))}`
      }
    },
  }
}

interface RegistryLine {
  badge?: string
  color: string
  id: string
}

interface RegistrySystem {
  id: string
  mode: string
  attribution: {
    label: string
    terms: string
    license: { label: string; url: string }
  }
  lines: RegistryLine[]
}

interface RegistryCity {
  id: string
  country: string
  origin: [number, number]
  data: string
  systems: RegistrySystem[]
}

interface Registry {
  STM_CITIES: RegistryCity[]
  STM_CITIES_BY_COUNTRY: Map<string, RegistryCity[]>
  STM_LOCALES: Record<string, { messages: Record<string, string> } | undefined>
  stmLineBadge: (line: { badge?: string; id: string }) => string
  stmLineInk: (color: string) => string
}

// A city's geometry file as the build writes it: each line as the paths it is
// drawn along, each station with the lines that call at it. Line ids in it
// leave out the city, which the file is already named for.
interface Geometry {
  notice: string
  lines: Array<{ id: string; paths: Array<Array<[number, number]>> }>
  stations: Array<{
    name: string
    lines: string[]
    coordinates: [number, number]
  }>
}

function readRegistry(scripts: string[]): Registry {
  const context = vm.createContext({})

  for (const script of scripts) {
    vm.runInContext(readFileSync(script, 'utf8'), context, {
      filename: script,
    })
  }

  // Top-level const declarations are not properties of the context's global
  // object, but a later script run in the same context can still see them.
  return vm.runInContext(
    '({ STM_CITIES, STM_CITIES_BY_COUNTRY, STM_LOCALES, stmLineBadge, stmLineInk })',
    context,
  ) as Registry
}

function readJson(file: string) {
  return JSON.parse(readFileSync(file, 'utf8')) as Geometry
}

// Every city's geometry, by city, with the file it came from.
function readGeometry(extension: string, registry: Registry) {
  return new Map(
    registry.STM_CITIES.map((city) => {
      const file = path.join(extension, city.data)

      return [city.id, { file, geometry: readJson(file) }] as const
    }),
  )
}

// Four decimals of a degree is ten metres or so: more than enough to frame a
// line, and a catalogue of a hundred lines stays small.
function round(value: number) {
  return Math.round(value * 1e4) / 1e4
}

function extentOf(points: Iterable<[number, number]>): Extent {
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity

  for (const [longitude, latitude] of points) {
    west = Math.min(west, longitude)
    south = Math.min(south, latitude)
    east = Math.max(east, longitude)
    north = Math.max(north, latitude)
  }

  return [
    [round(west), round(south)],
    [round(east), round(north)],
  ]
}

function catalogIn(
  registry: Registry,
  geometry: ReturnType<typeof readGeometry>,
  locale: string,
): Catalog {
  const messages = registry.STM_LOCALES[locale]?.messages

  if (!messages) {
    throw new Error(`The extension has no "${locale}" block in i18n.js.`)
  }

  // Strictly the page's own language: falling back to English, as the
  // extension does, would put English on a French page without anyone
  // noticing.
  const name = (key: string) => {
    const text = messages[key]

    if (!text) {
      throw new Error(`The extension's "${locale}" block names no ${key}.`)
    }

    return text
  }

  const cityIn = (city: RegistryCity): CatalogCity => {
    const drawn = geometry.get(city.id)?.geometry

    if (!drawn) throw new Error(`The extension draws nothing for "${city.id}".`)

    return {
      id: city.id,
      name: name(`city.${city.id}.name`),
      center: city.origin,
      extent: extentOf(drawn.lines.flatMap(({ paths }) => paths.flat())),
      stations: drawn.stations.length,
      notice: drawn.notice,
      systems: city.systems.map((system) => {
        const systemId = `${city.id}:${system.id}`

        return {
          id: systemId,
          name: name(`system.${systemId}.name`),
          attribution: system.attribution,
          lines: system.lines.map((line) => {
            const local = `${system.id}:${line.id}`
            const lineId = `${city.id}:${local}`
            const paths = drawn.lines.find(({ id }) => id === local)?.paths

            if (!paths) {
              throw new Error(`The extension draws no line ${lineId}.`)
            }

            return {
              id: lineId,
              badge: registry.stmLineBadge({ ...line, id: lineId }),
              color: line.color,
              ink: registry.stmLineInk(line.color),
              name: name(`line.${lineId}.name`),
              detail: name(`line.${lineId}.detail`),
              extent: extentOf(paths.flat()),
              stations: drawn.stations.filter(({ lines }) =>
                lines.includes(local),
              ).length,
            }
          }),
        }
      }),
    }
  }

  return {
    name: name('extension.name'),
    creditLead: name('credits.lead'),
    countries: [...registry.STM_CITIES_BY_COUNTRY].map(([country, cities]) => ({
      id: country,
      name: name(`country.${country}.name`),
      cities: cities.map(cityIn),
    })),
  }
}

// A city's lines and stations as the one GeoJSON collection its map source
// is made from. Every feature carries its full id, so the map, the panel and
// the address bar all speak of montreal:stm:1 rather than of stm:1 in
// Montréal. The lines a station serves are joined into one string with a
// bar on each side, because map styles can search a string but not a list,
// and |paris:metro:1| cannot be found inside |paris:metro:14|.
function networkOf(city: RegistryCity, geometry: Geometry): Network {
  const features: NetworkFeature[] = []

  // In the registry's order, which is the order the operators list them.
  // The map draws later features over earlier ones, so where lines share a
  // track the one listed first ends up underneath.
  for (const system of city.systems) {
    for (const line of system.lines) {
      const local = `${system.id}:${line.id}`
      const paths = geometry.lines.find(({ id }) => id === local)?.paths

      if (!paths) {
        throw new Error(`The extension draws no line ${city.id}:${local}.`)
      }

      features.push({
        type: 'Feature',
        properties: {
          kind: 'line',
          id: `${city.id}:${local}`,
          color: line.color,
        },
        geometry: { type: 'MultiLineString', coordinates: paths },
      })
    }
  }

  geometry.stations.forEach((station, index) => {
    features.push({
      type: 'Feature',
      properties: {
        kind: 'station',
        id: `${city.id}:station:${index}`,
        name: station.name,
        lines: `|${station.lines.map((line) => `${city.id}:${line}`).join('|')}|`,
        lineCount: station.lines.length,
      },
      geometry: { type: 'Point', coordinates: station.coordinates },
    })
  })

  return { type: 'FeatureCollection', features }
}
