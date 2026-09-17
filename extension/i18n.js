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
// city.montreal.name, system.montreal:stm.name, line.montreal:stm:1.name —
// because a place or a line is called something different in each language
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

      "map.loading": "Loading the network…",
      "map.offNetwork": "Network out of view",
      "map.citiesLead": "See housing in",
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
      "options.stationLabels.hint": "Shown only past a certain zoom level.",
      "options.points": "Landmarks",
      "options.points.hint":
        "Your landmarks appear on maps and in listing previews.",
      "options.tools.title": "Map tools",
      "options.pointsTool": "Adding landmarks",
      "options.pointsTool.hint": "The “Add a landmark” button and its list.",
      "options.networkStatus": "“Network out of view” notice",
      "options.networkStatus.hint":
        "Warns when the map is far from the network.",
      "options.cityShortcut": "“See housing in” buttons",
      "options.cityShortcut.hint":
        "Shortcuts to the housing in each supported city. Marketplace only.",
      "options.settingsShortcut": "Settings button",
      "options.settingsShortcut.hint":
        "The gear that opens this page from the map.",
      "options.sites.title": "Sites",
      "options.lines.title": "Lines",
      "options.lines.allOn": "Turn all on",
      "options.lines.allOff": "Turn all off",
      "options.points.title": "Landmarks",
      "options.points.empty":
        "No landmarks saved. Add one below, or from the map.",
      "options.reset": "Reset settings",
      "options.reset.confirm": "Restore every setting to its default?",
      "options.reset.note":
        "Saved landmarks are not deleted. The attribution shown on the map is part of the data licence and stays in place.",

      "site.facebook.detail": "Housing maps and listing map previews.",
      "site.centris.detail": "Search result maps and listing maps.",

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
      "line.toronto:ttc:6.detail": "Light rail"
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

      "map.loading": "Chargement du réseau…",
      "map.offNetwork": "Réseau hors champ",
      "map.citiesLead": "Voir les logements à",
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
        "Affichés à partir d’un certain niveau de zoom seulement.",
      "options.points": "Points de repère",
      "options.points.hint":
        "Vos points apparaissent sur les cartes et dans l’aperçu des annonces.",
      "options.tools.title": "Outils sur la carte",
      "options.pointsTool": "Ajout de points de repère",
      "options.pointsTool.hint": "Le bouton « Ajouter un point » et sa liste.",
      "options.networkStatus": "Avis « Réseau hors champ »",
      "options.networkStatus.hint":
        "Prévient quand la carte est loin du réseau.",
      "options.cityShortcut": "Boutons « Voir les villes »",
      "options.cityShortcut.hint":
        "Raccourcis vers les logements de chaque ville prise en charge. Marketplace seulement.",
      "options.settingsShortcut": "Bouton de réglages",
      "options.settingsShortcut.hint":
        "L’engrenage qui ouvre cette page depuis la carte.",
      "options.sites.title": "Sites",
      "options.lines.title": "Lignes",
      "options.lines.allOn": "Tout activer",
      "options.lines.allOff": "Tout désactiver",
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
      "line.toronto:ttc:6.detail": "Train léger"
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
