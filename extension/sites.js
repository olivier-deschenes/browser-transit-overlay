// One adapter per map the network can be drawn on. Everything that differs
// between them is named here, and content.js works from whichever adapter
// claims the page without knowing which one it got.
//
// Marketplace draws with Leaflet and a Centris search with the Google Maps
// API, and both hang the same thing off the DOM: raster tiles whose URL states
// the tile's column, row and zoom. That is the projection spelled out in full,
// so the renderer needs nothing from either library, and neither one has to be
// reached into from the page world.
//
// The map beside a Centris listing is the exception, and the one adapter here
// that cannot work that way: it belongs to Local Logic, comes in a frame of its
// own, and is drawn by MapLibre into a single WebGL canvas that says nothing
// about where the world is. Its projection is asked for instead — see the
// camera adapter at the bottom of this file and bridge.js.

// The nominal Web Mercator tile, which is both what the world is measured in
// and what the two sites happen to serve. A tile that arrives at some other
// size is still measured against this grid, so the served size is read from
// the URL rather than assumed.
const STM_TILE_SIZE = 256;

// The domain itself or a subdomain of it, rather than any host that merely
// ends with the same letters. The manifest is what actually decides where the
// script runs; this only tells the two adapters apart once it is running.
function stmHostIs(domain) {
  return (
    location.hostname === domain || location.hostname.endsWith(`.${domain}`)
  );
}

// Both sites can leave a second, dead map behind on a route change, and both
// answer the same way: the biggest one that still has a box. A map at zero
// size can never anchor the overlay, and binding to it would keep the real map
// from being picked up when it arrives.
function stmLargestMap(selector, accept) {
  let best;

  for (const element of document.querySelectorAll(selector)) {
    if (accept && !accept(element)) continue;

    const rect = element.getBoundingClientRect();
    const area = rect.width * rect.height;

    if (area > 0 && (!best || area > best.area)) best = { area, element };
  }

  return best?.element;
}

// Leaflet asks its tile server for the three numbers as ordinary query
// parameters.
function stmParseLeafletTile(source) {
  let parameters;

  try {
    ({ searchParams: parameters } = new URL(source));
  } catch {
    return undefined;
  }

  const x = parameters.get("x");
  const y = parameters.get("y");
  const z = parameters.get("z");

  if (x === null || y === null || z === null) return undefined;

  return { size: STM_TILE_SIZE, x: Number(x), y: Number(y), z: Number(z) };
}

// Google packs the same numbers into the single "pb" parameter, as a run of
// !<field>i<value> pairs: !1i is the zoom, !2i and !3i the column and row, and
// !4i the size the tile is served at.
const STM_GOOGLE_TILE = /!1i(\d+)!2i(\d+)!3i(\d+)!4i(\d+)/;

function stmParseGoogleTile(source) {
  const match = source.match(STM_GOOGLE_TILE);

  if (!match) return undefined;

  return {
    size: Number(match[4]),
    x: Number(match[2]),
    y: Number(match[3]),
    z: Number(match[1])
  };
}

const STM_FACEBOOK_RENTAL_ROUTE =
  /^\/marketplace\/(?:[^/]+\/)?(propertyrentals|apartments-for-rent|condos-for-rent|houses-for-rent|townhouses-for-rent)(?=\/|$)/;
const STM_FACEBOOK_ITEM_ROUTE = /^\/marketplace\/item\/\d+/;
const STM_STATIC_MAP_URL = /url\(["']?([^"')]+)/;

// Centris writes a search as one slug of tildes — condo~a-vendre~montreal-ile
// — and a single listing as that same slug followed by the listing number.
const STM_CENTRIS_SEARCH_ROUTE = /^\/(?:fr|en)\/[^/]*~[^/]*\/?$/;
const STM_CENTRIS_ITEM_ROUTE = /^\/(?:fr|en)\/[^/]+\/\d{5,}\/?$/;

// Local Logic sells the same widget to other listing sites, and the manifest
// can only match its frame by the frame's own URL. What makes one of them a
// Centris map is who embedded it.
const STM_CENTRIS_ORIGINS = ["https://www.centris.ca", "https://centris.ca"];

const STM_SITE_ADAPTERS = [
  {
    id: "facebook",

    claims: () => stmHostIs("facebook.com"),

    isCategoryPage: () => STM_FACEBOOK_RENTAL_ROUTE.test(location.pathname),
    isItemPage: () => STM_FACEBOOK_ITEM_ROUTE.test(location.pathname),

    mapSelector: ".leaflet-container, .leaflet-overlay-pane",

    findMap: () =>
      stmLargestMap(".leaflet-container", (element) =>
        element.querySelector(".leaflet-overlay-pane")
      ),

    // Leaflet keeps a pane of its own for exactly this, already stacked
    // between the tiles and the markers.
    overlayHost: (map) => map.querySelector(".leaflet-overlay-pane"),

    tileSelector: "img.leaflet-tile",
    parseTile: stmParseLeafletTile,

    // Marketplace builds its category map on its own schedule and inside a
    // feed it rewrites constantly, so a category page is watched outright
    // until the map lands.
    huntsForMap: true,

    // Leaflet zooms with a CSS transition, which announces its own start and
    // end. Nothing else has to keep the render loop alive.
    tilePaneSelector: ".leaflet-tile-pane",
    settleMs: 0,

    // The "Rental Location" strip on a listing page is not a map component at
    // all: it is one flat static_map.php raster hung off a background image.
    // There are no tiles to anchor to, but the URL carries center, zoom and
    // size, which is the projection spelled out another way.
    stripSelector: '[style*="static_map"]',

    stripDetails(element) {
      const source = getComputedStyle(element).backgroundImage.match(
        STM_STATIC_MAP_URL
      )?.[1];

      if (!source) return undefined;

      let parameters;

      try {
        ({ searchParams: parameters } = new URL(source, location.href));
      } catch {
        return undefined;
      }

      const center = parameters.get("center")?.split(",").map(Number);
      const size = parameters.get("size")?.split("x").map(Number);
      const zoom = Number(parameters.get("zoom"));

      if (
        center?.length !== 2 ||
        size?.length !== 2 ||
        !Number.isFinite(zoom) ||
        !center.every(Number.isFinite) ||
        !size.every((value) => Number.isFinite(value) && value > 0)
      ) {
        return undefined;
      }

      return {
        // The endpoint writes the centre the way an address reads, latitude
        // first, while every projection here takes longitude first.
        center: [center[1], center[0]],
        dark: parameters.get("theme") !== "light",
        height: size[1],
        width: size[0],
        zoom
      };
    },

    // Marketplace names the city in its category path, so the way to send
    // someone to the network they are looking at is to rewrite that one
    // segment. Which segment to write is the city's to say; all this knows is
    // where in the path it goes.
    //
    // Every city the registry lists that passes applies() gets a button of its
    // own, carrying its own name, and the words leading into that row are the
    // map's rather than the site's: map.citiesLead in i18n.js.
    shortcut: {
      // The shortcut rewrites a category path, so on a single listing there is
      // nothing for it to rewrite and the listing is simply where it is. A
      // city Marketplace has no slug for has nowhere to be sent either.
      applies: (city) =>
        Boolean(city.marketplaceSlug) &&
        STM_FACEBOOK_RENTAL_ROUTE.test(location.pathname),
      run(city) {
        const url = new URL(location.href);

        url.pathname = url.pathname.replace(
          STM_FACEBOOK_RENTAL_ROUTE,
          `/marketplace/${city.marketplaceSlug}/$1`
        );
        location.assign(url.href);
      }
    }
  },
  {
    id: "centris",

    claims: () => stmHostIs("centris.ca"),

    isCategoryPage: () => STM_CENTRIS_SEARCH_ROUTE.test(location.pathname),
    isItemPage: () => STM_CENTRIS_ITEM_ROUTE.test(location.pathname),

    // Google builds this element when the map initialises, well before the
    // first tile lands, so it is what the detector in content.css waits for.
    mapSelector: ".gm-style",

    findMap: () => stmLargestMap(".gm-style"),

    // Google stacks its panes as z-indexed siblings under one container: the
    // tiles sit at the bottom of that stack and the property pins at the top,
    // so an overlay added there with a z-index of its own lands between them.
    // The path is Google's own and a release of the API could rename it, which
    // is why nothing here insists on finding it — the fallback in content.js
    // only costs the network being drawn over the pins instead of under them.
    overlayHost: (map) => map.firstElementChild?.firstElementChild,
    overlayZIndex: "102",

    tileSelector: 'img[src*="/maps/vt"]',
    parseTile: stmParseGoogleTile,

    // No huntsForMap: a Centris search only grows a map in map view, and it
    // is Google that builds it, announcing itself through the detector in
    // content.css whether it arrives with the page or replaces an earlier one
    // after a filter change. Watching the whole document instead would tax
    // every gallery-view search for a map that is never coming.

    // Google animates a zoom from its own frame loop rather than with a CSS
    // transition, so there is no event to say it has finished. The overlay
    // keeps redrawing for a moment past the last thing the map did, which
    // covers the zoom, the glide at the end of a flick, and the map being
    // moved by the site itself.
    settleMs: 450
  },
  {
    id: "locallogic",

    claims: () =>
      stmHostIs("locallogic.co") &&
      STM_CENTRIS_ORIGINS.includes(location.ancestorOrigins?.[0]),

    // Centris' switch, not one of its own: the user turned on Centris, and
    // that this particular map arrives from somewhere else is an implementation
    // detail of Centris' listing page rather than a second site to allow.
    switchId: "centris",

    // The frame is the map. There is no route to read, and the widget Centris
    // embeds only ever appears beside a listing.
    isCategoryPage: () => false,
    isItemPage: () => true,

    // MapLibre puts this class on the element it was handed as soon as the map
    // initialises, well before anything is painted into it.
    mapSelector: ".maplibregl-map",

    findMap: () => stmLargestMap(".maplibregl-map"),

    // MapLibre stacks the canvas and its pins as absolutely positioned
    // siblings of one box, in the order they were added. An overlay inserted
    // ahead of the first pin therefore lands where it should: over the map and
    // under the pins, including the pin on the listing itself. As everywhere
    // else, nothing insists on finding them — appended at the end instead, the
    // network is drawn over the pins rather than under them.
    overlayHost: (map) => map.querySelector(".maplibregl-canvas-container"),
    overlayAnchor: (pane) => pane.querySelector(".maplibregl-marker"),

    // What makes this adapter different from the other two: there are no tiles
    // to read a projection off, so the renderer takes it from what bridge.js
    // has asked the map for. The canvas is what MapLibre's own answer is
    // measured from.
    camera: true,
    cameraSurface: (map) => map.querySelector(".maplibregl-canvas"),

    // Like Google's map, MapLibre animates from a frame loop of its own with
    // nothing to say it has finished. The window covers the frame or two
    // between the map settling and the last projection reaching this side.
    settleMs: 250
  }
];

function stmSiteForPage() {
  return STM_SITE_ADAPTERS.find((adapter) => adapter.claims());
}
