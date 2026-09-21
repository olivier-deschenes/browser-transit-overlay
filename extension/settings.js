// Everything the content script and the options page both need: what the
// extension stores, and how to read what the user types into either of the
// two forms that write it.
//
// The master switch keeps a storage key of its own because the toolbar button
// writes it without ever reading, or caring about, the rest of the settings.
const STM_ENABLED_KEY = "enabled";
const STM_SETTINGS_KEY = "settings";
const STM_CUSTOM_POINTS_KEY = "customPoints";
// The city the last map to say so was looking at. Not a setting and never
// shown as one: nothing chooses it, the maps write it as they go, and all it
// buys is the next page starting its guess where the last one ended instead of
// at the first city in the registry. A map corrects it within a frame or two
// of being found, so a stale one costs nothing.
const STM_ACTIVE_CITY_KEY = "activeCity";
// Whether the listings beside a Marketplace search were hidden when the button
// on the map's edge was last pressed. Not a setting either: it is how a search
// was left rather than how the extension is set up, and the next search opens
// the same way. Resetting the settings leaves it alone; the button is the way
// to bring the listings back.
const STM_LISTINGS_HIDDEN_KEY = "listingsHidden";
const STM_OPEN_OPTIONS_MESSAGE = "stm-open-options";

// The sites the overlay knows how to draw on. The adapter that actually does
// the drawing lives in sites.js, which the settings page has no use for; what
// it needs is the name to put beside a switch. The name is the site's own in
// every language, and the line under it is in i18n.js, keyed by the site's id.
const STM_SITES = [
  { id: "facebook", name: "Facebook Marketplace" },
  { id: "centris", name: "Centris.ca" }
];

// One city at a time, and which one. The map only ever draws the city its
// viewport is over — it swaps its network on the way out of one city's bounds
// and into the next — so a second city left switched on could never show
// anything anyway. Making that the rule rather than an accident of where the
// map happens to be looking is what lets both forms be read as a choice
// between cities instead of a row of switches that mostly do nothing. Picking
// one writes every city at once, so a write can never leave two standing.
function stmOnlyCity(cityId) {
  return Object.fromEntries(STM_CITIES.map(({ id }) => [id, id === cityId]));
}

// The three levels of networks.js each keep a map of their own, keyed by the
// same ids the registry hands out. A line draws when all three are on, so a
// system is one switch over every line it owns without any of those lines
// having to be written to.
const STM_DEFAULT_SETTINGS = {
  cities: stmOnlyCity(STM_DEFAULT_CITY_ID),
  cityPicker: true,
  interactiveMaps: true,
  // A language code from i18n.js, or the browser's choice until one is picked.
  language: STM_AUTO_LANGUAGE,
  linePicker: true,
  lines: Object.fromEntries(STM_LINES.map(({ id }) => [id, true])),
  listingPreview: true,
  listingsToggle: true,
  networkStatus: true,
  points: true,
  pointsTool: true,
  settingsShortcut: true,
  sites: Object.fromEntries(STM_SITES.map(({ id }) => [id, true])),
  stationLabels: true,
  stations: true,
  systems: Object.fromEntries(STM_SYSTEMS.map(({ id }) => [id, true]))
};

// The one map in the settings that is not merged over its default, because
// merging it would answer the wrong question: a default city switched on
// would outrank a stored city switched on, and the pick would never move off
// the default. Whatever storage has to say about the cities is followed
// instead — the city it names as on, or no city at all where it names none —
// and only storage with nothing to say about them falls through to the
// default. Storage written before the cities became a choice between them
// names every one of them at once; the first of those, in the registry's
// order, is what such a map is read as, since a form showing the rule being
// broken would be worse than one that quietly picks.
function stmSingleCity(stored) {
  const named = STM_CITIES.filter(({ id }) => Object.hasOwn(stored ?? {}, id));

  if (named.length === 0) return { ...STM_DEFAULT_SETTINGS.cities };

  return stmOnlyCity(named.find(({ id }) => stored[id] !== false)?.id);
}

// Stored settings are merged over the defaults rather than read as they come,
// so a build that adds a switch needs no migration: whatever is missing from
// storage simply keeps shipping its default. A city added to the registry is
// the exception and ships switched off, because the city that is on is the
// one somebody chose.
function stmMergeSettings(stored) {
  return {
    ...STM_DEFAULT_SETTINGS,
    ...stored,
    cities: stmSingleCity(stored?.cities),
    lines: { ...STM_DEFAULT_SETTINGS.lines, ...stored?.lines },
    sites: { ...STM_DEFAULT_SETTINGS.sites, ...stored?.sites },
    systems: { ...STM_DEFAULT_SETTINGS.systems, ...stored?.systems }
  };
}

// The switches multiply: a line is drawn only where its city, its system and
// the line itself are all on, the same way a site's switch multiplies with
// the kind of map it is being asked for. Reading the two parent keys back out
// of the line id is what saves a lookup here.
function stmIsLineEnabled(settings, lineId) {
  const [cityId, systemId] = lineId.split(":");

  return (
    settings.cities[cityId] !== false &&
    settings.systems[`${cityId}:${systemId}`] !== false &&
    settings.lines[lineId] !== false
  );
}

// A point can be added from the panel on the map or from the settings page.
// Both take the same thing, say the same things about it — the point.* messages
// in i18n.js — and start from the same colour, because they are two doors into
// one list.
const STM_DEFAULT_POINT_COLOR = "#e53935";

const STM_SHORT_MAPS_LINK = /(?:maps\.app\.goo\.gl|goo\.gl\/maps)/i;
const STM_RAW_COORDINATES = /^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/;

// Google Maps writes the pin twice: !3d/!4d is the place itself, while
// @lat,lng is only wherever the viewport happened to sit when the link was
// copied. Read them in that order so the marker lands on the place.
function stmCoordinatesFromLocation(value) {
  const trimmed = value.trim();

  if (!trimmed) return undefined;

  let url = trimmed;

  try {
    url = decodeURIComponent(trimmed);
  } catch {
    // A stray percent sign is no reason to give up on the rest of the link.
  }

  const match =
    url.match(/!3d(-?[\d.]+)!4d(-?[\d.]+)/) ??
    url.match(/@(-?[\d.]+),(-?[\d.]+)/) ??
    url.match(/[?&](?:q|query|ll|center)=(-?[\d.]+),\s*(-?[\d.]+)/) ??
    url.match(STM_RAW_COORDINATES);

  if (!match) return undefined;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);

  // A truncated paste can still match and yield a number that is not a
  // place, which would park the marker somewhere impossible.
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return undefined;
  }

  return [longitude, latitude];
}

function stmLocationErrorMessage(value) {
  if (!value.trim()) return stmText("point.errorEmpty");

  if (STM_SHORT_MAPS_LINK.test(value)) return stmText("point.errorShortLink");

  return stmText("point.errorNotFound");
}

// Storage keeps longitude first, the way every projection here reads it, but
// both forms take and show the latitude first, the way an address does.
// Rounding is for reading only: an edit starts from what was actually stored,
// so saving a point again cannot quietly walk it down the street.
function stmFormatCoordinates([longitude, latitude], digits) {
  const shown = (value) =>
    digits === undefined ? value : value.toFixed(digits);

  return `${shown(latitude)}, ${shown(longitude)}`;
}
