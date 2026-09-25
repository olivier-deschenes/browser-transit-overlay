import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, useHydrated } from '@tanstack/react-router'
import { useId, useMemo, useState } from 'react'

import pluginIcon from '../../../../../extension/icons/icon-128.png'
import { LineBullet, LineDot } from '@/components/line-bullet'
import { SearchField } from '@/components/search-field'
import { SiteFooter } from '@/components/site-footer'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import {
  CONTACT_EMAIL,
  MESSAGES,
  localeOf,
  localeParam,
  mailto,
  number,
  plural,
  useLocale,
} from '@/i18n'
import { catalogIn, lineHash } from '@/lib/catalog'
import { searchCatalog, stationsQuery } from '@/lib/search'
import type { CityMatch, CountryMatch } from '@/lib/search'
import type { Locale } from '@/locales'

export const Route = createFileRoute('/{-$locale}/_map/')({
  // What the list is narrowed to, as the reader typed it: /en?q=berri. A
  // number or a word like "true" in the address is read as text.
  validateSearch: (search: Record<string, unknown>): { q?: string } => {
    const q =
      typeof search.q === 'number' || typeof search.q === 'boolean'
        ? String(search.q)
        : search.q

    return typeof q === 'string' && q.trim() ? { q } : {}
  },
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

// Stations a city lists under it before the rest are asked for: a word as
// short as "st" is in the names of most of New York's.
const STATIONS_SHOWN = 5

const fr = {
  intro:
    'Extension Chrome qui affiche les lignes et les stations du transport en commun rapide sur les cartes de logements de Facebook Marketplace et de Centris.',
  totals: ({ cities, lines, stations }: Totals) =>
    `${number('fr', lines)} lignes et ${number('fr', stations)} stations dans ${number('fr', cities)} villes.`,
  searchLabel: 'Rechercher une ville, une ligne ou une station',
  searchPlaceholder: 'Ville, ligne ou station',
  clear: 'Effacer la recherche',
  searching: 'Recherche des stations…',
  found: ({ cities, lines, stations }: Totals) =>
    new Intl.ListFormat('fr', { type: 'unit' }).format(
      [
        `${number('fr', cities)} ${plural('fr', cities, 'ville', 'villes')}`,
        lines > 0 && MESSAGES.fr.lines(lines),
        stations > 0 && MESSAGES.fr.stations(stations),
      ].filter((part) => part !== false),
    ),
  nothingFound: (query: string) => `Aucun résultat pour « ${query} »`,
  nothingFoundHint:
    'Vérifiez l’orthographe, ou demandez-nous d’ajouter votre ville ci-dessous.',
  moreStations: (count: number) =>
    `${number('fr', count)} ${plural('fr', count, 'autre station', 'autres stations')}`,
  fewerStations: 'Moins de stations',
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
  searchLabel: 'Search for a city, a line or a station',
  searchPlaceholder: 'City, line or station',
  clear: 'Clear the search',
  searching: 'Searching the stations…',
  found: ({ cities, lines, stations }: Totals) =>
    new Intl.ListFormat('en', { type: 'unit' }).format(
      [
        `${number('en', cities)} ${plural('en', cities, 'city', 'cities')}`,
        lines > 0 && MESSAGES.en.lines(lines),
        stations > 0 && MESSAGES.en.stations(stations),
      ].filter((part) => part !== false),
    ),
  nothingFound: (query: string) => `No results for “${query}”`,
  nothingFoundHint: 'Check the spelling, or ask us to add your city below.',
  moreStations: (count: number) =>
    `${number('en', count)} more ${plural('en', count, 'station', 'stations')}`,
  fewerStations: 'Fewer stations',
  requestTitle: 'Request a city',
  requestText:
    'Is your city missing? Email us with the city and the lines you would like to see on the map.',
  requestSubject: 'City request',
  requestBody: 'City:\nLines:\n',
}

const COPY = { fr, en }

// Every city the extension draws, by country, each with its lines as dots of
// their colours: the whole catalogue at a glance, and the way into each city.
// Searching narrows it to the cities, lines and stations named like what is
// typed, each line and station under its city.
function Overview() {
  const locale = useLocale()
  const { catalog, totals } = catalogIn(locale)
  const copy = COPY[locale]
  const messages = MESSAGES[locale]
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()

  // The page is prerendered without a search, so the list is only narrowed
  // once it runs in the browser and knows the address.
  const hydrated = useHydrated()
  const q = Route.useSearch({ select: (search) => search.q })
  const query = hydrated && q ? q : ''

  const stationIndex = useQuery({ ...stationsQuery(), enabled: query !== '' })
  const searchingStations = query !== '' && stationIndex.isLoading

  const countries = useMemo(
    () => searchCatalog(locale, query, stationIndex.data),
    [locale, query, stationIndex.data],
  )

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

      <div className="flex flex-col gap-6">
        <SearchField
          value={query}
          onSearch={(typed) =>
            void navigate({
              to: '.',
              search: typed ? { q: typed } : {},
              replace: true,
              resetScroll: false,
            })
          }
          // The stations are fetched as soon as the box is focused, so that
          // they are there by the time the first search is.
          onFocus={() => void queryClient.prefetchQuery(stationsQuery())}
          busy={searchingStations}
          label={copy.searchLabel}
          placeholder={copy.searchPlaceholder}
          clearLabel={copy.clear}
        />

        <p role="status" className="sr-only">
          {query !== '' &&
            (searchingStations
              ? copy.searching
              : countries.length > 0
                ? copy.found(tally(countries))
                : copy.nothingFound(query))}
        </p>

        {countries.length > 0 ? (
          <nav aria-label={messages.cities} className="flex flex-col gap-6">
            {countries.map(({ country, cities }) => (
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
                  {cities.map((match) => (
                    // Anew for each search, so that a city's stations fold
                    // back up when the search changes.
                    <CityRow
                      key={`${match.city.id}:${query}`}
                      match={match}
                      locale={locale}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </nav>
        ) : (
          !searchingStations && (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>{copy.nothingFound(query)}</EmptyTitle>
                <EmptyDescription>{copy.nothingFoundHint}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )
        )}
      </div>

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

function tally(countries: CountryMatch[]): Totals {
  const cities = countries.flatMap((country) => country.cities)

  return {
    cities: cities.length,
    lines: cities.reduce((total, { lines }) => total + lines.length, 0),
    stations: cities.reduce(
      (total, { stations }) => total + stations.length,
      0,
    ),
  }
}

// A city, and under it the lines and stations of it that answer the search.
// A line leads to the city's page with the line picked out; a station to the
// city's page, with its line picked out if only one calls at it.
function CityRow({
  match: { city, lines, stations },
  locale,
}: {
  match: CityMatch
  locale: Locale
}) {
  const copy = COPY[locale]
  const messages = MESSAGES[locale]
  const params = { locale: localeParam(locale), city: city.id }
  const network = city.systems.flatMap(({ lines: each }) => each)
  const listId = useId()
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? stations : stations.slice(0, STATIONS_SHOWN)
  const names = new Intl.ListFormat(locale, { type: 'conjunction' })

  return (
    <li>
      <Item asChild size="sm">
        <Link to="/{-$locale}/$city" params={params}>
          <ItemContent className="gap-1.5">
            <ItemTitle>{city.name}</ItemTitle>
            <span className="flex flex-wrap gap-1">
              {network.map((line) => (
                <LineDot key={line.id} line={line} />
              ))}
            </span>
            <span className="sr-only">{messages.lines(network.length)}</span>
          </ItemContent>
        </Link>
      </Item>

      {(lines.length > 0 || stations.length > 0) && (
        <ul id={listId} className="mb-2 pl-3">
          {lines.map((line) => (
            <li key={line.id}>
              <Item asChild size="xs">
                <Link
                  to="/{-$locale}/$city"
                  params={params}
                  hash={lineHash(line.id)}
                >
                  <ItemMedia>
                    <LineBullet line={line} className="h-5 min-w-5 px-1" />
                  </ItemMedia>
                  <ItemContent className="min-w-0">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <ItemTitle className="shrink-0 font-normal">
                        {line.name}
                      </ItemTitle>
                      <ItemDescription className="truncate">
                        {line.detail}
                      </ItemDescription>
                    </div>
                  </ItemContent>
                </Link>
              </Item>
            </li>
          ))}

          {shown.map((station) => (
            <li key={station.id}>
              <Item asChild size="xs">
                <Link
                  to="/{-$locale}/$city"
                  params={params}
                  hash={
                    station.lines.length === 1
                      ? lineHash(station.lines[0].id)
                      : undefined
                  }
                >
                  {/* A station as the map draws one: a ring in the page's
                      ink. */}
                  <ItemMedia className="w-5">
                    <span
                      aria-hidden
                      className="border-foreground bg-background size-2.5 rounded-full border-2"
                    />
                  </ItemMedia>
                  <ItemContent className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <ItemTitle className="font-normal">
                        {station.name}
                      </ItemTitle>
                      <span className="flex flex-wrap gap-1">
                        {station.lines.map((line) => (
                          <LineBullet
                            key={line.id}
                            line={line}
                            className="h-4 min-w-4 px-1 text-[0.625rem]"
                          />
                        ))}
                      </span>
                    </div>
                    <span className="sr-only">
                      {`, ${names.format(station.lines.map(({ name }) => name))}`}
                    </span>
                  </ItemContent>
                </Link>
              </Item>
            </li>
          ))}

          {stations.length > STATIONS_SHOWN && (
            <li>
              <Button
                variant="ghost"
                size="xs"
                aria-expanded={expanded}
                aria-controls={listId}
                onClick={() => setExpanded(!expanded)}
                className="text-muted-foreground ml-0.5"
              >
                {expanded
                  ? copy.fewerStations
                  : copy.moreStations(stations.length - STATIONS_SHOWN)}
              </Button>
            </li>
          )}
        </ul>
      )}
    </li>
  )
}
