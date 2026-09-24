import { readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import type { Plugin } from 'vite'
import type { Catalog } from 'virtual:extension-catalog'

// The website names the extension and lists the cities and lines it draws,
// and reads all of it out of the extension itself at build time rather than
// keeping a copy of its own. The registry in networks.js says which cities,
// operators and lines there are, and i18n.js what the extension and each of
// them is called in each language; this plugin runs both the way Chrome does
// and hands the site the result, one catalogue per language, as an ordinary
// module:
//
//   import catalogs from 'virtual:extension-catalog'
//   catalogs.en.countries
//
// Nothing of the extension ships to the browser but that data. A city added to
// the registry therefore appears on the next build of the site, and a registry
// the site cannot read fails that build instead of publishing a stale list.

const MODULE_ID = 'virtual:extension-catalog'
const RESOLVED_ID = `\0${MODULE_ID}`

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
    },

    load(id) {
      if (id !== RESOLVED_ID) return

      // So that editing the registry in dev reloads the pages that list it.
      for (const script of scripts) this.addWatchFile(script)

      return `export default ${JSON.stringify(readCatalogs(scripts, locales))}`
    },
  }
}

interface Registry {
  STM_CITIES_BY_COUNTRY: Map<
    string,
    Array<{
      id: string
      systems: Array<{
        id: string
        lines: Array<{ badge?: string; color: string; id: string }>
      }>
    }>
  >
  STM_LOCALES: Record<string, { messages: Record<string, string> } | undefined>
  stmLineBadge: (line: { badge?: string; id: string }) => string
  stmLineInk: (color: string) => string
}

function readCatalogs(
  scripts: string[],
  locales: readonly string[],
): Record<string, Catalog> {
  const context = vm.createContext({})

  for (const script of scripts) {
    vm.runInContext(readFileSync(script, 'utf8'), context, {
      filename: script,
    })
  }

  // Top-level const declarations are not properties of the context's global
  // object, but a later script run in the same context can still see them.
  const registry = vm.runInContext(
    '({ STM_CITIES_BY_COUNTRY, STM_LOCALES, stmLineBadge, stmLineInk })',
    context,
  ) as Registry

  return Object.fromEntries(
    locales.map((locale) => [locale, catalogIn(registry, locale)]),
  )
}

function catalogIn(registry: Registry, locale: string): Catalog {
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

  return {
    name: name('extension.name'),
    countries: [...registry.STM_CITIES_BY_COUNTRY].map(([country, cities]) => ({
      id: country,
      name: name(`country.${country}.name`),
      cities: cities.map((city) => ({
        id: city.id,
        name: name(`city.${city.id}.name`),
        systems: city.systems.map((system) => {
          const systemId = `${city.id}:${system.id}`

          return {
            id: systemId,
            name: name(`system.${systemId}.name`),
            lines: system.lines.map((line) => {
              const lineId = `${systemId}:${line.id}`

              return {
                id: lineId,
                badge: registry.stmLineBadge({ ...line, id: lineId }),
                color: line.color,
                ink: registry.stmLineInk(line.color),
                name: name(`line.${lineId}.name`),
              }
            }),
          }
        }),
      })),
    })),
  }
}
