import catalogs from 'virtual:extension-catalog'

import { useLocale } from '../i18n'
import type { Locale } from '../locales'

const TITLE: Record<Locale, string> = {
  fr: 'Réseaux pris en charge',
  en: 'Supported networks',
}

// Every city, operator and line the extension draws, read out of its registry
// when the site is built (see plugins/extension-catalog.ts), in the order the
// extension's own city picker lists them: by country, then by city.
export function NetworkList() {
  const locale = useLocale()

  return (
    <section aria-labelledby="networks">
      <h2 id="networks">{TITLE[locale]}</h2>

      {catalogs[locale].countries.map((country) => (
        <div key={country.id} className="mt-6">
          <h3 className="mb-2 text-sm text-neutral-500">{country.name}</h3>

          <dl className="m-0">
            {country.cities.map((city) => (
              <div
                key={city.id}
                className="grid gap-x-6 gap-y-1 border-t border-neutral-200 py-3 sm:grid-cols-[9rem_1fr]"
              >
                <dt className="font-bold">{city.name}</dt>

                <dd className="m-0">
                  <ul className="m-0 list-none space-y-2 p-0">
                    {city.systems.map((system) => (
                      <li key={system.id}>
                        {system.name}

                        <ul className="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0">
                          {system.lines.map((line) => (
                            <li key={line.id}>
                              <span
                                aria-hidden
                                title={line.name}
                                className="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold"
                                style={{
                                  backgroundColor: line.color,
                                  color: line.ink,
                                }}
                              >
                                {line.badge}
                              </span>
                              <span className="sr-only">{line.name}</span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </section>
  )
}
