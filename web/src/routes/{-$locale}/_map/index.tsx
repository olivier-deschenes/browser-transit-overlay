import { Link, createFileRoute } from '@tanstack/react-router'

import pluginIcon from '../../../../../extension/icons/icon-128.png'
import { LineDot } from '@/components/line-bullet'
import { SiteFooter } from '@/components/site-footer'
import { Button } from '@/components/ui/button'
import { Item, ItemContent, ItemTitle } from '@/components/ui/item'
import {
  CONTACT_EMAIL,
  MESSAGES,
  localeOf,
  localeParam,
  mailto,
  number,
  useLocale,
} from '@/i18n'
import { catalogIn } from '@/lib/catalog'

export const Route = createFileRoute('/{-$locale}/_map/')({
  component: Overview,
  head: ({ params }) => {
    const locale = localeOf(params.locale)

    return {
      meta: [
        {
          title: `${catalogIn(locale).catalog.name} · ${MESSAGES[locale].chromeExtension}`,
        },
      ],
    }
  },
})

interface Totals {
  cities: number
  lines: number
  stations: number
}

const fr = {
  intro:
    'Extension Chrome qui affiche les lignes et les stations du transport en commun rapide sur les cartes de logements de Facebook Marketplace et de Centris.',
  totals: ({ cities, lines, stations }: Totals) =>
    `${number('fr', lines)} lignes et ${number('fr', stations)} stations dans ${number('fr', cities)} villes.`,
  requestTitle: 'Demander une ville',
  requestText:
    'Votre ville n’est pas dans la liste ? Écrivez-nous en indiquant la ville et les lignes que vous aimeriez voir sur la carte.',
  requestSubject: 'Demande de ville',
  requestBody: 'Ville :\nLignes souhaitées :\n',
}

const en: typeof fr = {
  intro:
    'Chrome extension that shows rapid transit lines and stations on Facebook Marketplace and Centris housing maps.',
  totals: ({ cities, lines, stations }: Totals) =>
    `${number('en', lines)} lines and ${number('en', stations)} stations in ${number('en', cities)} cities.`,
  requestTitle: 'Request a city',
  requestText:
    'Is your city missing? Email us with the city and the lines you would like to see on the map.',
  requestSubject: 'City request',
  requestBody: 'City:\nLines:\n',
}

const COPY = { fr, en }

// Every city the extension draws, by country, each with its lines as dots of
// their colours: the whole catalogue at a glance, and the way into each city.
function Overview() {
  const locale = useLocale()
  const { catalog, totals } = catalogIn(locale)
  const copy = COPY[locale]
  const messages = MESSAGES[locale]

  return (
    <div className="flex flex-1 flex-col gap-8 px-5 py-6">
      <header className="flex flex-col gap-3">
        <img src={pluginIcon} alt="" className="size-9" />
        <h1 className="text-xl font-semibold tracking-tight text-balance">
          {catalog.name}
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {copy.intro}
        </p>
        <p className="text-sm">{copy.totals(totals)}</p>
      </header>

      <nav aria-label={messages.cities} className="flex flex-col gap-6">
        {catalog.countries.map((country) => (
          <section
            key={country.id}
            aria-labelledby={`country-${country.id}`}
            className="flex flex-col gap-1"
          >
            <h2
              id={`country-${country.id}`}
              className="text-muted-foreground text-xs font-medium"
            >
              {country.name}
            </h2>

            <ul className="-mx-3">
              {country.cities.map((city) => {
                const lines = city.systems.flatMap(({ lines: each }) => each)

                return (
                  <li key={city.id}>
                    <Item asChild size="sm">
                      <Link
                        to="/{-$locale}/$city"
                        params={{ locale: localeParam(locale), city: city.id }}
                      >
                        <ItemContent className="gap-1.5">
                          <ItemTitle>{city.name}</ItemTitle>
                          <span className="flex flex-wrap gap-1">
                            {lines.map((line) => (
                              <LineDot key={line.id} line={line} />
                            ))}
                          </span>
                          <span className="sr-only">
                            {messages.lines(lines.length)}
                          </span>
                        </ItemContent>
                      </Link>
                    </Item>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </nav>

      <section aria-labelledby="request-city" className="flex flex-col gap-2">
        <h2 id="request-city" className="text-sm font-medium">
          {copy.requestTitle}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {copy.requestText}
        </p>
        <Button asChild variant="outline" size="sm" className="self-start">
          <a href={mailto(copy.requestSubject, copy.requestBody)}>
            {CONTACT_EMAIL}
          </a>
        </Button>
      </section>

      <SiteFooter className="mt-auto" />
    </div>
  )
}
