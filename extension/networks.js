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

// Calgary, Edmonton and Ottawa put their transit feeds on their open data
// portals under their own adaptations of the same Open Government Licence the
// City of Toronto uses; the Region of Waterloo adapted the UK's. TransLink
// publishes under no licence of that kind, only terms of its own that allow
// redistribution with a legend of its wording.
const STM_TRANSLINK_TERMS = {
  label: "TransLink GTFS terms of use",
  url: "https://www.translink.ca/about-us/doing-business-with-translink/app-developer-resources/gtfs/gtfs-data"
};

const STM_OGL_CALGARY = {
  label: "Open Government Licence – City of Calgary",
  url: "https://data.calgary.ca/stories/s/Open-Calgary-Terms-of-Use/u45n-7awa"
};

const STM_OGL_EDMONTON = {
  label: "Open Government Licence – Edmonton",
  url: "https://data.edmonton.ca/stories/s/City-of-Edmonton-Open-Data-Terms-of-Use/msh8-if28/"
};

const STM_OGL_OTTAWA = {
  label: "Open Government Licence – City of Ottawa",
  url: "https://open.ottawa.ca/pages/open-data-licence"
};

const STM_WATERLOO_LICENCE = {
  label: "Region of Waterloo Open Data Licence",
  url: "https://www.regionofwaterloo.ca/government-and-council/transparency-and-accountability/open-data/"
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

// American transit agencies rarely publish under an open licence. Most attach
// an agreement of their own to the feed, and each is named here by its own
// title; four publish their feed with no terms at all, and for those what is
// linked is the page the feed is published from, which is where their
// disclaimers are. Washington's network comes from the District's open data
// portal instead of from WMATA, and that is plain CC BY 4.0.
const STM_MTA_TERMS = {
  label: "MTA data feed terms",
  url: "https://www.mta.info/developers/terms-and-conditions"
};

const STM_CTA_LICENSE = {
  label: "CTA Developer License Agreement",
  url: "https://www.transitchicago.com/developers/terms/"
};

const STM_MASSDOT_LICENSE = {
  label: "MassDOT Developers License Agreement",
  url: "https://cdn.mbta.com/sites/default/files/2023-08/mbta-massdot-develop-license-agreement.pdf"
};

const STM_BART_LICENSE = {
  label: "BART Developer License Agreement",
  url: "https://www.bart.gov/schedules/developers/developer-license-agreement"
};

const STM_SEPTA_LICENSE = {
  label: "SEPTA License Agreement",
  url: "https://www.septa.org/license-agreement/"
};

const STM_LA_METRO_TERMS = {
  label: "Metro Terms & Conditions",
  url: "https://developer.metro.net/terms-conditions/"
};

const STM_PATH_FEED = {
  label: "PATH GTFS",
  url: "https://mobilitydatabase.org/feeds/gtfs/mdb-517"
};

const STM_MARTA_FEED = {
  label: "MARTA developer resources",
  url: "https://itsmarta.com/app-developer-resources.aspx"
};

const STM_MIAMI_DADE_FEED = {
  label: "Miami-Dade County disclaimer",
  url: "https://www.miamidade.gov/global/disclaimer/disclaimer.page"
};

const STM_MDOT_MTA_FEED = {
  label: "MDOT MTA developer resources",
  url: "https://www.mta.maryland.gov/developer-resources"
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
    id: "vancouver",
    country: "ca",

    origin: [-123.05, 49.25],

    // Metro Vancouver, from the North Shore to the border and out past
    // Langley, though SkyTrain itself stops at King George and Lafarge Lake.
    bounds: [
      [-123.3, 49.0],
      [-122.4, 49.45]
    ],

    data: "networks/vancouver.json",

    marketplaceSlug: "vancouver",

    systems: [
      {
        id: "translink",
        mode: "metro",
        attribution: {
          label: "TransLink",
          license: STM_TRANSLINK_TERMS,
          terms:
            "https://www.translink.ca/about-us/doing-business-with-translink/app-developer-resources/gtfs/gtfs-data"
        },
        // The colours TransLink's own feed declares, which are its map's:
        // Pantone 286, 116 and the Canada Line's teal.
        lines: [
          { color: "#0033A0", id: "expo" },
          { color: "#FFCD00", id: "millennium" },
          { color: "#007C9F", id: "canada" }
        ]
      }
    ]
  },
  {
    id: "calgary",
    country: "ca",

    origin: [-114.07, 51.05],

    bounds: [
      [-114.4, 50.8],
      [-113.75, 51.25]
    ],

    data: "networks/calgary.json",

    marketplaceSlug: "calgary",

    systems: [
      {
        id: "ctrain",
        mode: "light-rail",
        attribution: {
          label: "Calgary Transit",
          license: STM_OGL_CALGARY,
          terms:
            "https://data.calgary.ca/Transportation-Transit/Calgary-Transit-Scheduling-Data/npk7-z3bj"
        },
        // Calgary Transit's feed declares no colours. These are the red and
        // the blue the lines are commonly drawn in, as Wikipedia's route
        // diagrams draw them.
        lines: [
          { color: "#D61B32", id: "red" },
          { color: "#008AB1", id: "blue" }
        ]
      }
    ]
  },
  {
    id: "edmonton",
    country: "ca",

    origin: [-113.49, 53.54],

    bounds: [
      [-113.8, 53.35],
      [-113.25, 53.75]
    ],

    data: "networks/edmonton.json",

    marketplaceSlug: "edmonton",

    systems: [
      {
        id: "ets",
        mode: "light-rail",
        attribution: {
          label: "ETS",
          license: STM_OGL_EDMONTON,
          terms: "https://data.edmonton.ca/Transit/GTFS-Downloads/yiem-dcbw"
        },
        // The colours the ETS feed declares.
        lines: [
          { color: "#0081BC", id: "capital" },
          { color: "#FF0000", id: "metro" },
          { color: "#008000", id: "valley" }
        ]
      }
    ]
  },
  {
    id: "ottawa",
    country: "ca",

    origin: [-75.7, 45.4],

    // Ottawa and Gatineau together, since a rental search here routinely
    // crosses the river.
    bounds: [
      [-76.1, 45.1],
      [-75.35, 45.6]
    ],

    data: "networks/ottawa.json",

    marketplaceSlug: "ottawa",

    systems: [
      {
        id: "octranspo",
        mode: "light-rail",
        attribution: {
          label: "OC Transpo",
          license: STM_OGL_OTTAWA,
          terms: "https://open.ottawa.ca/datasets/ottawa::oc-transpo-schedules"
        },
        // The colours OC Transpo's feed declares.
        lines: [
          { color: "#D30F1D", id: "1" },
          { color: "#508128", id: "2" },
          { color: "#0980A5", id: "4" }
        ]
      }
    ]
  },
  {
    id: "waterloo",
    country: "ca",

    origin: [-80.49, 43.46],

    // Kitchener, Waterloo and Cambridge.
    bounds: [
      [-80.7, 43.3],
      [-80.2, 43.6]
    ],

    data: "networks/waterloo.json",

    systems: [
      {
        id: "grt",
        mode: "light-rail",
        attribution: {
          label: "GRT",
          license: STM_WATERLOO_LICENCE,
          terms: "https://www.grt.ca/about-grt/open-data/"
        },
        // The blue GRT's ION feed declares.
        lines: [{ color: "#006BB7", id: "ion" }]
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
  },
  {
    id: "new-york",
    country: "us",

    origin: [-73.98, 40.75],

    // The five boroughs, Hudson County and Newark for PATH, and the first
    // towns of Westchester and Nassau a search spills into.
    bounds: [
      [-74.4, 40.45],
      [-73.5, 41.1]
    ],

    data: "networks/new-york.json",

    marketplaceSlug: "nyc",

    systems: [
      {
        id: "subway",
        mode: "metro",
        attribution: {
          label: "MTA",
          license: STM_MTA_TERMS,
          terms: "https://www.mta.info/developers"
        },
        // The colours the MTA's own feed declares, which are the ones on its
        // current map. A trunk's services share its colour — the 4, 5 and 6
        // are all Lexington Avenue green — and the shuttles share the L's
        // grey, as they do on the map.
        lines: [
          { color: "#D82233", id: "1" },
          { color: "#D82233", id: "2" },
          { color: "#D82233", id: "3" },
          { color: "#009952", id: "4" },
          { color: "#009952", id: "5" },
          { color: "#009952", id: "6" },
          { color: "#9A38A1", id: "7" },
          { color: "#0062CF", id: "a" },
          { color: "#0062CF", id: "c" },
          { color: "#0062CF", id: "e" },
          { color: "#EB6800", id: "b" },
          { color: "#EB6800", id: "d" },
          { color: "#EB6800", id: "f" },
          { color: "#EB6800", id: "m" },
          { color: "#799534", id: "g" },
          { color: "#8E5C33", id: "j" },
          { color: "#7C858C", id: "l" },
          { color: "#F6BC26", id: "n" },
          { color: "#F6BC26", id: "q" },
          { color: "#F6BC26", id: "r" },
          { color: "#F6BC26", id: "w" },
          { color: "#7C858C", id: "s" }
        ]
      },
      {
        id: "sir",
        mode: "metro",
        attribution: {
          label: "MTA",
          license: STM_MTA_TERMS,
          terms: "https://www.mta.info/developers"
        },
        lines: [{ badge: "SIR", color: "#08179C", id: "sir" }]
      },
      {
        id: "path",
        mode: "metro",
        attribution: {
          label: "PATH",
          license: STM_PATH_FEED,
          terms: "https://www.panynj.gov/path/en/index.html"
        },
        // PATH's services by the terminals they run between, which is how its
        // own map and its trains name them, in the colours the feed gives
        // each.
        lines: [
          { badge: "NWK–WTC", color: "#D93A30", id: "nwk-wtc" },
          { badge: "HOB–WTC", color: "#65C100", id: "hob-wtc" },
          { badge: "JSQ–33", color: "#FF9900", id: "jsq-33" },
          { badge: "HOB–33", color: "#4D92FB", id: "hob-33" }
        ]
      }
    ]
  },
  {
    id: "washington",
    country: "us",

    origin: [-77.03, 38.9],

    // Stops short of Baltimore's box to the north, where the two metro areas
    // meet along the Patuxent.
    bounds: [
      [-77.65, 38.6],
      [-76.7, 39.18]
    ],

    data: "networks/washington.json",

    marketplaceSlug: "dc",

    systems: [
      {
        id: "wmata",
        mode: "metro",
        attribution: {
          label: "Open Data DC",
          license: STM_CC_BY_4,
          terms: "https://opendata.dc.gov/datasets/DCGIS::metro-lines-regional/about"
        },
        // The letters WMATA prints on each line's disc and the colours it
        // prints them in, both as its own site serves them.
        lines: [
          { color: "#C80F2D", id: "r" },
          { color: "#ED8B00", id: "o" },
          { color: "#919D9D", id: "s" },
          { color: "#009CDE", id: "b" },
          { color: "#FFD100", id: "y" },
          { color: "#00B140", id: "g" }
        ]
      }
    ]
  },
  {
    id: "chicago",
    country: "us",

    origin: [-87.65, 41.88],

    bounds: [
      [-88.2, 41.55],
      [-87.45, 42.2]
    ],

    data: "networks/chicago.json",

    marketplaceSlug: "chicago",

    systems: [
      {
        id: "cta",
        mode: "metro",
        attribution: {
          label: "CTA",
          license: STM_CTA_LICENSE,
          terms: "https://www.transitchicago.com/developers/gtfs/"
        },
        // The colours the CTA's feed declares. Its lines have no letter or
        // number, only the colour, so the bullet carries the colour's name.
        lines: [
          { color: "#C60C30", id: "red" },
          { color: "#00A1DE", id: "blue" },
          { color: "#62361B", id: "brown" },
          { color: "#009B3A", id: "green" },
          { color: "#F9461C", id: "orange" },
          { color: "#E27EA6", id: "pink" },
          { color: "#522398", id: "purple" },
          { color: "#F9E300", id: "yellow" }
        ]
      }
    ]
  },
  {
    id: "boston",
    country: "us",

    origin: [-71.06, 42.36],

    bounds: [
      [-71.45, 42.1],
      [-70.8, 42.6]
    ],

    data: "networks/boston.json",

    marketplaceSlug: "boston",

    systems: [
      {
        id: "mbta",
        mode: "metro",
        attribution: {
          label: "MassDOT",
          license: STM_MASSDOT_LICENSE,
          terms: "https://www.mbta.com/developers/gtfs"
        },
        // The colours the MBTA's feed declares. The Mattapan trolley is drawn
        // in the Red Line's colour, which it continues.
        lines: [
          { color: "#DA291C", id: "red" },
          { color: "#DA291C", id: "mattapan", mode: "light-rail" },
          { color: "#ED8B00", id: "orange" },
          { color: "#003DA5", id: "blue" },
          { color: "#00843D", id: "green", mode: "light-rail" }
        ]
      }
    ]
  },
  {
    id: "san-francisco",
    country: "us",

    origin: [-122.27, 37.8],

    // The Bay Area, from the Peninsula to Antioch and down to San José.
    bounds: [
      [-122.65, 37.2],
      [-121.6, 38.15]
    ],

    data: "networks/san-francisco.json",

    marketplaceSlug: "sanfrancisco",

    systems: [
      {
        id: "bart",
        mode: "metro",
        attribution: {
          label: "BART",
          license: STM_BART_LICENSE,
          terms: "https://www.bart.gov/schedules/developers/gtfs"
        },
        // The colours BART's own feed declares.
        lines: [
          { color: "#FF0000", id: "red" },
          { color: "#FF9933", id: "orange" },
          { color: "#FFFF33", id: "yellow" },
          { color: "#339933", id: "green" },
          { color: "#0099CC", id: "blue" }
        ]
      }
    ]
  },
  {
    id: "philadelphia",
    country: "us",

    origin: [-75.16, 39.95],

    bounds: [
      [-75.6, 39.8],
      [-74.85, 40.3]
    ],

    data: "networks/philadelphia.json",

    marketplaceSlug: "philly",

    systems: [
      {
        id: "septa",
        mode: "metro",
        attribution: {
          label: "SEPTA",
          license: STM_SEPTA_LICENSE,
          terms: "https://github.com/septadev/GTFS"
        },
        // SEPTA Metro's letters and colours, as its feed declares them.
        lines: [
          { color: "#0097D6", id: "l" },
          { color: "#F26100", id: "b" },
          { color: "#5F249F", id: "m" }
        ]
      }
    ]
  },
  {
    id: "los-angeles",
    country: "us",

    origin: [-118.25, 34.05],

    bounds: [
      [-118.8, 33.6],
      [-117.6, 34.35]
    ],

    data: "networks/los-angeles.json",

    marketplaceSlug: "la",

    systems: [
      {
        id: "metro",
        mode: "light-rail",
        attribution: {
          label: "LA Metro",
          license: STM_LA_METRO_TERMS,
          terms: "https://gitlab.com/LACMTA/gtfs_rail"
        },
        // Metro's letters and colours, as its feed declares them. Four of the
        // six are light rail; the B and the D are the subway.
        lines: [
          { color: "#0072BC", id: "a" },
          { color: "#EB131B", id: "b", mode: "metro" },
          { color: "#58A738", id: "c" },
          { color: "#A05DA5", id: "d", mode: "metro" },
          { color: "#FDB913", id: "e" },
          { color: "#E56DB1", id: "k" }
        ]
      }
    ]
  },
  {
    id: "atlanta",
    country: "us",

    origin: [-84.39, 33.75],

    bounds: [
      [-84.7, 33.45],
      [-84.0, 34.1]
    ],

    data: "networks/atlanta.json",

    marketplaceSlug: "atlanta",

    systems: [
      {
        id: "marta",
        mode: "metro",
        attribution: {
          label: "MARTA",
          license: STM_MARTA_FEED,
          terms: "https://itsmarta.com/app-developer-resources.aspx"
        },
        lines: [
          { color: "#CE242B", id: "red" },
          { color: "#D4A723", id: "gold" },
          { color: "#0075B2", id: "blue" },
          { color: "#009D4B", id: "green" }
        ]
      }
    ]
  },
  {
    id: "miami",
    country: "us",

    origin: [-80.25, 25.78],

    bounds: [
      [-80.55, 25.5],
      [-80.1, 26.0]
    ],

    data: "networks/miami.json",

    marketplaceSlug: "miami",

    systems: [
      {
        id: "metrorail",
        mode: "metro",
        attribution: {
          label: "Miami-Dade County",
          license: STM_MIAMI_DADE_FEED,
          terms:
            "https://www.miamidade.gov/global/transportation/open-data-feeds.page"
        },
        // The county's feed gives both lines one route and one colour, so it
        // says nothing about which line is which. These are the green and the
        // orange the lines are commonly drawn in, as Wikipedia's route
        // diagrams draw them; the county publishes no colour for either.
        lines: [
          { color: "#9DD165", id: "green" },
          { color: "#FE4D1A", id: "orange" }
        ]
      }
    ]
  },
  {
    id: "baltimore",
    country: "us",

    origin: [-76.62, 39.29],

    bounds: [
      [-76.95, 39.2],
      [-76.4, 39.5]
    ],

    data: "networks/baltimore.json",

    marketplaceSlug: "baltimore",

    systems: [
      {
        id: "mta",
        mode: "metro",
        attribution: {
          label: "MDOT MTA",
          license: STM_MDOT_MTA_FEED,
          terms: "https://www.mta.maryland.gov/developer-resources"
        },
        // One line, the Metro SubwayLink, in the green MDOT MTA's feed
        // declares for it.
        lines: [{ color: "#008000", id: "metro" }]
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
//
// An id is lower case and a bullet is not always, so a line whose network
// prints more than its first letter in capitals — the SIR, PATH's NWK–WTC —
// says what its bullet reads with a badge of its own.
function stmLineBadge({ badge, id }) {
  if (badge) return badge;

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
