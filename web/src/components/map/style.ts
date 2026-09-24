import type {
  CircleLayerSpecification,
  ExpressionSpecification,
  LineLayerSpecification,
  Map as MapLibreMap,
  SymbolLayerSpecification,
} from 'maplibre-gl'

// How the site draws its networks over the basemap. Colour is the lines' own
// and nothing else's: stations, names and the cities seen from afar are drawn
// in the page's ink on its paper, so the only colour on the map is the one
// that tells a line from its neighbour.

export type Theme = 'light' | 'dark'

// The page's foreground and background, as the map needs them spelled out:
// a map style cannot read the page's CSS variables.
export const INK: Record<Theme, { ink: string; paper: string }> = {
  light: { ink: '#171717', paper: '#ffffff' },
  dark: { ink: '#f5f5f5', paper: '#0a0a0a' },
}

// The basemap's own glyphs, so that the names drawn here need no font server
// of their own. OpenFreeMap serves this stack for both of its styles.
const FONT = ['Noto Sans Regular']

// Seen from further out than this, a city is a dot with its name; closer in
// its lines take over. The two overlap by a zoom level so that one fades out
// while the other fades in.
export const LINES_FROM = 6
const CITIES_UNTIL = 7.5
const STATIONS_FROM = 10.5
const STATION_NAMES_FROM = 12

// The layers each city draws, by the source they read.
export function networkLayers(cityId: string) {
  const source = `network:${cityId}`

  return {
    source,
    lines: `${source}:lines`,
    // Wide and invisible, under the lines, so that a line a few pixels thick
    // can still be pointed at.
    hit: `${source}:hit`,
    stations: `${source}:stations`,
    names: `${source}:names`,
  }
}

type Layers = ReturnType<typeof networkLayers>

const isLine: ExpressionSpecification = ['==', ['get', 'kind'], 'line']
const isStation: ExpressionSpecification = ['==', ['get', 'kind'], 'station']

const isHovered: ExpressionSpecification = [
  'boolean',
  ['feature-state', 'hover'],
  false,
]

// Whether a line, or a station, belongs to the line picked out, if one is.
function onLine(lineId: string | undefined): ExpressionSpecification {
  return lineId ? ['==', ['get', 'id'], lineId] : ['literal', false]
}

function callsAt(lineId: string | undefined): ExpressionSpecification {
  return lineId ? ['in', `|${lineId}|`, ['get', 'lines']] : ['literal', true]
}

function lineWidth(lineId: string | undefined): ExpressionSpecification {
  const width = (normal: number, bold: number): ExpressionSpecification => [
    'case',
    ['any', isHovered, onLine(lineId)],
    bold,
    normal,
  ]

  return [
    'interpolate',
    ['exponential', 1.5],
    ['zoom'],
    LINES_FROM,
    width(1.25, 2.5),
    10,
    width(2.5, 4),
    13,
    width(4, 6),
    16,
    width(7, 9.5),
  ]
}

// Every line at full strength, or the one picked out at full strength and the
// rest faded back, so that it can be followed through a busy trunk.
function lineOpacity(lineId: string | undefined): ExpressionSpecification {
  const strength: ExpressionSpecification | number = lineId
    ? ['case', onLine(lineId), 1, 0.2]
    : 1

  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    LINES_FROM - 0.5,
    0,
    LINES_FROM + 0.5,
    strength,
  ]
}

function stationOpacity(lineId: string | undefined, from: number) {
  const strength: ExpressionSpecification = ['case', callsAt(lineId), 1, 0.25]

  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    from,
    0,
    from + 0.5,
    strength,
  ] satisfies ExpressionSpecification
}

type PaintProperty = Parameters<MapLibreMap['setPaintProperty']>[1]
type PaintValue = Parameters<MapLibreMap['setPaintProperty']>[2]

// Sets each of a layer's paint properties to the value given.
export function setPaint(
  map: MapLibreMap,
  layer: string,
  paint: Record<string, PaintValue>,
) {
  for (const [property, value] of Object.entries(paint)) {
    map.setPaintProperty(layer, property as PaintProperty, value)
  }
}

// What changes when a line is picked out or the theme flips, applied to
// layers already on the map.
export function networkPaint(lineId: string | undefined, theme: Theme) {
  const { ink, paper } = INK[theme]

  return {
    lines: {
      'line-width': lineWidth(lineId),
      'line-opacity': lineOpacity(lineId),
    },
    stations: {
      'circle-color': paper,
      'circle-stroke-color': ink,
      'circle-opacity': stationOpacity(lineId, STATIONS_FROM),
      'circle-stroke-opacity': stationOpacity(lineId, STATIONS_FROM),
    },
    names: {
      'text-color': ink,
      'text-halo-color': paper,
      'text-opacity': stationOpacity(lineId, STATION_NAMES_FROM),
    },
  } satisfies {
    lines: LineLayerSpecification['paint']
    stations: CircleLayerSpecification['paint']
    names: SymbolLayerSpecification['paint']
  }
}

export function networkLayerSpecs(
  layers: Layers,
  lineId: string | undefined,
  theme: Theme,
) {
  const paint = networkPaint(lineId, theme)

  const lines: LineLayerSpecification = {
    id: layers.lines,
    type: 'line',
    source: layers.source,
    filter: isLine,
    minzoom: LINES_FROM - 0.5,
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': ['get', 'color'],
      ...paint.lines,
    },
  }

  const hit: LineLayerSpecification = {
    id: layers.hit,
    type: 'line',
    source: layers.source,
    filter: isLine,
    minzoom: LINES_FROM,
    paint: { 'line-width': 14, 'line-color': 'rgba(0, 0, 0, 0)' },
  }

  const radius = (single: number, shared: number): ExpressionSpecification => [
    'case',
    ['>', ['get', 'lineCount'], 1],
    shared,
    single,
  ]

  const stations: CircleLayerSpecification = {
    id: layers.stations,
    type: 'circle',
    source: layers.source,
    filter: isStation,
    minzoom: STATIONS_FROM,
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        STATIONS_FROM,
        radius(1.75, 2.5),
        13,
        radius(3.25, 4.5),
        16,
        radius(5.5, 7),
      ],
      'circle-stroke-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        STATIONS_FROM,
        1,
        14,
        1.75,
      ],
      ...paint.stations,
    },
  }

  const names: SymbolLayerSpecification = {
    id: layers.names,
    type: 'symbol',
    source: layers.source,
    filter: isStation,
    minzoom: STATION_NAMES_FROM,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': FONT,
      'text-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        STATION_NAMES_FROM,
        11,
        16,
        13,
      ],
      'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
      'text-radial-offset': 0.75,
      'text-justify': 'auto',
      'text-max-width': 8,
      // Where two names want the same spot, the station more lines call at
      // keeps it.
      'symbol-sort-key': ['-', ['get', 'lineCount']],
    },
    paint: {
      'text-halo-width': 1.5,
      ...paint.names,
    },
  }

  return { lines, hit, stations, names }
}

// The cities, seen from far enough out that their lines would be a smudge.
export const CITIES = {
  source: 'cities',
  dots: 'cities:dots',
  names: 'cities:names',
}

export function cityPaint(theme: Theme) {
  const { ink, paper } = INK[theme]

  return {
    dots: {
      'circle-color': ink,
      'circle-stroke-color': paper,
    },
    names: {
      'text-color': ink,
      'text-halo-color': paper,
    },
  } satisfies {
    dots: CircleLayerSpecification['paint']
    names: SymbolLayerSpecification['paint']
  }
}

export function cityLayerSpecs(theme: Theme) {
  const paint = cityPaint(theme)

  const fade: ExpressionSpecification = [
    'interpolate',
    ['linear'],
    ['zoom'],
    CITIES_UNTIL - 1,
    1,
    CITIES_UNTIL,
    0,
  ]

  const dots: CircleLayerSpecification = {
    id: CITIES.dots,
    type: 'circle',
    source: CITIES.source,
    maxzoom: CITIES_UNTIL,
    paint: {
      'circle-radius': 5,
      'circle-stroke-width': 2,
      'circle-opacity': fade,
      'circle-stroke-opacity': fade,
      ...paint.dots,
    },
  }

  const names: SymbolLayerSpecification = {
    id: CITIES.names,
    type: 'symbol',
    source: CITIES.source,
    maxzoom: CITIES_UNTIL,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': FONT,
      'text-size': 13,
      'text-variable-anchor': ['left', 'right', 'top', 'bottom'],
      'text-radial-offset': 0.9,
      'text-justify': 'auto',
    },
    paint: {
      'text-halo-width': 1.5,
      'text-opacity': fade,
      ...paint.names,
    },
  }

  return { dots, names }
}
