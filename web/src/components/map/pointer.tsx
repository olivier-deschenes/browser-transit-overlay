import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type {
  MapGeoJSONFeature,
  Map as MapLibreMap,
  MapMouseEvent,
} from 'maplibre-gl'

import { LineBullet } from '@/components/line-bullet'
import { MapPopup, useMap } from '@/components/ui/map'
import { MESSAGES, localeParam, useLocale } from '@/i18n'
import { catalogIn, lineHash, stationLines } from '@/lib/catalog'
import type { Locale } from '@/locales'
import { CITIES } from './style'

// What the pointer is over, and what clicking does with it. Pointing names a
// line, a station or a city beside the cursor. Clicking a line picks it out,
// or lets it go if it already was; clicking a station opens its lines, which
// a phone has no other way to see; clicking a city goes to it, and clicking
// anywhere else lets go of the line.

type Target =
  | { kind: 'line'; lineId: string }
  | {
      kind: 'station'
      id: string
      name: string
      lines: string[]
      coordinates: [number, number]
    }
  | { kind: 'city'; cityId: string }

interface Hover {
  target: Target
  x: number
  y: number
}

export function Pointer({
  cityId,
  lineId,
}: {
  cityId: string | undefined
  lineId: string | undefined
}) {
  const { map, isLoaded } = useMap()
  const locale = useLocale()
  const navigate = useNavigate()
  const [hover, setHover] = useState<Hover | null>(null)
  const [station, setStation] = useState<Extract<
    Target,
    { kind: 'station' }
  > | null>(null)

  useEffect(() => {
    if (!map || !isLoaded) return

    const { lines } = catalogIn(locale)
    let hovered: { source: string; id: string } | null = null

    const highlight = (next: typeof hovered) => {
      if (hovered?.id === next?.id && hovered?.source === next?.source) return

      if (hovered && map.getSource(hovered.source)) {
        map.setFeatureState(hovered, { hover: false })
      }

      hovered = next

      if (hovered) map.setFeatureState(hovered, { hover: true })
    }

    const goTo = (city: string, line?: string) => {
      void navigate({
        to: '/{-$locale}/$city',
        params: { locale: localeParam(locale), city },
        hash: line && lineHash(line),
        hashScrollIntoView: false,
        resetScroll: city !== cityId,
        replace: city === cityId,
      })
    }

    const onMove = (event: MapMouseEvent) => {
      const feature = pick(map, event.point)
      const target = feature && targetOf(feature)

      map.getCanvas().style.cursor = target ? 'pointer' : ''
      highlight(
        feature && target?.kind === 'line'
          ? { source: feature.source, id: target.lineId }
          : null,
      )
      setHover(target ? { target, x: event.point.x, y: event.point.y } : null)
    }

    const onLeave = () => {
      highlight(null)
      setHover(null)
    }

    const onClick = (event: MapMouseEvent) => {
      const feature = pick(map, event.point)
      const target = feature && targetOf(feature)

      setStation(target?.kind === 'station' ? target : null)

      if (target?.kind === 'city') {
        goTo(target.cityId)
      } else if (target?.kind === 'line') {
        const city = lines.get(target.lineId)?.city.id

        if (city) {
          goTo(city, target.lineId === lineId ? undefined : target.lineId)
        }
      } else if (!target && cityId && lineId) {
        goTo(cityId)
      }
    }

    const canvas = map.getCanvas()

    map.on('mousemove', onMove)
    map.on('click', onClick)
    canvas.addEventListener('mouseleave', onLeave)

    return () => {
      map.off('mousemove', onMove)
      map.off('click', onClick)
      canvas.removeEventListener('mouseleave', onLeave)
      canvas.style.cursor = ''

      try {
        highlight(null)
      } catch {
        // The style that held the highlighted line is already gone.
      }
    }
  }, [map, isLoaded, locale, navigate, cityId, lineId])

  return (
    <>
      {hover && <Tooltip hover={hover} locale={locale} />}

      {station && (
        <MapPopup
          key={station.id}
          longitude={station.coordinates[0]}
          latitude={station.coordinates[1]}
          closeButton
          closeOnClick={false}
          onClose={() => setStation(null)}
        >
          <StationLines
            station={station}
            locale={locale}
            onPick={() => setStation(null)}
          />
        </MapPopup>
      )}
    </>
  )
}

// The pointable layers under a point, topmost first: stations sit over the
// lines, which sit over nothing else of the site's. A few pixels of slack make
// a station dot easier to land on.
function pick(map: MapLibreMap, { x, y }: { x: number; y: number }) {
  const layers = map
    .getLayersOrder()
    .filter(
      (id) =>
        id.endsWith(':stations') ||
        id.endsWith(':names') ||
        id.endsWith(':hit') ||
        id === CITIES.dots ||
        id === CITIES.names,
    )

  if (!layers.length) return undefined

  const [feature] = map.queryRenderedFeatures(
    [
      [x - 4, y - 4],
      [x + 4, y + 4],
    ],
    { layers },
  ) as Array<MapGeoJSONFeature | undefined>

  return feature
}

function targetOf(feature: MapGeoJSONFeature): Target | undefined {
  const properties = feature.properties as Record<string, unknown>
  const id = String(properties.id)

  if (feature.source === CITIES.source) return { kind: 'city', cityId: id }
  if (properties.kind === 'line') return { kind: 'line', lineId: id }

  if (properties.kind === 'station' && feature.geometry.type === 'Point') {
    const [longitude, latitude] = feature.geometry.coordinates

    return {
      kind: 'station',
      id,
      name: String(properties.name),
      lines: stationLines(String(properties.lines)),
      coordinates: [longitude, latitude],
    }
  }

  return undefined
}

// Beside the cursor, and turned to the other side of it near the map's right
// and bottom edges so that it never runs off the map.
function Tooltip({ hover, locale }: { hover: Hover; locale: Locale }) {
  const { map } = useMap()
  const { cities, lines } = catalogIn(locale)
  const container = map?.getContainer()
  const flipX = container ? hover.x > container.clientWidth - 240 : false
  const flipY = container ? hover.y > container.clientHeight - 120 : false
  const { target } = hover

  let content: React.ReactNode = null

  if (target.kind === 'line') {
    const entry = lines.get(target.lineId)

    if (entry) {
      content = (
        <div className="flex items-center gap-2">
          <LineBullet line={entry.line} />
          <div className="min-w-0">
            <p className="font-medium">{entry.line.name}</p>
            <p className="text-muted-foreground">{entry.line.detail}</p>
          </div>
        </div>
      )
    }
  } else if (target.kind === 'station') {
    content = (
      <>
        <p className="font-medium">{target.name}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {target.lines.map((id) => {
            const line = lines.get(id)?.line

            return line && <LineBullet key={id} line={line} />
          })}
        </div>
      </>
    )
  } else {
    const entry = cities.get(target.cityId)

    if (entry) {
      const count = entry.city.systems.reduce(
        (total, { lines: each }) => total + each.length,
        0,
      )

      content = (
        <>
          <p className="font-medium">{entry.city.name}</p>
          <p className="text-muted-foreground">
            {MESSAGES[locale].lines(count)}
          </p>
        </>
      )
    }
  }

  if (!content) return null

  return (
    <div
      role="tooltip"
      className="bg-popover text-popover-foreground pointer-events-none absolute z-20 max-w-60 rounded-md border px-2.5 py-2 text-xs shadow-md"
      style={{
        left: hover.x,
        top: hover.y,
        transform: `translate(${flipX ? 'calc(-100% - 12px)' : '12px'}, ${flipY ? 'calc(-100% - 12px)' : '12px'})`,
      }}
    >
      {content}
    </div>
  )
}

function StationLines({
  station,
  locale,
  onPick,
}: {
  station: Extract<Target, { kind: 'station' }>
  locale: Locale
  onPick: () => void
}) {
  const { lines } = catalogIn(locale)

  return (
    <div className="pr-5 text-sm">
      <p className="font-medium">{station.name}</p>
      <ul className="mt-2 space-y-1">
        {station.lines.map((id) => {
          const entry = lines.get(id)

          if (!entry) return null

          return (
            <li key={id}>
              <Link
                to="/{-$locale}/$city"
                params={{ locale: localeParam(locale), city: entry.city.id }}
                hash={lineHash(id)}
                hashScrollIntoView={false}
                resetScroll={false}
                replace
                onClick={onPick}
                className="hover:bg-muted -mx-1.5 flex items-center gap-2 rounded-md px-1.5 py-1"
              >
                <LineBullet line={entry.line} />
                <span>{entry.line.name}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
