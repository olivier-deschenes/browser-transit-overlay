import {
  Link,
  createFileRoute,
  useHydrated,
  useLocation,
} from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { LineBullet } from '@/components/line-bullet'
import { SiteFooter } from '@/components/site-footer'
import { Button } from '@/components/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { MESSAGES, localeOf, localeParam, useLocale } from '@/i18n'
import { catalogIn, isCityId, lineFromHash, lineHash } from '@/lib/catalog'
import { networkQuery } from '@/lib/networks'
import type { Locale } from '@/locales'

// One page per city, at /montreal and /en/montreal. A segment that names no
// city is not this route at all, so /en still reaches the English home page
// rather than a city called "en".
export const Route = createFileRoute('/{-$locale}/_map/$city')({
  params: {
    parse: ({ city }) => (isCityId(city) ? { city } : false),
    stringify: ({ city }) => ({ city }),
  },
  // Start fetching the city's lines as soon as it is pointed at, so that the
  // map has them by the time it gets there. Only the browser draws them.
  loader: ({ context, params }) => {
    if (!import.meta.env.SSR) {
      void context.queryClient.prefetchQuery(networkQuery(params.city))
    }
  },
  head: ({ params }) => {
    const locale = localeOf(params.locale)
    const { catalog, cities } = catalogIn(locale)
    const city = cities.get(params.city)?.city

    if (!city) return {}

    return {
      meta: [
        { title: `${city.name} · ${catalog.name}` },
        {
          name: 'description',
          content: description(
            locale,
            city.name,
            city.systems.map(({ name }) => name),
          ),
        },
      ],
    }
  },
  component: CityPanel,
})

function description(locale: Locale, city: string, systems: string[]) {
  const list = new Intl.ListFormat(locale, { type: 'conjunction' }).format(
    systems,
  )

  return {
    fr: `Les lignes de transport en commun rapide à ${city}, sur les cartes de logements de Facebook Marketplace et de Centris : ${list}.`,
    en: `Rapid transit lines in ${city} on Facebook Marketplace and Centris housing maps: ${list}.`,
  }[locale]
}

// A city's operators and their lines, each line with the stations it calls
// at. Picking a line picks it out on the map; picking it again lets it go.
function CityPanel() {
  const { city: cityId } = Route.useParams()
  const hash = useLocation({ select: (location) => location.hash })
  const locale = useLocale()
  const messages = MESSAGES[locale]
  const { catalog, cities } = catalogIn(locale)
  const entry = cities.get(cityId)

  // The page is prerendered without a line picked out, so the list only
  // shows one once it is running in the browser and knows the address.
  const hydrated = useHydrated()
  const picked = hydrated ? lineFromHash(cityId, hash) : undefined

  // A line picked on the map may be far down a long list, as Paris's and New
  // York's are, so the list brings it into view.
  const pickedRow = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    pickedRow.current?.scrollIntoView({ block: 'nearest' })
  }, [picked])

  if (!entry) return null

  const { city, country } = entry
  const params = { locale: localeParam(locale), city: city.id }
  const lineCount = city.systems.reduce(
    (total, { lines }) => total + lines.length,
    0,
  )

  // Credited once per publisher, as on the map: Paris's métro and RER both
  // come from Île-de-France Mobilités.
  const publishers = [
    ...new Map(
      city.systems.map(({ attribution }) => [attribution.label, attribution]),
    ).values(),
  ]

  return (
    <div className="flex flex-1 flex-col gap-8 px-5 py-6">
      <header className="flex flex-col items-start gap-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ml-2.5"
        >
          <Link
            to="/{-$locale}"
            params={{ locale: localeParam(locale) }}
            activeOptions={{ exact: true }}
          >
            <ArrowLeft />
            {messages.allCities}
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{city.name}</h1>
        <p className="text-muted-foreground text-sm">
          {[
            country.name,
            messages.lines(lineCount),
            messages.stations(city.stations),
          ].join(' · ')}
        </p>
      </header>

      {city.systems.map((system) => (
        <section
          key={system.id}
          aria-labelledby={`system-${system.id}`}
          className="flex flex-col gap-1"
        >
          <h2
            id={`system-${system.id}`}
            className="text-muted-foreground text-xs font-medium"
          >
            {system.name}
          </h2>

          <ul className="-mx-3">
            {system.lines.map((each) => {
              const isPicked = each.id === picked

              return (
                <li key={each.id}>
                  <Item
                    asChild
                    size="sm"
                    variant={isPicked ? 'muted' : 'default'}
                  >
                    <Link
                      to="/{-$locale}/$city"
                      params={params}
                      hash={isPicked ? undefined : lineHash(each.id)}
                      activeOptions={{ includeHash: true }}
                      hashScrollIntoView={false}
                      resetScroll={false}
                      replace
                      aria-current={isPicked ? 'true' : undefined}
                      ref={isPicked ? pickedRow : undefined}
                      // On a phone, clear of the map stuck above the list.
                      className="scroll-mt-[calc(45svh+1rem)] scroll-mb-4 md:scroll-mt-4"
                    >
                      <ItemMedia>
                        <LineBullet line={each} />
                      </ItemMedia>
                      <ItemContent className="min-w-0 gap-0.5">
                        <ItemTitle>{each.name}</ItemTitle>
                        <ItemDescription className="truncate">
                          {each.detail}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions className="text-muted-foreground text-xs tabular-nums">
                        {messages.stations(each.stations)}
                      </ItemActions>
                    </Link>
                  </Item>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      <section className="text-muted-foreground flex flex-col gap-2 text-xs leading-relaxed">
        <p>
          {catalog.creditLead}{' '}
          {publishers.map(({ label, terms, license }, index) => (
            <span key={label}>
              {index > 0 && ' · '}
              <a
                href={terms}
                className="hover:text-foreground underline underline-offset-2"
              >
                {label}
              </a>{' '}
              (
              <a
                href={license.url}
                className="hover:text-foreground underline underline-offset-2"
              >
                {license.label}
              </a>
              )
            </span>
          ))}
        </p>
        {/* The notice the data build writes beside the geometry, which is in
            English whatever the page's language. */}
        <p lang="en">{city.notice}</p>
      </section>

      <SiteFooter className="mt-auto" />
    </div>
  )
}
