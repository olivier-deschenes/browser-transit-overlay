import {
  ClientOnly,
  Outlet,
  createFileRoute,
  useLocation,
  useParams,
} from '@tanstack/react-router'
import { Suspense, lazy } from 'react'

import { MESSAGES, useLocale } from '@/i18n'
import { lineFromHash } from '@/lib/catalog'

// MapLibre is most of the page's weight and draws nothing without a browser,
// so the map arrives after the page, in a chunk of its own.
const TransitMap = lazy(() => import('@/components/map/transit-map'))

// The home page and every city's page share one map, so that going from one
// to another moves the map rather than making a new one. The panel beside it
// is the page itself: what the map shows, in words.
export const Route = createFileRoute('/{-$locale}/_map')({
  component: MapLayout,
})

function MapLayout() {
  const locale = useLocale()
  const messages = MESSAGES[locale]
  const { city } = useParams({ strict: false })
  const hash = useLocation({ select: (location) => location.hash })
  const lineId = lineFromHash(city, hash)

  return (
    <div className="flex min-h-dvh flex-col-reverse md:h-dvh md:min-h-0 md:flex-row">
      <a
        href="#main"
        className="bg-background sr-only z-30 rounded-md border px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {messages.skip}
      </a>

      <main
        id="main"
        className="flex flex-1 flex-col md:w-96 md:flex-none md:overflow-y-auto md:border-r"
      >
        <Outlet />
      </main>

      {/* On a phone the map stays in sight above the panel as it scrolls. */}
      <div
        role="region"
        aria-label={messages.map}
        className="bg-muted sticky top-0 z-10 h-[45svh] shrink-0 border-b md:static md:h-auto md:flex-1 md:border-b-0"
      >
        <ClientOnly>
          <Suspense>
            <TransitMap cityId={city} lineId={lineId} />
          </Suspense>
        </ClientOnly>
      </div>
    </div>
  )
}
