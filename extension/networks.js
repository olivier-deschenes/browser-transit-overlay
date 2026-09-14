// Every network the overlay can draw, and the only place any of them is
// named. A line's identity, its name, its colour and who to credit for it are
// stated here once; the files under networks/ carry nothing but geometry.
//
// Identity is three levels deep and spelled with colons:
//
//   city     montreal
//   system   montreal:stm
//   line     montreal:stm:1
//
// The settings are keyed by that id, so splitting it is all it takes to reach
// the switches a line sits under — no registry walk at render time. Two rules
// keep the ids meaning something:
//
//   A city is a metro area rather than a municipality. "montreal" covers
//   Laval, Longueuil and Brossard, because otherwise the REM has no home.
//
//   The last segment is the operator's own public name for the line, never a
//   GTFS route_id. Feed ids churn between releases and one drawn line is
//   routinely several routes — that is exactly what the REM's S1/S2/S3 are —
//   so the route-to-line mapping belongs in the build rather than out here.
//
// This is a script rather than a JSON file because the settings are derived
// from it synchronously, at load, in a service worker that reads it through
// importScripts. Geometry is fetched; identity cannot be.

// The licence the bundled data is published under, named beside the credit
// because that is what the licence asks the credit to say. It is one constant
// rather than one per operator only for as long as every bundled network is on
// these terms; an operator arriving on other terms would carry its own.
const STM_DATA_LICENSE = {
  label: "CC BY 4.0",
  url: "https://creativecommons.org/licenses/by/4.0/"
};

const STM_CITIES = [
  {
    id: "montreal",
    name: "Montréal",

    // What the geometry's local coordinates are measured from, so a path
    // string stays a run of small numbers at two decimals rather than six
    // digits of world coordinate repeated a few hundred times.
    origin: [-73.65, 45.5],

    // Which city a viewport belongs to, as [[west, south], [east, north]].
    // Wide enough to cover the metro area a listing search can wander over,
    // and no wider: a viewport inside two cities' boxes has no answer.
    bounds: [
      [-74.05, 45.35],
      [-73.35, 45.75]
    ],

    data: "networks/montreal.json",

    // Marketplace names the city in its category path, which is what the
    // "Voir Montréal" shortcut rewrites. A city with nowhere to jump to
    // simply leaves this out and the button never appears.
    marketplaceSlug: "montreal",

    systems: [
      {
        id: "stm",
        name: "Métro de Montréal",
        attribution: {
          label: "STM",
          terms: "https://www.stm.info/en/about/developers/terms-use"
        },
        lines: [
          { color: "#00A16B", detail: "Ligne 1", id: "1", name: "Ligne verte" },
          {
            color: "#F58220",
            detail: "Ligne 2",
            id: "2",
            name: "Ligne orange"
          },
          { color: "#FFD520", detail: "Ligne 4", id: "4", name: "Ligne jaune" },
          { color: "#0075C9", detail: "Ligne 5", id: "5", name: "Ligne bleue" }
        ]
      },
      {
        id: "rem",
        name: "REM",
        attribution: { label: "REM", terms: "https://rem.info/fr" },
        // One line rather than three. The REM arrives as several GTFS routes
        // that share a trunk, and the build collapses them, so there is
        // nothing left out here to explain: taking one away on its own would
        // pull that trunk out from under the others.
        lines: [
          {
            color: "#73A400",
            detail: "Réseau express métropolitain",
            id: "a",
            name: "REM"
          }
        ]
      }
    ]
  }
];

// Every line in the catalogue, flattened and carrying the two ids it sits
// under. The options page walks the nested shape to draw its rows; everything
// else wants a line by its own id and gets it from here.
const STM_LINES = STM_CITIES.flatMap((city) =>
  city.systems.flatMap((system) =>
    system.lines.map((line) => ({
      ...line,
      cityId: city.id,
      id: `${city.id}:${system.id}:${line.id}`,
      systemId: `${city.id}:${system.id}`
    }))
  )
);

// The same for the operators, and deliberately without their lines: a line
// reached through here would still be carrying its bare id, and half-qualified
// ids are the one thing this whole shape exists to rule out. STM_LINES is
// where lines are found.
const STM_SYSTEMS = STM_CITIES.flatMap((city) =>
  city.systems.map(({ attribution, id, name }) => ({
    attribution,
    cityId: city.id,
    id: `${city.id}:${id}`,
    name
  }))
);

const STM_LINES_BY_ID = new Map(STM_LINES.map((line) => [line.id, line]));
const STM_CITIES_BY_ID = new Map(STM_CITIES.map((city) => [city.id, city]));

function stmLineById(id) {
  return STM_LINES_BY_ID.get(id);
}

function stmCityById(id) {
  return STM_CITIES_BY_ID.get(id);
}

// Where the overlay starts before anything has said where the map is looking.
const STM_DEFAULT_CITY_ID = STM_CITIES[0].id;

// Which city a map showing this coordinate belongs to, or nothing at all for
// a map pointed somewhere no city claims. Nothing is not an error: it is a
// viewport out over the Atlantic, and the answer there is to go on drawing
// whichever network was already up rather than to swap to another one.
function stmCityAt([longitude, latitude]) {
  return STM_CITIES.find(
    ({ bounds: [[west, south], [east, north]] }) =>
      longitude >= west &&
      longitude <= east &&
      latitude >= south &&
      latitude <= north
  );
}
