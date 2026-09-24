// Every network the overlay can draw. A line's identity, its colour and who to
// credit for it are stated here once; what a city, an operator or a line is
// called depends on the language, so each language says so in i18n.js, keyed
// by the ids below. The files under networks/ carry nothing but geometry.
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
// A city also names its country and a system the kind of service it runs, and
// neither is a fourth level of id: nothing is keyed by them and no setting is
// stored against them. They are what the settings page sorts and filters a
// catalogue of this size by, and what a rider comparing a métro line with a
// regional one is actually choosing between. A line whose service differs from
// the rest of its operator's says so itself — Toronto's light rail runs in the
// same feed, under the same operator, as its subway.
//
// This is a script rather than a JSON file because the settings are derived
// from it synchronously, at load, in a service worker that reads it through
// importScripts. Geometry is fetched; identity cannot be.

// The licences the bundled data is published under, named beside the credit
// because that is what each of these licences asks the credit to say. One
// operator's terms are not another's: Montréal's two publish on CC BY 4.0,
// while the TTC's feed comes through the City of Toronto's open data portal
// and carries the licence that portal puts on everything it hands out. Which
// one covers a network is therefore the operator's to say, below.
const STM_CC_BY_4 = {
  label: "CC BY 4.0",
  url: "https://creativecommons.org/licenses/by/4.0/"
};

const STM_OGL_TORONTO = {
  label: "Open Government Licence – Toronto",
  url: "https://www.toronto.ca/city-government/data-research-maps/open-data/open-data-licence/"
};

// France publishes transit through one national access point, and the three
// sets of terms below are the ones the six networks here came out under. The
// Licence Mobilités is the one the mobility law wrote for transit feeds
// specifically; the other two are the general French open licence and the
// ODbL, and which of them covers a network is the publisher's choice rather
// than anything about the network.
const STM_LICENCE_MOBILITES = {
  label: "Licence Mobilités",
  url: "https://wiki.lafabriquedesmobilites.fr/wiki/Licence_Mobilit%C3%A9s"
};

const STM_LICENCE_OUVERTE_2 = {
  label: "Licence Ouverte 2.0",
  url: "https://www.etalab.gouv.fr/licence-ouverte-open-licence/"
};

const STM_ODBL_1 = {
  label: "ODbL 1.0",
  url: "https://opendatacommons.org/licenses/odbl/1-0/"
};

const STM_CITIES = [
  {
    id: "montreal",
    country: "ca",

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
    // city's shortcut button rewrites. A city with nowhere to jump to simply
    // leaves this out and the button never appears.
    marketplaceSlug: "montreal",

    systems: [
      {
        id: "stm",
        mode: "metro",
        attribution: {
          label: "STM",
          license: STM_CC_BY_4,
          terms: "https://www.stm.info/en/about/developers/terms-use"
        },
        // The colours the STM's own plan du métro is drawn in. That map is
        // authored in CMYK — 100/0/100/0, 0/60/100/0, 0/10/100/0, 100/50/0/0,
        // in line order — which are the four-colour builds of Pantone 355,
        // 158, 116 and 300; these are those Pantones' sRGB values. Sampling
        // the rendered map instead would hand us whatever a PDF renderer
        // guesses CMYK looks like on a screen, which is a different and worse
        // answer.
        lines: [
          { color: "#009739", id: "1" },
          { color: "#E87722", id: "2" },
          { color: "#FFCD00", id: "4" },
          { color: "#005EB8", id: "5" }
        ]
      },
      {
        id: "rem",
        mode: "regional-rail",
        attribution: {
          label: "REM",
          license: STM_CC_BY_4,
          terms: "https://rem.info/fr"
        },
        // One line rather than three. The REM arrives as several GTFS routes
        // that share a trunk, and the build collapses them, so there is
        // nothing left out here to explain: taking one away on its own would
        // pull that trunk out from under the others.
        lines: [
          // The green the REM brands itself in, rather than the neighbouring
          // one its feed declares.
          { color: "#72A300", id: "a" }
        ]
      }
    ]
  },
  {
    id: "toronto",
    country: "ca",

    origin: [-79.4, 43.7],

    // The lines stop well short of this box on every side, which is the
    // point: a search that has wandered out past Mississauga or Markham is
    // still a search this network answers.
    bounds: [
      [-79.95, 43.4],
      [-78.95, 44.1]
    ],

    data: "networks/toronto.json",

    marketplaceSlug: "toronto",

    // One operator, so the settings page hangs these lines straight off
    // Toronto rather than giving them a row of their own to sit under.
    systems: [
      {
        id: "ttc",
        mode: "metro",
        attribution: {
          label: "TTC",
          license: STM_OGL_TORONTO,
          terms:
            "https://open.toronto.ca/dataset/merged-gtfs-ttc-routes-and-schedules/"
        },
        // The TTC Brand Standards' line colours, which the TTC's own site
        // serves verbatim: Pantone 123, 347 and 234 for lines 1, 2 and 4,
        // Orange 021 for 5, and the grey 6 is drawn in. Not the feed's, even
        // though the geometry is: the GTFS declares lines 2, 4, 5 and 6 as
        // 008000, B300B3, FF8000 and 808080 — pure web-safe stand-ins, the
        // colours named rather than the colours used. The gap where 3 should
        // be is the Scarborough RT, which stopped running in 2023 and is no
        // longer in the feed.
        lines: [
          { color: "#F8C300", id: "1" },
          { color: "#00923F", id: "2" },
          { color: "#A21A68", id: "4" },
          { color: "#EB8738", id: "5", mode: "light-rail" },
          { color: "#969594", id: "6", mode: "light-rail" }
        ]
      }
    ]
  },
  {
    id: "paris",
    country: "fr",

    origin: [2.35, 48.85],

    // Île-de-France and a little past it. The RER ends up setting three of
    // these four edges — Creil in the north, Étampes in the south, Tournan
    // in the east — because the network is drawn as far as it runs and the
    // box has to hold all of it.
    bounds: [
      [1.6, 48.05],
      [3.25, 49.4]
    ],

    data: "networks/paris.json",

    marketplaceSlug: "paris",

    // Split by network rather than by operator, which is the one place this
    // catalogue does that. Île-de-France Mobilités publishes the whole
    // region under one set of terms, so there is no second operator to name;
    // what there is, is a rider deciding between a métro line and an RER
    // line, and that is worth a switch.
    systems: [
      {
        id: "metro",
        mode: "metro",
        attribution: {
          label: "IDFM",
          license: STM_LICENCE_MOBILITES,
          terms:
            "https://transport.data.gouv.fr/datasets/reseau-urbain-et-interurbain-dile-de-france-mobilites"
        },
        // The colours IDFM's own feed declares, which are the ones on the
        // plan du métro. Two pairs of lines share a colour — 3bis with 13,
        // 7bis with 6 — and that is the network rather than a mistake here:
        // the bis lines are drawn in the light blue and the green their
        // neighbours use, and always have been.
        lines: [
          { color: "#FFBE00", id: "1" },
          { color: "#0055C8", id: "2" },
          { color: "#6E6E00", id: "3" },
          { color: "#82C8E6", id: "3bis" },
          { color: "#A0006E", id: "4" },
          { color: "#FF5A00", id: "5" },
          { color: "#82DC73", id: "6" },
          { color: "#FF82B4", id: "7" },
          { color: "#82DC73", id: "7bis" },
          { color: "#D282BE", id: "8" },
          { color: "#D2D200", id: "9" },
          { color: "#DC9600", id: "10" },
          { color: "#6E491E", id: "11" },
          { color: "#00643C", id: "12" },
          { color: "#82C8E6", id: "13" },
          { color: "#640082", id: "14" }
        ]
      },
      {
        id: "rer",
        mode: "regional-rail",
        attribution: {
          label: "IDFM",
          license: STM_LICENCE_MOBILITES,
          terms:
            "https://transport.data.gouv.fr/datasets/reseau-urbain-et-interurbain-dile-de-france-mobilites"
        },
        lines: [
          { color: "#EB2132", id: "a" },
          { color: "#5091CB", id: "b" },
          { color: "#FFCC30", id: "c" },
          { color: "#008B5B", id: "d" },
          { color: "#B94E9A", id: "e" }
        ]
      }
    ]
  },
  {
    id: "lyon",
    country: "fr",

    origin: [4.85, 45.75],

    bounds: [
      [4.65, 45.6],
      [5.05, 45.9]
    ],

    data: "networks/lyon.json",

    marketplaceSlug: "lyon",

    systems: [
      {
        id: "tcl",
        mode: "metro",
        attribution: {
          label: "TCL",
          license: STM_LICENCE_OUVERTE_2,
          terms:
            "https://www.data.gouv.fr/datasets/lignes-de-metro-et-funiculaire-du-reseau-transports-en-commun-lyonnais"
        },
        // SYTRAL's own colours, taken from the map layer the lines are drawn
        // from rather than from anywhere else, so the line and the colour
        // come out of the same publication.
        lines: [
          { color: "#E8308A", id: "a" },
          { color: "#0075BF", id: "b" },
          { color: "#EC6608", id: "c" },
          { color: "#009E3D", id: "d" }
        ]
      }
    ]
  },
  {
    id: "marseille",
    country: "fr",

    origin: [5.38, 43.3],

    bounds: [
      [5.2, 43.15],
      [5.6, 43.45]
    ],

    data: "networks/marseille.json",

    marketplaceSlug: "marseille",

    systems: [
      {
        id: "rtm",
        mode: "metro",
        attribution: {
          label: "RTM",
          license: STM_LICENCE_OUVERTE_2,
          terms:
            "https://transport.data.gouv.fr/datasets/reseaux-de-transports-en-commun-de-la-metropole-daix-marseille-provence-et-des-bouches-du-rhone"
        },
        lines: [
          { color: "#009FE3", id: "m1" },
          { color: "#E30613", id: "m2" }
        ]
      }
    ]
  },
  {
    id: "lille",
    country: "fr",

    origin: [3.06, 50.63],

    bounds: [
      [2.85, 50.5],
      [3.35, 50.85]
    ],

    data: "networks/lille.json",

    marketplaceSlug: "lille",

    systems: [
      {
        id: "ilevia",
        mode: "metro",
        attribution: {
          label: "ilévia",
          license: STM_LICENCE_OUVERTE_2,
          terms:
            "https://transport.data.gouv.fr/datasets/ilevia-localisation-des-arrets-bus-metro-et-tram-gtfs"
        },
        lines: [
          { color: "#FDC41F", id: "1" },
          { color: "#E30613", id: "2" }
        ]
      }
    ]
  },
  {
    id: "toulouse",
    country: "fr",

    origin: [1.44, 43.6],

    bounds: [
      [1.25, 43.45],
      [1.65, 43.75]
    ],

    data: "networks/toulouse.json",

    marketplaceSlug: "toulouse",

    systems: [
      {
        id: "tisseo",
        mode: "metro",
        attribution: {
          label: "Tisséo",
          license: STM_ODBL_1,
          terms:
            "https://transport.data.gouv.fr/datasets/tisseo-reseau-transport-urbain-toulousain"
        },
        lines: [
          { color: "#DB001B", id: "a" },
          { color: "#FFDD00", id: "b" }
        ]
      }
    ]
  },
  {
    id: "rennes",
    country: "fr",

    origin: [-1.68, 48.11],

    bounds: [
      [-1.85, 48.0],
      [-1.5, 48.25]
    ],

    data: "networks/rennes.json",

    marketplaceSlug: "rennes",

    systems: [
      {
        id: "star",
        mode: "metro",
        attribution: {
          label: "STAR",
          license: STM_ODBL_1,
          terms:
            "https://transport.data.gouv.fr/datasets/versions-des-horaires-theoriques-des-lignes-de-bus-et-de-metro-du-reseau-star-dans-les-formats-gtfs-et-netex-ainsi-que-les-urls-dacces-au-gtfs-rt-1"
        },
        lines: [
          { color: "#EE1D23", id: "a" },
          { color: "#00893E", id: "b" }
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
      // Whatever its operator runs, unless this line says otherwise.
      mode: system.mode,
      ...line,
      cityId: city.id,
      countryId: city.country,
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
  city.systems.map(({ attribution, id }) => ({
    attribution,
    cityId: city.id,
    id: `${city.id}:${id}`
  }))
);

// The countries and the kinds of service the catalogue covers, each in the
// order the registry first mentions it, and each carrying nothing but its id:
// what a country or a kind of service is called is i18n.js's to say, and which
// lines are in one is a question the lines themselves answer. They exist so
// that the settings page can offer them without walking the catalogue to find
// out what is in it.
const STM_COUNTRIES = [...new Set(STM_CITIES.map(({ country }) => country))];

const STM_MODES = [...new Set(STM_LINES.map(({ mode }) => mode))];

// The catalogue the way someone picking a city out of it reads it: by country
// first, each one's cities in the order the registry lists them. The picker on
// the map walks this rather than the flat list, so that a catalogue of this
// size arrives already sorted into the two questions a reader actually has —
// which country, then which city in it.
const STM_CITIES_BY_COUNTRY = new Map(
  STM_COUNTRIES.map((country) => [
    country,
    STM_CITIES.filter((city) => city.country === country)
  ])
);

const STM_LINES_BY_ID = new Map(STM_LINES.map((line) => [line.id, line]));
const STM_CITIES_BY_ID = new Map(STM_CITIES.map((city) => [city.id, city]));

function stmLineById(id) {
  return STM_LINES_BY_ID.get(id);
}

function stmCityById(id) {
  return STM_CITIES_BY_ID.get(id);
}

// A line's own short name, the way its network prints it on a bullet: 1, 3bis,
// A, M1. Only the first character is raised, which is what keeps Paris's 3bis
// from shouting. Both forms draw that bullet — the settings page as a grid of
// them per city, the panel on the map for the one city being drawn — so what
// is on it is settled here, beside the id it is read off.
function stmLineBadge({ id }) {
  const short = id.slice(id.lastIndexOf(":") + 1);

  return short.charAt(0).toUpperCase() + short.slice(1);
}

// Which ink a line's colour can carry, by whichever of black and white stands
// further from it. The catalogue runs from the Toulouse yellow to the Paris
// purple, and one ink for both would be unreadable on one of them. 0.179 is
// where the two contrast ratios meet, both at 4.58:1.
function stmLineInk(color) {
  const channel = (offset) => {
    const value = parseInt(color.slice(offset, offset + 2), 16) / 255;

    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  const luminance =
    0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);

  return luminance > 0.179 ? "#000000" : "#ffffff";
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
