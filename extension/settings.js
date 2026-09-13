// Everything the content script and the options page both need: what the
// extension stores, and how to read what the user types into either of the
// two forms that write it.
//
// The master switch keeps a storage key of its own because the toolbar button
// writes it without ever reading, or caring about, the rest of the settings.
const STM_ENABLED_KEY = "enabled";
const STM_SETTINGS_KEY = "settings";
const STM_CUSTOM_POINTS_KEY = "customPoints";
const STM_OPEN_OPTIONS_MESSAGE = "stm-open-options";

// The sites the overlay knows how to draw on. The adapter that actually does
// the drawing lives in sites.js, which the settings page has no use for; what
// it needs is the name to put beside a switch.
const STM_SITES = [
  {
    detail: "Cartes des logements et aperçu de carte des annonces.",
    id: "facebook",
    name: "Facebook Marketplace"
  },
  {
    detail: "Cartes des résultats de recherche et des fiches.",
    id: "centris",
    name: "Centris.ca"
  }
];

// The three levels of networks.js each keep a map of their own, keyed by the
// same ids the registry hands out. A line draws when all three are on, so a
// system is one switch over every line it owns without any of those lines
// having to be written to.
const STM_DEFAULT_SETTINGS = {
  cities: Object.fromEntries(STM_CITIES.map(({ id }) => [id, true])),
  cityShortcut: true,
  interactiveMaps: true,
  lines: Object.fromEntries(STM_LINES.map(({ id }) => [id, true])),
  listingPreview: true,
  networkStatus: true,
  points: true,
  pointsTool: true,
  settingsShortcut: true,
  sites: Object.fromEntries(STM_SITES.map(({ id }) => [id, true])),
  stationLabels: true,
  stations: true,
  systems: Object.fromEntries(STM_SYSTEMS.map(({ id }) => [id, true]))
};

// Stored settings are merged over the defaults rather than read as they come,
// so a build that adds a switch needs no migration: whatever is missing from
// storage simply keeps shipping its default. A city added to the registry
// therefore ships switched on while being absent from storage entirely.
function stmMergeSettings(stored) {
  return {
    ...STM_DEFAULT_SETTINGS,
    ...stored,
    cities: { ...STM_DEFAULT_SETTINGS.cities, ...stored?.cities },
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
// Both take the same thing, say the same things about it, and start from the
// same colour, because they are two doors into one list.
const STM_DEFAULT_POINT_COLOR = "#e53935";
const STM_LOCATION_LABEL = "Lien Google Maps ou coordonnées";
const STM_LOCATION_HINT =
  "Formats acceptés : lien google.com/maps/place/… ou coordonnées (45.5019, -73.5674).";
const STM_SHORT_LINK_WARNING =
  "Les liens courts maps.app.goo.gl ne sont pas acceptés.";

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
  if (!value.trim()) {
    return "Entrez un lien Google Maps ou des coordonnées.";
  }

  if (STM_SHORT_MAPS_LINK.test(value)) {
    return "Lien court sans coordonnées. Ouvrez-le dans Google Maps, puis copiez l’adresse complète.";
  }

  return "Aucune coordonnée trouvée. Utilisez un lien google.com/maps/place/… ou des coordonnées.";
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
