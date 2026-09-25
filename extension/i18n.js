// Every language the interface can be read in, and the only place any of its
// words are written. Each language is one block of messages under the same
// keys, so adding one is copying a block that is already here and translating
// it — plus the name and description Chrome shows for the extension, which it
// reads from _locales/<code>/messages.json rather than from here.
// tests/i18n.test.mjs holds every block to the same keys and the same
// placeholders, and every key to something that is actually shown.
//
// Keys are written out whole wherever they are used, so that the tests can
// find them. The one exception is the names the registry's own ids pick out —
// country.ca.name, city.montreal.name, system.montreal:stm.name,
// line.montreal:stm:1.name, mode.metro.name — because a country, a place, a
// line or a kind of service is called something different in each language
// while its id, its colour and who to credit for it are not.
//
// Brand names, the operators' acronyms, licence titles and station names read
// the same in every language, so they stay where they are declared.

// The language used when the browser prefers none of the ones below, and the
// block every other one is checked against. The manifest's default_locale is
// the same language, for the same reason.
const STM_FALLBACK_LOCALE = "en";

// What the language setting holds until someone picks one: whatever the
// browser prefers.
const STM_AUTO_LANGUAGE = "auto";

const STM_LOCALES = {
  en: {
    // Each language is named in its own words, so that someone who cannot
    // read the page as it stands can still find theirs in the list.
    name: "English",
    messages: {
      "extension.name": "Public Transit for Marketplace and Centris",
      "extension.settings": "Extension settings",

      "toolbar.on": "Public transit — on (click to turn off)",
      "toolbar.off": "Public transit — off (click to turn on)",
      "toolbar.badgeOff": "OFF",

      "map.loading": "Loading {city}…",
      "map.offNetwork": "{city} is out of view",
      "map.failed": "{city} could not be loaded.",
      "map.retry": "Try again",
      "map.cityPicker": "Network shown: {city}. Choose a city.",
      "map.cityToggle": "Show {city}",
      "map.cityCount": "{on}/{all}",
      "map.here": "Current",
      "map.goTo": "See housing in {city}",
      "map.lines": "Lines",
      "map.linePicker":
        "Lines in {city}: {on} of {all} drawn. Choose which to show.",
      "map.lineCount": "{on}/{all}",
      "map.lineAllOn": "Show all",
      "map.lineAllOff": "Hide all",
      "map.hideListings": "Hide listings",
      "map.showListings": "Show listings",
      "map.creditTitle":
        "{operators} data, adapted for this unofficial extension.",

      "credits.lead": "Adapted data:",

      "point.addTitle": "Add a landmark",
      "point.name": "Name",
      "point.location": "Google Maps link or coordinates",
      "point.formats":
        "Accepted formats: a google.com/maps/place/… link or coordinates (45.5019, -73.5674).",
      "point.shortLinks": "Short maps.app.goo.gl links are not accepted.",
      "point.color": "Colour",
      "point.add": "Add",
      "point.edit": "Edit",
      "point.save": "Save",
      "point.cancel": "Cancel",
      "point.remove": "Delete",
      "point.unnamed": "Unnamed",
      "point.errorEmpty": "Enter a Google Maps link or coordinates.",
      "point.errorShortLink":
        "Short link without coordinates. Open it in Google Maps, then copy the full link.",
      "point.errorNotFound":
        "No coordinates found. Use a google.com/maps/place/… link or coordinates.",

      "options.pageTitle": "Settings — Public Transit",
      "options.enable": "Enable the extension",
      "options.enable.hint":
        "Turns the extension off everywhere without changing the settings below. The toolbar button does the same.",
      "options.language.title": "Language",
      "options.language": "Extension language",
      "options.language.hint":
        "Used on this page, on the maps and for the toolbar button.",
      "options.language.auto": "Browser language ({language})",
      "options.where.title": "Where to show the network",
      "options.interactiveMaps": "Interactive maps",
      "options.interactiveMaps.hint":
        "The map beside the listings and the one that opens from a listing.",
      "options.listingPreview": "Listing map preview",
      "options.listingPreview.hint":
        "The still image shown beside a listing’s address. Marketplace only: Centris listings show no such map.",
      "options.shown.title": "What to show",
      "options.stations": "Stations",
      "options.stationLabels": "Station names",
      "options.stationLabels.hint":
        "Shown past a certain zoom level, where they have room. Stations with the most lines are named first.",
      "options.points": "Landmarks",
      "options.points.hint":
        "Your landmarks appear on maps and in listing previews.",
      "options.tools.title": "Map tools",
      "options.pointsTool": "Adding landmarks",
      "options.pointsTool.hint": "The “Add a landmark” button and its list.",
      "options.networkStatus": "“Network out of view” notice",
      "options.networkStatus.hint":
        "Warns when the map is far from the network.",
      "options.cityPicker": "City panel",
      "options.cityPicker.hint":
        "Names the city being drawn and opens a list of the others, to switch them on or off. On Marketplace it also jumps the search to one of them.",
      "options.linePicker": "Line panel",
      "options.linePicker.hint":
        "Switches the lines of the city being drawn on or off from the map, without opening this page.",
      "options.listingsToggle": "Listings button",
      "options.listingsToggle.hint":
        "The button on the map’s right edge that hides the listings beside it, so the map takes their place. Marketplace searches only.",
      "options.settingsShortcut": "Settings button",
      "options.settingsShortcut.hint":
        "The gear that opens this page from the map.",
      "options.sites.title": "Sites",
      "options.lines.title": "Lines",
      "options.lines.search": "Search a line, a city or a network",
      "options.lines.country": "Country",
      "options.lines.mode": "Type",
      "options.lines.filterAll": "All",
      "options.lines.summary": "{on} of {shown} lines on",
      "options.lines.allOn": "Turn on",
      "options.lines.allOff": "Turn off",
      "options.lines.bulkHint": "Applies to the lines shown below.",
      "options.lines.expandAll": "Expand all",
      "options.lines.collapseAll": "Collapse all",
      "options.lines.clearFilters": "Clear filters",
      "options.lines.empty": "No line matches this search.",
      "options.points.title": "Landmarks",
      "options.points.empty":
        "No landmarks saved. Add one below, or from the map.",
      "options.reset": "Reset settings",
      "options.reset.confirm": "Restore every setting to its default?",
      "options.reset.note":
        "Saved landmarks are not deleted. The attribution shown on the map is part of the data licence and stays in place.",

      "site.facebook.detail": "Housing maps and listing map previews.",
      "site.centris.detail": "Search result maps and listing maps.",

      "country.ca.name": "Canada",
      "country.fr.name": "France",
      "country.us.name": "United States",

      "mode.metro.name": "Metro",
      "mode.regional-rail.name": "Regional rail",
      "mode.light-rail.name": "Light rail",

      "city.montreal.name": "Montréal",
      "system.montreal:stm.name": "Montréal Métro",
      "line.montreal:stm:1.name": "Green line",
      "line.montreal:stm:1.detail": "Line 1",
      "line.montreal:stm:2.name": "Orange line",
      "line.montreal:stm:2.detail": "Line 2",
      "line.montreal:stm:4.name": "Yellow line",
      "line.montreal:stm:4.detail": "Line 4",
      "line.montreal:stm:5.name": "Blue line",
      "line.montreal:stm:5.detail": "Line 5",
      "system.montreal:rem.name": "REM",
      "line.montreal:rem:a.name": "REM",
      "line.montreal:rem:a.detail": "Réseau express métropolitain",

      "city.toronto.name": "Toronto",
      "system.toronto:ttc.name": "Toronto subway and light rail",
      "line.toronto:ttc:1.name": "Line 1 Yonge-University",
      "line.toronto:ttc:1.detail": "Subway",
      "line.toronto:ttc:2.name": "Line 2 Bloor-Danforth",
      "line.toronto:ttc:2.detail": "Subway",
      "line.toronto:ttc:4.name": "Line 4 Sheppard",
      "line.toronto:ttc:4.detail": "Subway",
      "line.toronto:ttc:5.name": "Line 5 Eglinton",
      "line.toronto:ttc:5.detail": "Light rail",
      "line.toronto:ttc:6.name": "Line 6 Finch West",
      "line.toronto:ttc:6.detail": "Light rail",

      "city.vancouver.name": "Vancouver",
      "system.vancouver:translink.name": "SkyTrain",
      "line.vancouver:translink:expo.name": "Expo Line",
      "line.vancouver:translink:expo.detail": "Waterfront–King George / Production Way",
      "line.vancouver:translink:millennium.name": "Millennium Line",
      "line.vancouver:translink:millennium.detail": "VCC-Clark–Lafarge Lake-Douglas",
      "line.vancouver:translink:canada.name": "Canada Line",
      "line.vancouver:translink:canada.detail": "Waterfront–Richmond / YVR",

      "city.calgary.name": "Calgary",
      "system.calgary:ctrain.name": "CTrain",
      "line.calgary:ctrain:red.name": "Red Line",
      "line.calgary:ctrain:red.detail": "Tuscany–Somerset-Bridlewood",
      "line.calgary:ctrain:blue.name": "Blue Line",
      "line.calgary:ctrain:blue.detail": "69 Street–Saddletowne",

      "city.edmonton.name": "Edmonton",
      "system.edmonton:ets.name": "Edmonton LRT",
      "line.edmonton:ets:capital.name": "Capital Line",
      "line.edmonton:ets:capital.detail": "Clareview–Century Park",
      "line.edmonton:ets:metro.name": "Metro Line",
      "line.edmonton:ets:metro.detail": "NAIT/Blatchford Market–Health Sciences",
      "line.edmonton:ets:valley.name": "Valley Line",
      "line.edmonton:ets:valley.detail": "102 Street–Mill Woods",

      "city.ottawa.name": "Ottawa",
      "system.ottawa:octranspo.name": "O-Train",
      "line.ottawa:octranspo:1.name": "Line 1 Confederation",
      "line.ottawa:octranspo:1.detail": "Tunney's Pasture–Blair",
      "line.ottawa:octranspo:2.name": "Line 2 Trillium",
      "line.ottawa:octranspo:2.detail": "Bayview–Limebank",
      "line.ottawa:octranspo:4.name": "Line 4",
      "line.ottawa:octranspo:4.detail": "South Keys–Airport",

      "city.waterloo.name": "Waterloo Region",
      "system.waterloo:grt.name": "ION",
      "line.waterloo:grt:ion.name": "ION light rail",
      "line.waterloo:grt:ion.detail": "Conestoga–Fairway",

      "city.paris.name": "Paris",
      "system.paris:metro.name": "Paris Métro",
      "line.paris:metro:1.name": "Line 1",
      "line.paris:metro:1.detail": "Métro",
      "line.paris:metro:2.name": "Line 2",
      "line.paris:metro:2.detail": "Métro",
      "line.paris:metro:3.name": "Line 3",
      "line.paris:metro:3.detail": "Métro",
      "line.paris:metro:3bis.name": "Line 3bis",
      "line.paris:metro:3bis.detail": "Métro",
      "line.paris:metro:4.name": "Line 4",
      "line.paris:metro:4.detail": "Métro",
      "line.paris:metro:5.name": "Line 5",
      "line.paris:metro:5.detail": "Métro",
      "line.paris:metro:6.name": "Line 6",
      "line.paris:metro:6.detail": "Métro",
      "line.paris:metro:7.name": "Line 7",
      "line.paris:metro:7.detail": "Métro",
      "line.paris:metro:7bis.name": "Line 7bis",
      "line.paris:metro:7bis.detail": "Métro",
      "line.paris:metro:8.name": "Line 8",
      "line.paris:metro:8.detail": "Métro",
      "line.paris:metro:9.name": "Line 9",
      "line.paris:metro:9.detail": "Métro",
      "line.paris:metro:10.name": "Line 10",
      "line.paris:metro:10.detail": "Métro",
      "line.paris:metro:11.name": "Line 11",
      "line.paris:metro:11.detail": "Métro",
      "line.paris:metro:12.name": "Line 12",
      "line.paris:metro:12.detail": "Métro",
      "line.paris:metro:13.name": "Line 13",
      "line.paris:metro:13.detail": "Métro",
      "line.paris:metro:14.name": "Line 14",
      "line.paris:metro:14.detail": "Métro",
      "system.paris:rer.name": "RER",
      "line.paris:rer:a.name": "RER A",
      "line.paris:rer:a.detail": "Regional express rail",
      "line.paris:rer:b.name": "RER B",
      "line.paris:rer:b.detail": "Regional express rail",
      "line.paris:rer:c.name": "RER C",
      "line.paris:rer:c.detail": "Regional express rail",
      "line.paris:rer:d.name": "RER D",
      "line.paris:rer:d.detail": "Regional express rail",
      "line.paris:rer:e.name": "RER E",
      "line.paris:rer:e.detail": "Regional express rail",

      "city.lyon.name": "Lyon",
      "system.lyon:tcl.name": "Lyon Métro",
      "line.lyon:tcl:a.name": "Line A",
      "line.lyon:tcl:a.detail": "Métro",
      "line.lyon:tcl:b.name": "Line B",
      "line.lyon:tcl:b.detail": "Métro",
      "line.lyon:tcl:c.name": "Line C",
      "line.lyon:tcl:c.detail": "Métro",
      "line.lyon:tcl:d.name": "Line D",
      "line.lyon:tcl:d.detail": "Métro",

      "city.marseille.name": "Marseille",
      "system.marseille:rtm.name": "Marseille Métro",
      "line.marseille:rtm:m1.name": "Line M1",
      "line.marseille:rtm:m1.detail": "Métro",
      "line.marseille:rtm:m2.name": "Line M2",
      "line.marseille:rtm:m2.detail": "Métro",

      "city.lille.name": "Lille",
      "system.lille:ilevia.name": "Lille Métro",
      "line.lille:ilevia:1.name": "Line 1",
      "line.lille:ilevia:1.detail": "Métro",
      "line.lille:ilevia:2.name": "Line 2",
      "line.lille:ilevia:2.detail": "Métro",

      "city.toulouse.name": "Toulouse",
      "system.toulouse:tisseo.name": "Toulouse Métro",
      "line.toulouse:tisseo:a.name": "Line A",
      "line.toulouse:tisseo:a.detail": "Métro",
      "line.toulouse:tisseo:b.name": "Line B",
      "line.toulouse:tisseo:b.detail": "Métro",

      "city.rennes.name": "Rennes",
      "system.rennes:star.name": "Rennes Métro",
      "line.rennes:star:a.name": "Line a",
      "line.rennes:star:a.detail": "Métro",
      "line.rennes:star:b.name": "Line b",
      "line.rennes:star:b.detail": "Métro",
      "city.new-york.name": "New York",
      "system.new-york:subway.name": "New York City Subway",
      "line.new-york:subway:1.name": "1 train",
      "line.new-york:subway:1.detail": "Broadway–7 Avenue Local",
      "line.new-york:subway:2.name": "2 train",
      "line.new-york:subway:2.detail": "7 Avenue Express",
      "line.new-york:subway:3.name": "3 train",
      "line.new-york:subway:3.detail": "7 Avenue Express",
      "line.new-york:subway:4.name": "4 train",
      "line.new-york:subway:4.detail": "Lexington Avenue Express",
      "line.new-york:subway:5.name": "5 train",
      "line.new-york:subway:5.detail": "Lexington Avenue Express",
      "line.new-york:subway:6.name": "6 train",
      "line.new-york:subway:6.detail": "Lexington Avenue Local",
      "line.new-york:subway:7.name": "7 train",
      "line.new-york:subway:7.detail": "Flushing Local",
      "line.new-york:subway:a.name": "A train",
      "line.new-york:subway:a.detail": "8 Avenue Express",
      "line.new-york:subway:c.name": "C train",
      "line.new-york:subway:c.detail": "8 Avenue Local",
      "line.new-york:subway:e.name": "E train",
      "line.new-york:subway:e.detail": "8 Avenue Local",
      "line.new-york:subway:b.name": "B train",
      "line.new-york:subway:b.detail": "6 Avenue Express",
      "line.new-york:subway:d.name": "D train",
      "line.new-york:subway:d.detail": "6 Avenue Express",
      "line.new-york:subway:f.name": "F train",
      "line.new-york:subway:f.detail": "Queens Boulevard Express / 6 Avenue Local",
      "line.new-york:subway:m.name": "M train",
      "line.new-york:subway:m.detail": "Queens Boulevard Local / 6 Avenue Local",
      "line.new-york:subway:g.name": "G train",
      "line.new-york:subway:g.detail": "Brooklyn–Queens Crosstown",
      "line.new-york:subway:j.name": "J and Z trains",
      "line.new-york:subway:j.detail": "Nassau Street",
      "line.new-york:subway:l.name": "L train",
      "line.new-york:subway:l.detail": "14 Street–Canarsie Local",
      "line.new-york:subway:n.name": "N train",
      "line.new-york:subway:n.detail": "Broadway Local",
      "line.new-york:subway:q.name": "Q train",
      "line.new-york:subway:q.detail": "Broadway Express",
      "line.new-york:subway:r.name": "R train",
      "line.new-york:subway:r.detail": "Broadway Local",
      "line.new-york:subway:w.name": "W train",
      "line.new-york:subway:w.detail": "Broadway Local",
      "line.new-york:subway:s.name": "S shuttles",
      "line.new-york:subway:s.detail": "42 St, Franklin Av and Rockaway Park",
      "system.new-york:sir.name": "Staten Island Railway",
      "line.new-york:sir:sir.name": "Staten Island Railway",
      "line.new-york:sir:sir.detail": "St. George–Tottenville",
      "system.new-york:path.name": "PATH",
      "line.new-york:path:nwk-wtc.name": "Newark–World Trade Center",
      "line.new-york:path:nwk-wtc.detail": "PATH",
      "line.new-york:path:hob-wtc.name": "Hoboken–World Trade Center",
      "line.new-york:path:hob-wtc.detail": "PATH",
      "line.new-york:path:jsq-33.name": "Journal Square–33rd Street",
      "line.new-york:path:jsq-33.detail": "PATH",
      "line.new-york:path:hob-33.name": "Hoboken–33rd Street",
      "line.new-york:path:hob-33.detail": "PATH",

      "city.washington.name": "Washington",
      "system.washington:wmata.name": "Washington Metro",
      "line.washington:wmata:r.name": "Red Line",
      "line.washington:wmata:r.detail": "Metrorail",
      "line.washington:wmata:o.name": "Orange Line",
      "line.washington:wmata:o.detail": "Metrorail",
      "line.washington:wmata:s.name": "Silver Line",
      "line.washington:wmata:s.detail": "Metrorail",
      "line.washington:wmata:b.name": "Blue Line",
      "line.washington:wmata:b.detail": "Metrorail",
      "line.washington:wmata:y.name": "Yellow Line",
      "line.washington:wmata:y.detail": "Metrorail",
      "line.washington:wmata:g.name": "Green Line",
      "line.washington:wmata:g.detail": "Metrorail",

      "city.chicago.name": "Chicago",
      "system.chicago:cta.name": "Chicago ‘L’",
      "line.chicago:cta:red.name": "Red Line",
      "line.chicago:cta:red.detail": "‘L’",
      "line.chicago:cta:blue.name": "Blue Line",
      "line.chicago:cta:blue.detail": "‘L’",
      "line.chicago:cta:brown.name": "Brown Line",
      "line.chicago:cta:brown.detail": "‘L’",
      "line.chicago:cta:green.name": "Green Line",
      "line.chicago:cta:green.detail": "‘L’",
      "line.chicago:cta:orange.name": "Orange Line",
      "line.chicago:cta:orange.detail": "‘L’",
      "line.chicago:cta:pink.name": "Pink Line",
      "line.chicago:cta:pink.detail": "‘L’",
      "line.chicago:cta:purple.name": "Purple Line",
      "line.chicago:cta:purple.detail": "‘L’",
      "line.chicago:cta:yellow.name": "Yellow Line",
      "line.chicago:cta:yellow.detail": "‘L’",

      "city.boston.name": "Boston",
      "system.boston:mbta.name": "Boston subway",
      "line.boston:mbta:red.name": "Red Line",
      "line.boston:mbta:red.detail": "Subway",
      "line.boston:mbta:mattapan.name": "Mattapan Line",
      "line.boston:mbta:mattapan.detail": "Trolley",
      "line.boston:mbta:orange.name": "Orange Line",
      "line.boston:mbta:orange.detail": "Subway",
      "line.boston:mbta:blue.name": "Blue Line",
      "line.boston:mbta:blue.detail": "Subway",
      "line.boston:mbta:green.name": "Green Line",
      "line.boston:mbta:green.detail": "B, C, D and E branches",

      "city.san-francisco.name": "San Francisco",
      "system.san-francisco:bart.name": "BART",
      "line.san-francisco:bart:red.name": "Red Line",
      "line.san-francisco:bart:red.detail": "Richmond–SFO/Millbrae",
      "line.san-francisco:bart:orange.name": "Orange Line",
      "line.san-francisco:bart:orange.detail": "Richmond–Berryessa/North San José",
      "line.san-francisco:bart:yellow.name": "Yellow Line",
      "line.san-francisco:bart:yellow.detail": "Antioch–SFO/Millbrae",
      "line.san-francisco:bart:green.name": "Green Line",
      "line.san-francisco:bart:green.detail": "Berryessa/North San José–Daly City",
      "line.san-francisco:bart:blue.name": "Blue Line",
      "line.san-francisco:bart:blue.detail": "Dublin/Pleasanton–Daly City",

      "city.philadelphia.name": "Philadelphia",
      "system.philadelphia:septa.name": "SEPTA Metro",
      "line.philadelphia:septa:l.name": "L Line",
      "line.philadelphia:septa:l.detail": "Market–Frankford Line",
      "line.philadelphia:septa:b.name": "B Line",
      "line.philadelphia:septa:b.detail": "Broad Street Line",
      "line.philadelphia:septa:m.name": "M Line",
      "line.philadelphia:septa:m.detail": "Norristown High Speed Line",

      "city.los-angeles.name": "Los Angeles",
      "system.los-angeles:metro.name": "LA Metro Rail",
      "line.los-angeles:metro:a.name": "A Line",
      "line.los-angeles:metro:a.detail": "Light rail",
      "line.los-angeles:metro:b.name": "B Line",
      "line.los-angeles:metro:b.detail": "Subway",
      "line.los-angeles:metro:c.name": "C Line",
      "line.los-angeles:metro:c.detail": "Light rail",
      "line.los-angeles:metro:d.name": "D Line",
      "line.los-angeles:metro:d.detail": "Subway",
      "line.los-angeles:metro:e.name": "E Line",
      "line.los-angeles:metro:e.detail": "Light rail",
      "line.los-angeles:metro:k.name": "K Line",
      "line.los-angeles:metro:k.detail": "Light rail",

      "city.atlanta.name": "Atlanta",
      "system.atlanta:marta.name": "MARTA rail",
      "line.atlanta:marta:red.name": "Red Line",
      "line.atlanta:marta:red.detail": "Rapid transit",
      "line.atlanta:marta:gold.name": "Gold Line",
      "line.atlanta:marta:gold.detail": "Rapid transit",
      "line.atlanta:marta:blue.name": "Blue Line",
      "line.atlanta:marta:blue.detail": "Rapid transit",
      "line.atlanta:marta:green.name": "Green Line",
      "line.atlanta:marta:green.detail": "Rapid transit",

      "city.miami.name": "Miami",
      "system.miami:metrorail.name": "Miami Metrorail",
      "line.miami:metrorail:green.name": "Green Line",
      "line.miami:metrorail:green.detail": "Palmetto–Dadeland South",
      "line.miami:metrorail:orange.name": "Orange Line",
      "line.miami:metrorail:orange.detail": "Miami International Airport–Dadeland South",

      "city.baltimore.name": "Baltimore",
      "system.baltimore:mta.name": "Baltimore Metro",
      "line.baltimore:mta:metro.name": "Metro SubwayLink",
      "line.baltimore:mta:metro.detail": "Owings Mills–Johns Hopkins Hospital"
    }
  },
  fr: {
    name: "Français",
    messages: {
      "extension.name": "Transport en commun pour Marketplace et Centris",
      "extension.settings": "Réglages de l’extension",

      "toolbar.on": "Transport en commun — activé (cliquer pour désactiver)",
      "toolbar.off": "Transport en commun — désactivé (cliquer pour activer)",
      "toolbar.badgeOff": "OFF",

      "map.loading": "Chargement de {city}…",
      "map.offNetwork": "{city} est hors champ",
      "map.failed": "{city} n’a pas pu être chargé.",
      "map.retry": "Réessayer",
      "map.cityPicker": "Réseau affiché : {city}. Choisir une ville.",
      "map.cityToggle": "Afficher {city}",
      "map.cityCount": "{on}/{all}",
      "map.here": "Actuelle",
      "map.goTo": "Voir les logements à {city}",
      "map.lines": "Lignes",
      "map.linePicker":
        "Lignes à {city} : {on} sur {all} dessinées. Choisir celles à afficher.",
      "map.lineCount": "{on}/{all}",
      "map.lineAllOn": "Tout afficher",
      "map.lineAllOff": "Tout masquer",
      "map.hideListings": "Masquer les annonces",
      "map.showListings": "Afficher les annonces",
      "map.creditTitle":
        "Données {operators}, adaptées pour cette extension non officielle.",

      "credits.lead": "Données adaptées :",

      "point.addTitle": "Ajouter un point",
      "point.name": "Nom",
      "point.location": "Lien Google Maps ou coordonnées",
      "point.formats":
        "Formats acceptés : lien google.com/maps/place/… ou coordonnées (45.5019, -73.5674).",
      "point.shortLinks": "Les liens courts maps.app.goo.gl ne sont pas acceptés.",
      "point.color": "Couleur",
      "point.add": "Ajouter",
      "point.edit": "Modifier",
      "point.save": "Enregistrer",
      "point.cancel": "Annuler",
      "point.remove": "Supprimer",
      "point.unnamed": "Sans nom",
      "point.errorEmpty": "Entrez un lien Google Maps ou des coordonnées.",
      "point.errorShortLink":
        "Lien court sans coordonnées. Ouvrez-le dans Google Maps, puis copiez l’adresse complète.",
      "point.errorNotFound":
        "Aucune coordonnée trouvée. Utilisez un lien google.com/maps/place/… ou des coordonnées.",

      "options.pageTitle": "Réglages — Transport en commun",
      "options.enable": "Activer l’extension",
      "options.enable.hint":
        "Coupe l’extension partout, sans toucher aux réglages ci-dessous. Le bouton de la barre d’outils fait la même chose.",
      "options.language.title": "Langue",
      "options.language": "Langue de l’extension",
      "options.language.hint":
        "Utilisée sur cette page, sur les cartes et pour le bouton de la barre d’outils.",
      "options.language.auto": "Langue du navigateur ({language})",
      "options.where.title": "Où afficher le réseau",
      "options.interactiveMaps": "Cartes interactives",
      "options.interactiveMaps.hint":
        "La carte de la liste des logements et celle qui s’ouvre depuis une annonce.",
      "options.listingPreview": "Aperçu de carte des annonces",
      "options.listingPreview.hint":
        "L’image fixe affichée à côté de l’adresse d’une annonce. Marketplace seulement : une annonce Centris n’affiche aucune carte.",
      "options.shown.title": "Éléments affichés",
      "options.stations": "Stations",
      "options.stationLabels": "Noms des stations",
      "options.stationLabels.hint":
        "Affichés à partir d’un certain niveau de zoom, là où ils ont la place. Les stations desservies par le plus de lignes sont nommées en premier.",
      "options.points": "Points de repère",
      "options.points.hint":
        "Vos points apparaissent sur les cartes et dans l’aperçu des annonces.",
      "options.tools.title": "Outils sur la carte",
      "options.pointsTool": "Ajout de points de repère",
      "options.pointsTool.hint": "Le bouton « Ajouter un point » et sa liste.",
      "options.networkStatus": "Avis « Réseau hors champ »",
      "options.networkStatus.hint":
        "Prévient quand la carte est loin du réseau.",
      "options.cityPicker": "Panneau des villes",
      "options.cityPicker.hint":
        "Nomme la ville dessinée et ouvre la liste des autres, pour les activer ou non. Sur Marketplace, il amène aussi la recherche à l’une d’elles.",
      "options.linePicker": "Panneau des lignes",
      "options.linePicker.hint":
        "Active ou désactive les lignes de la ville dessinée depuis la carte, sans ouvrir cette page.",
      "options.listingsToggle": "Bouton des annonces",
      "options.listingsToggle.hint":
        "Le bouton au bord droit de la carte qui masque les annonces à côté, pour que la carte prenne leur place. Recherches Marketplace seulement.",
      "options.settingsShortcut": "Bouton de réglages",
      "options.settingsShortcut.hint":
        "L’engrenage qui ouvre cette page depuis la carte.",
      "options.sites.title": "Sites",
      "options.lines.title": "Lignes",
      "options.lines.search": "Rechercher une ligne, une ville ou un réseau",
      "options.lines.country": "Pays",
      "options.lines.mode": "Type",
      "options.lines.filterAll": "Tous",
      "options.lines.summary": "{on} lignes activées sur {shown}",
      "options.lines.allOn": "Activer",
      "options.lines.allOff": "Désactiver",
      "options.lines.bulkHint": "S’applique aux lignes affichées ci-dessous.",
      "options.lines.expandAll": "Tout déplier",
      "options.lines.collapseAll": "Tout replier",
      "options.lines.clearFilters": "Effacer les filtres",
      "options.lines.empty": "Aucune ligne ne correspond à cette recherche.",
      "options.points.title": "Points de repère",
      "options.points.empty":
        "Aucun point enregistré. Ajoutez-en un ci-dessous, ou depuis la carte.",
      "options.reset": "Réinitialiser les réglages",
      "options.reset.confirm": "Rétablir tous les réglages par défaut ?",
      "options.reset.note":
        "Les points de repère enregistrés ne sont pas effacés. L’attribution affichée sur la carte fait partie de la licence des données et reste en place.",

      "site.facebook.detail":
        "Cartes des logements et aperçu de carte des annonces.",
      "site.centris.detail": "Cartes des résultats de recherche et des fiches.",

      "country.ca.name": "Canada",
      "country.fr.name": "France",
      "country.us.name": "États-Unis",

      "mode.metro.name": "Métro",
      "mode.regional-rail.name": "Train régional",
      "mode.light-rail.name": "Train léger",

      "city.montreal.name": "Montréal",
      "system.montreal:stm.name": "Métro de Montréal",
      "line.montreal:stm:1.name": "Ligne verte",
      "line.montreal:stm:1.detail": "Ligne 1",
      "line.montreal:stm:2.name": "Ligne orange",
      "line.montreal:stm:2.detail": "Ligne 2",
      "line.montreal:stm:4.name": "Ligne jaune",
      "line.montreal:stm:4.detail": "Ligne 4",
      "line.montreal:stm:5.name": "Ligne bleue",
      "line.montreal:stm:5.detail": "Ligne 5",
      "system.montreal:rem.name": "REM",
      "line.montreal:rem:a.name": "REM",
      "line.montreal:rem:a.detail": "Réseau express métropolitain",

      "city.toronto.name": "Toronto",
      "system.toronto:ttc.name": "Métro et train léger de Toronto",
      "line.toronto:ttc:1.name": "Ligne 1 Yonge-University",
      "line.toronto:ttc:1.detail": "Métro",
      "line.toronto:ttc:2.name": "Ligne 2 Bloor-Danforth",
      "line.toronto:ttc:2.detail": "Métro",
      "line.toronto:ttc:4.name": "Ligne 4 Sheppard",
      "line.toronto:ttc:4.detail": "Métro",
      "line.toronto:ttc:5.name": "Ligne 5 Eglinton",
      "line.toronto:ttc:5.detail": "Train léger",
      "line.toronto:ttc:6.name": "Ligne 6 Finch West",
      "line.toronto:ttc:6.detail": "Train léger",

      "city.vancouver.name": "Vancouver",
      "system.vancouver:translink.name": "SkyTrain",
      "line.vancouver:translink:expo.name": "Ligne Expo",
      "line.vancouver:translink:expo.detail": "Waterfront–King George / Production Way",
      "line.vancouver:translink:millennium.name": "Ligne Millennium",
      "line.vancouver:translink:millennium.detail": "VCC-Clark–Lafarge Lake-Douglas",
      "line.vancouver:translink:canada.name": "Ligne Canada",
      "line.vancouver:translink:canada.detail": "Waterfront–Richmond / YVR",

      "city.calgary.name": "Calgary",
      "system.calgary:ctrain.name": "CTrain",
      "line.calgary:ctrain:red.name": "Ligne rouge",
      "line.calgary:ctrain:red.detail": "Tuscany–Somerset-Bridlewood",
      "line.calgary:ctrain:blue.name": "Ligne bleue",
      "line.calgary:ctrain:blue.detail": "69 Street–Saddletowne",

      "city.edmonton.name": "Edmonton",
      "system.edmonton:ets.name": "Train léger d’Edmonton",
      "line.edmonton:ets:capital.name": "Ligne Capital",
      "line.edmonton:ets:capital.detail": "Clareview–Century Park",
      "line.edmonton:ets:metro.name": "Ligne Metro",
      "line.edmonton:ets:metro.detail": "NAIT/Blatchford Market–Health Sciences",
      "line.edmonton:ets:valley.name": "Ligne Valley",
      "line.edmonton:ets:valley.detail": "102 Street–Mill Woods",

      "city.ottawa.name": "Ottawa",
      "system.ottawa:octranspo.name": "O-Train",
      "line.ottawa:octranspo:1.name": "Ligne 1 de la Confédération",
      "line.ottawa:octranspo:1.detail": "Tunney's Pasture–Blair",
      "line.ottawa:octranspo:2.name": "Ligne 2 Trillium",
      "line.ottawa:octranspo:2.detail": "Bayview–Limebank",
      "line.ottawa:octranspo:4.name": "Ligne 4",
      "line.ottawa:octranspo:4.detail": "South Keys–Aéroport",

      "city.waterloo.name": "Région de Waterloo",
      "system.waterloo:grt.name": "ION",
      "line.waterloo:grt:ion.name": "Train léger ION",
      "line.waterloo:grt:ion.detail": "Conestoga–Fairway",

      "city.paris.name": "Paris",
      "system.paris:metro.name": "Métro de Paris",
      "line.paris:metro:1.name": "Ligne 1",
      "line.paris:metro:1.detail": "Métro",
      "line.paris:metro:2.name": "Ligne 2",
      "line.paris:metro:2.detail": "Métro",
      "line.paris:metro:3.name": "Ligne 3",
      "line.paris:metro:3.detail": "Métro",
      "line.paris:metro:3bis.name": "Ligne 3bis",
      "line.paris:metro:3bis.detail": "Métro",
      "line.paris:metro:4.name": "Ligne 4",
      "line.paris:metro:4.detail": "Métro",
      "line.paris:metro:5.name": "Ligne 5",
      "line.paris:metro:5.detail": "Métro",
      "line.paris:metro:6.name": "Ligne 6",
      "line.paris:metro:6.detail": "Métro",
      "line.paris:metro:7.name": "Ligne 7",
      "line.paris:metro:7.detail": "Métro",
      "line.paris:metro:7bis.name": "Ligne 7bis",
      "line.paris:metro:7bis.detail": "Métro",
      "line.paris:metro:8.name": "Ligne 8",
      "line.paris:metro:8.detail": "Métro",
      "line.paris:metro:9.name": "Ligne 9",
      "line.paris:metro:9.detail": "Métro",
      "line.paris:metro:10.name": "Ligne 10",
      "line.paris:metro:10.detail": "Métro",
      "line.paris:metro:11.name": "Ligne 11",
      "line.paris:metro:11.detail": "Métro",
      "line.paris:metro:12.name": "Ligne 12",
      "line.paris:metro:12.detail": "Métro",
      "line.paris:metro:13.name": "Ligne 13",
      "line.paris:metro:13.detail": "Métro",
      "line.paris:metro:14.name": "Ligne 14",
      "line.paris:metro:14.detail": "Métro",
      "system.paris:rer.name": "RER",
      "line.paris:rer:a.name": "RER A",
      "line.paris:rer:a.detail": "Réseau express régional",
      "line.paris:rer:b.name": "RER B",
      "line.paris:rer:b.detail": "Réseau express régional",
      "line.paris:rer:c.name": "RER C",
      "line.paris:rer:c.detail": "Réseau express régional",
      "line.paris:rer:d.name": "RER D",
      "line.paris:rer:d.detail": "Réseau express régional",
      "line.paris:rer:e.name": "RER E",
      "line.paris:rer:e.detail": "Réseau express régional",

      "city.lyon.name": "Lyon",
      "system.lyon:tcl.name": "Métro de Lyon",
      "line.lyon:tcl:a.name": "Ligne A",
      "line.lyon:tcl:a.detail": "Métro",
      "line.lyon:tcl:b.name": "Ligne B",
      "line.lyon:tcl:b.detail": "Métro",
      "line.lyon:tcl:c.name": "Ligne C",
      "line.lyon:tcl:c.detail": "Métro",
      "line.lyon:tcl:d.name": "Ligne D",
      "line.lyon:tcl:d.detail": "Métro",

      "city.marseille.name": "Marseille",
      "system.marseille:rtm.name": "Métro de Marseille",
      "line.marseille:rtm:m1.name": "Ligne M1",
      "line.marseille:rtm:m1.detail": "Métro",
      "line.marseille:rtm:m2.name": "Ligne M2",
      "line.marseille:rtm:m2.detail": "Métro",

      "city.lille.name": "Lille",
      "system.lille:ilevia.name": "Métro de Lille",
      "line.lille:ilevia:1.name": "Ligne 1",
      "line.lille:ilevia:1.detail": "Métro",
      "line.lille:ilevia:2.name": "Ligne 2",
      "line.lille:ilevia:2.detail": "Métro",

      "city.toulouse.name": "Toulouse",
      "system.toulouse:tisseo.name": "Métro de Toulouse",
      "line.toulouse:tisseo:a.name": "Ligne A",
      "line.toulouse:tisseo:a.detail": "Métro",
      "line.toulouse:tisseo:b.name": "Ligne B",
      "line.toulouse:tisseo:b.detail": "Métro",

      "city.rennes.name": "Rennes",
      "system.rennes:star.name": "Métro de Rennes",
      "line.rennes:star:a.name": "Ligne a",
      "line.rennes:star:a.detail": "Métro",
      "line.rennes:star:b.name": "Ligne b",
      "line.rennes:star:b.detail": "Métro",
      "city.new-york.name": "New York",
      "system.new-york:subway.name": "Métro de New York",
      "line.new-york:subway:1.name": "Ligne 1",
      "line.new-york:subway:1.detail": "Broadway–7 Avenue Local",
      "line.new-york:subway:2.name": "Ligne 2",
      "line.new-york:subway:2.detail": "7 Avenue Express",
      "line.new-york:subway:3.name": "Ligne 3",
      "line.new-york:subway:3.detail": "7 Avenue Express",
      "line.new-york:subway:4.name": "Ligne 4",
      "line.new-york:subway:4.detail": "Lexington Avenue Express",
      "line.new-york:subway:5.name": "Ligne 5",
      "line.new-york:subway:5.detail": "Lexington Avenue Express",
      "line.new-york:subway:6.name": "Ligne 6",
      "line.new-york:subway:6.detail": "Lexington Avenue Local",
      "line.new-york:subway:7.name": "Ligne 7",
      "line.new-york:subway:7.detail": "Flushing Local",
      "line.new-york:subway:a.name": "Ligne A",
      "line.new-york:subway:a.detail": "8 Avenue Express",
      "line.new-york:subway:c.name": "Ligne C",
      "line.new-york:subway:c.detail": "8 Avenue Local",
      "line.new-york:subway:e.name": "Ligne E",
      "line.new-york:subway:e.detail": "8 Avenue Local",
      "line.new-york:subway:b.name": "Ligne B",
      "line.new-york:subway:b.detail": "6 Avenue Express",
      "line.new-york:subway:d.name": "Ligne D",
      "line.new-york:subway:d.detail": "6 Avenue Express",
      "line.new-york:subway:f.name": "Ligne F",
      "line.new-york:subway:f.detail": "Queens Boulevard Express / 6 Avenue Local",
      "line.new-york:subway:m.name": "Ligne M",
      "line.new-york:subway:m.detail": "Queens Boulevard Local / 6 Avenue Local",
      "line.new-york:subway:g.name": "Ligne G",
      "line.new-york:subway:g.detail": "Brooklyn–Queens Crosstown",
      "line.new-york:subway:j.name": "Lignes J et Z",
      "line.new-york:subway:j.detail": "Nassau Street",
      "line.new-york:subway:l.name": "Ligne L",
      "line.new-york:subway:l.detail": "14 Street–Canarsie Local",
      "line.new-york:subway:n.name": "Ligne N",
      "line.new-york:subway:n.detail": "Broadway Local",
      "line.new-york:subway:q.name": "Ligne Q",
      "line.new-york:subway:q.detail": "Broadway Express",
      "line.new-york:subway:r.name": "Ligne R",
      "line.new-york:subway:r.detail": "Broadway Local",
      "line.new-york:subway:w.name": "Ligne W",
      "line.new-york:subway:w.detail": "Broadway Local",
      "line.new-york:subway:s.name": "Navettes S",
      "line.new-york:subway:s.detail": "42 St, Franklin Av et Rockaway Park",
      "system.new-york:sir.name": "Staten Island Railway",
      "line.new-york:sir:sir.name": "Staten Island Railway",
      "line.new-york:sir:sir.detail": "St. George–Tottenville",
      "system.new-york:path.name": "PATH",
      "line.new-york:path:nwk-wtc.name": "Newark–World Trade Center",
      "line.new-york:path:nwk-wtc.detail": "PATH",
      "line.new-york:path:hob-wtc.name": "Hoboken–World Trade Center",
      "line.new-york:path:hob-wtc.detail": "PATH",
      "line.new-york:path:jsq-33.name": "Journal Square–33rd Street",
      "line.new-york:path:jsq-33.detail": "PATH",
      "line.new-york:path:hob-33.name": "Hoboken–33rd Street",
      "line.new-york:path:hob-33.detail": "PATH",

      "city.washington.name": "Washington",
      "system.washington:wmata.name": "Métro de Washington",
      "line.washington:wmata:r.name": "Ligne rouge",
      "line.washington:wmata:r.detail": "Metrorail",
      "line.washington:wmata:o.name": "Ligne orange",
      "line.washington:wmata:o.detail": "Metrorail",
      "line.washington:wmata:s.name": "Ligne argent",
      "line.washington:wmata:s.detail": "Metrorail",
      "line.washington:wmata:b.name": "Ligne bleue",
      "line.washington:wmata:b.detail": "Metrorail",
      "line.washington:wmata:y.name": "Ligne jaune",
      "line.washington:wmata:y.detail": "Metrorail",
      "line.washington:wmata:g.name": "Ligne verte",
      "line.washington:wmata:g.detail": "Metrorail",

      "city.chicago.name": "Chicago",
      "system.chicago:cta.name": "Métro de Chicago",
      "line.chicago:cta:red.name": "Ligne rouge",
      "line.chicago:cta:red.detail": "‘L’",
      "line.chicago:cta:blue.name": "Ligne bleue",
      "line.chicago:cta:blue.detail": "‘L’",
      "line.chicago:cta:brown.name": "Ligne marron",
      "line.chicago:cta:brown.detail": "‘L’",
      "line.chicago:cta:green.name": "Ligne verte",
      "line.chicago:cta:green.detail": "‘L’",
      "line.chicago:cta:orange.name": "Ligne orange",
      "line.chicago:cta:orange.detail": "‘L’",
      "line.chicago:cta:pink.name": "Ligne rose",
      "line.chicago:cta:pink.detail": "‘L’",
      "line.chicago:cta:purple.name": "Ligne violette",
      "line.chicago:cta:purple.detail": "‘L’",
      "line.chicago:cta:yellow.name": "Ligne jaune",
      "line.chicago:cta:yellow.detail": "‘L’",

      "city.boston.name": "Boston",
      "system.boston:mbta.name": "Métro de Boston",
      "line.boston:mbta:red.name": "Ligne rouge",
      "line.boston:mbta:red.detail": "Métro",
      "line.boston:mbta:mattapan.name": "Ligne Mattapan",
      "line.boston:mbta:mattapan.detail": "Tramway",
      "line.boston:mbta:orange.name": "Ligne orange",
      "line.boston:mbta:orange.detail": "Métro",
      "line.boston:mbta:blue.name": "Ligne bleue",
      "line.boston:mbta:blue.detail": "Métro",
      "line.boston:mbta:green.name": "Ligne verte",
      "line.boston:mbta:green.detail": "Branches B, C, D et E",

      "city.san-francisco.name": "San Francisco",
      "system.san-francisco:bart.name": "BART",
      "line.san-francisco:bart:red.name": "Ligne rouge",
      "line.san-francisco:bart:red.detail": "Richmond–SFO/Millbrae",
      "line.san-francisco:bart:orange.name": "Ligne orange",
      "line.san-francisco:bart:orange.detail": "Richmond–Berryessa/North San José",
      "line.san-francisco:bart:yellow.name": "Ligne jaune",
      "line.san-francisco:bart:yellow.detail": "Antioch–SFO/Millbrae",
      "line.san-francisco:bart:green.name": "Ligne verte",
      "line.san-francisco:bart:green.detail": "Berryessa/North San José–Daly City",
      "line.san-francisco:bart:blue.name": "Ligne bleue",
      "line.san-francisco:bart:blue.detail": "Dublin/Pleasanton–Daly City",

      "city.philadelphia.name": "Philadelphie",
      "system.philadelphia:septa.name": "SEPTA Metro",
      "line.philadelphia:septa:l.name": "Ligne L",
      "line.philadelphia:septa:l.detail": "Market–Frankford Line",
      "line.philadelphia:septa:b.name": "Ligne B",
      "line.philadelphia:septa:b.detail": "Broad Street Line",
      "line.philadelphia:septa:m.name": "Ligne M",
      "line.philadelphia:septa:m.detail": "Norristown High Speed Line",

      "city.los-angeles.name": "Los Angeles",
      "system.los-angeles:metro.name": "Métro de Los Angeles",
      "line.los-angeles:metro:a.name": "Ligne A",
      "line.los-angeles:metro:a.detail": "Train léger",
      "line.los-angeles:metro:b.name": "Ligne B",
      "line.los-angeles:metro:b.detail": "Métro",
      "line.los-angeles:metro:c.name": "Ligne C",
      "line.los-angeles:metro:c.detail": "Train léger",
      "line.los-angeles:metro:d.name": "Ligne D",
      "line.los-angeles:metro:d.detail": "Métro",
      "line.los-angeles:metro:e.name": "Ligne E",
      "line.los-angeles:metro:e.detail": "Train léger",
      "line.los-angeles:metro:k.name": "Ligne K",
      "line.los-angeles:metro:k.detail": "Train léger",

      "city.atlanta.name": "Atlanta",
      "system.atlanta:marta.name": "Métro d’Atlanta",
      "line.atlanta:marta:red.name": "Ligne rouge",
      "line.atlanta:marta:red.detail": "Métro",
      "line.atlanta:marta:gold.name": "Ligne or",
      "line.atlanta:marta:gold.detail": "Métro",
      "line.atlanta:marta:blue.name": "Ligne bleue",
      "line.atlanta:marta:blue.detail": "Métro",
      "line.atlanta:marta:green.name": "Ligne verte",
      "line.atlanta:marta:green.detail": "Métro",

      "city.miami.name": "Miami",
      "system.miami:metrorail.name": "Metrorail de Miami",
      "line.miami:metrorail:green.name": "Ligne verte",
      "line.miami:metrorail:green.detail": "Palmetto–Dadeland South",
      "line.miami:metrorail:orange.name": "Ligne orange",
      "line.miami:metrorail:orange.detail": "Miami International Airport–Dadeland South",

      "city.baltimore.name": "Baltimore",
      "system.baltimore:mta.name": "Métro de Baltimore",
      "line.baltimore:mta:metro.name": "Metro SubwayLink",
      "line.baltimore:mta:metro.detail": "Owings Mills–Johns Hopkins Hospital"
    }
  }
};

// The first of the browser's preferred languages the interface is written in.
// A tag is tried whole and then shortened, so "fr-CA" is read as French today
// and would find a Canadian French block of its own if one were ever added.
function stmBrowserLocale(languages = globalThis.navigator?.languages ?? []) {
  const codes = new Map(
    Object.keys(STM_LOCALES).map((code) => [code.toLowerCase(), code])
  );

  for (const tag of languages) {
    const parts = String(tag).toLowerCase().split("-");

    for (let length = parts.length; length > 0; length -= 1) {
      const code = codes.get(parts.slice(0, length).join("-"));

      if (code) return code;
    }
  }

  return STM_FALLBACK_LOCALE;
}

// A stored choice naming a language this build is not written in — one taken
// out since it was picked, say — counts as no choice at all.
function stmResolveLocale(preference, languages) {
  return Object.hasOwn(STM_LOCALES, preference)
    ? preference
    : stmBrowserLocale(languages);
}

// The language every stmText() call reads. The worker, the settings page and
// each frame a content script runs in keep one of their own, set from the
// settings as they arrive.
let stmLocale = stmResolveLocale(STM_AUTO_LANGUAGE);

// Says whether the language actually changed: everything already on screen
// was written in the old one, and only then does it have to be built again.
function stmUseLanguage(preference) {
  const next = stmResolveLocale(preference);

  if (next === stmLocale) return false;

  stmLocale = next;

  return true;
}

// A message in the current language, each {name} in it replaced by that value.
// A key the current language lacks falls back to the fallback language, and a
// key both lack shows up as itself, which is easier to spot than a blank.
function stmText(key, values = {}) {
  const template =
    STM_LOCALES[stmLocale].messages[key] ??
    STM_LOCALES[STM_FALLBACK_LOCALE].messages[key] ??
    key;

  return template.replace(/\{(\w+)\}/g, (placeholder, name) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder
  );
}
