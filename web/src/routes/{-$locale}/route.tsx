import {
  Outlet,
  createFileRoute,
  notFound,
  useNavigate,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import catalogs from 'virtual:extension-catalog'

import {
  DEFAULT_LOCALE,
  browserLocale,
  chosenLocale,
  isLocale,
  localeOf,
  localeParam,
  useLocale,
} from '../../i18n'
import type { Locale } from '../../locales'

export const Route = createFileRoute('/{-$locale}')({
  // French lives at the unprefixed URLs, so /fr is not one of them.
  beforeLoad: ({ params }) => {
    if (
      params.locale !== undefined &&
      (!isLocale(params.locale) || params.locale === DEFAULT_LOCALE)
    ) {
      throw notFound()
    }
  },
  head: ({ params }) => {
    const locale = localeOf(params.locale)

    return {
      meta: [{ name: 'description', content: description(locale) }],
    }
  },
  component: LocaleLayout,
})

// Names whichever cities the extension draws: "Montréal, Toronto, … et
// Baltimore", or "…, and Baltimore".
function description(locale: Locale) {
  const names = new Intl.ListFormat(locale, { type: 'conjunction' }).format(
    catalogs[locale].countries.flatMap(({ cities }) =>
      cities.map(({ name }) => name),
    ),
  )

  return {
    fr: `Une extension Chrome qui affiche le transport en commun rapide de ${names} sur les cartes de logements de Facebook Marketplace et de Centris.`,
    en: `A Chrome extension that shows rapid transit in ${names} on Facebook Marketplace and Centris housing maps.`,
  }[locale]
}

function LocaleLayout() {
  const locale = useLocale()
  const navigate = useNavigate()

  // Once the page is up, the reader is moved to the same page in the language
  // the extension would pick for them. A prerendered page cannot ask the
  // browser first, and the server never sees the reader's choice.
  useEffect(() => {
    const preferred = chosenLocale() ?? browserLocale(navigator.languages)

    if (preferred !== locale) {
      void navigate({
        to: '.',
        params: (previous) => ({
          ...previous,
          locale: localeParam(preferred),
        }),
        search: true,
        hash: true,
        replace: true,
      })
    }
  }, [locale, navigate])

  return <Outlet />
}
