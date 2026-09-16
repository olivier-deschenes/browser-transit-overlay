(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const ENABLED_ATTRIBUTE = "data-stm-enabled";
  const SITE_ATTRIBUTE = "data-stm-site";
  // How a map with no tiles to read is projected instead: the anchor asks
  // bridge.js for the projection, and the camera is its answer. Both names are
  // spelled out again there, because that script runs in the page world and
  // the two share nothing but the DOM they are written on.
  const ANCHOR_ATTRIBUTE = "data-stm-anchor";
  const CAMERA_ATTRIBUTE = "data-stm-camera";
  const MAP_DETECT_ANIMATION = "stm-map-detect";
  const STATION_CULL_MARGIN = 140;
  const LABEL_MIN_ZOOM = 13;
  // Panning slides tiles and the overlay pane together, so the projection
  // that comes back out of the arithmetic is the same one to within float
  // noise. Anything under a hundredth of a pixel is that noise, not a move.
  const ORIGIN_EPSILON = 0.01;
  const TRANSITION_TIMEOUT = 2000;
  const NETWORK_ZOOM = 16;
  // The coordinate bridge.js is asked to project, which deliberately belongs
  // to no city. A projection is a scale and a translate, so one projected
  // point and the zoom it was taken at spell the whole of it out, and which
  // point that is does not matter. Keeping it fixed is what lets the city be
  // read off where the map turns out to be looking, instead of the city
  // having to be known before the map can be asked anything.
  const ANCHOR_COORDINATES = [0, 0];
  // Whichever site this page belongs to. The script is injected by host
  // match, so nothing claiming the page can only mean a host was added to the
  // manifest without an adapter in sites.js to go with it.
  const site = stmSiteForPage();
  // What a page has to grow before a sync is worth running: the map, and on a
  // site that has one, the static strip beside a listing's address.
  const PAGE_SELECTOR = site
    ? [site.mapSelector, site.stripSelector].filter(Boolean).join(", ")
    : "";
  // Which switch on the settings page this map answers to. It is the adapter's
  // own name everywhere but on the Local Logic frame, which is a map of
  // Centris' arriving from somewhere else rather than a site of its own.
  const SITE_SWITCH = site ? site.switchId ?? site.id : "";
  let settings = stmMergeSettings();
  let map;
  let overlay;
  let networkGroup;
  let attribution;
  let mapTools;
  let networkStatus;
  let networkStatusText;
  let cityShortcuts;
  let networkState;
  let customPanel;
  let customPointGroup;
  let customPointList;
  let customPointMarkers = [];
  let customPoints = [];
  let customPointsReady;
  let mapObserver;
  let resizeObserver;
  let cameraObserver;
  let eventController;
  let renderRequest;
  // How long the render loop stays alive past the last thing the map was seen
  // doing, for a map that moves without announcing it. Zero on a site whose
  // animations report themselves.
  let renderUntil = 0;
  let activeTransitions = new Map();
  let anchorTile;
  // The box every coordinate the renderer writes is measured from, which is
  // not always the element the overlay hangs off: MapLibre's canvas container
  // is a plain block, and an overlay inside it is still positioned against the
  // map container around it.
  let overlayFrame;
  let overlayDrawable;
  let lineTransformGroup;
  let stationTransformGroup;
  let customPointTransformGroup;
  let renderedOriginX;
  let renderedOriginY;
  let renderedScale;
  let customPointsDirty = true;
  let linePaths = [];
  let networkData;
  let networkDataRequest;
  let networkGeometry;
  let networkOrigin;
  let anchorPoint;
  // One metro area at a time. A housing map never usefully shows two of them
  // at once, every coordinate the renderer writes is measured from this city's
  // own origin, and the geometry it draws is this city's file. Which one it is
  // is decided by where the map turns out to be looking; until something says
  // otherwise, it is the first one in the registry.
  let activeCity = stmCityById(STM_DEFAULT_CITY_ID);
  let stationMarkers = [];
  let stationLabelGroup;
  let stationLabelsVisible;
  let strip;
  let stripOverlay;
  let stripLineGroup;
  let stripPointGroup;
  let stripCredit;
  let stripPointMarkers = [];
  let stripObserver;
  let stripResizeObserver;
  let stripRenderRequest;
  let pageObserver;
  let pageController;
  let enabled = false;
  let observedPathname = location.pathname;
  const tileCoordinates = new WeakMap();

  // A site the user has switched off in the settings is not a site with no
  // pages, so the check belongs here rather than in the adapter: the adapter
  // says what the page is, the setting says whether we draw on it.
  function isOverlayPage() {
    if (settings.sites[SITE_SWITCH] === false) return false;

    return site.isCategoryPage() || site.isItemPage();
  }

  function createSvgElement(name, attributes) {
    const element = document.createElementNS(SVG_NS, name);

    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, value);
    }

    return element;
  }

  // The panel here and the list on the settings page are two views of one
  // stored array, so neither of them touches its own copy: they write, and
  // the storage listener hands the new array back to both.
  async function saveCustomPoints(next) {
    await chrome.storage.local.set({ [STM_CUSTOM_POINTS_KEY]: next });
  }

  function setNetworkState(state) {
    if (state === networkState) return;
    networkState = state;

    if (!networkStatus) return;

    if (state === "visible") {
      networkStatus.hidden = true;
      return;
    }

    networkStatus.hidden = false;

    if (cityShortcuts) {
      if (state === "outside") renderCityShortcuts();
      else cityShortcuts.hidden = true;
    }

    networkStatusText.textContent =
      state === "loading" ? "Chargement du réseau…" : "Réseau hors champ";
  }

  // Every city that can be reached from this page, a button apiece, rather
  // than only the one the overlay happens to be holding: a map that has
  // wandered off the network is exactly where someone needs to be told what
  // else there is. The row is rebuilt each time the notice is shown rather
  // than once with the panel it sits in, because both of the things that
  // decide its contents — the route applies() reads and the city switches —
  // change under a map that is never rebuilt.
  function renderCityShortcuts() {
    const cities = STM_CITIES.filter(
      (city) =>
        settings.cities[city.id] !== false && site.shortcut.applies(city)
    );

    cityShortcuts.replaceChildren();
    cityShortcuts.hidden = cities.length === 0;

    if (cityShortcuts.hidden) return;

    const lead = document.createElement("span");
    lead.className = "stm-shortcut-lead";
    lead.textContent = site.shortcut.label;
    cityShortcuts.append(lead);

    for (const city of cities) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = city.name;
      button.addEventListener("click", () => site.shortcut.run(city));
      cityShortcuts.append(button);
    }
  }

  function buildNetworkStatus() {
    networkStatus = document.createElement("div");
    networkStatus.id = "stm-network-status";

    // The message is the part that changes on its own, so it is the part that
    // announces itself. The buttons under it are controls, and they are
    // rebuilt every time the notice is shown: inside the live region that
    // rebuild would be read out as news each time the map wandered off.
    networkStatusText = document.createElement("span");
    networkStatusText.setAttribute("role", "status");
    networkStatusText.setAttribute("aria-live", "polite");
    networkStatus.append(networkStatusText);

    // Only Marketplace has somewhere to jump to: its category path names the
    // city, so it can be rewritten. A Centris search is an opaque payload.
    if (settings.cityShortcut && site.shortcut) {
      cityShortcuts = document.createElement("div");
      cityShortcuts.id = "stm-network-cities";
      cityShortcuts.hidden = true;
      cityShortcuts.setAttribute("role", "group");
      cityShortcuts.setAttribute("aria-label", site.shortcut.label);
      networkStatus.append(cityShortcuts);
    }

    mapTools.append(networkStatus);
  }

  function buildSettingsShortcut() {
    const button = document.createElement("button");
    button.type = "button";
    button.id = "stm-settings-shortcut";
    button.textContent = "⚙";
    button.title = "Réglages de l’extension";
    button.setAttribute("aria-label", "Réglages de l’extension");
    button.addEventListener("click", () => {
      // A content script cannot open the options page itself. The worker
      // answers by opening it and nothing else, so the port closes without a
      // reply and the promise rejects; that is the normal path, not an error.
      chrome.runtime
        .sendMessage({ type: STM_OPEN_OPTIONS_MESSAGE })
        .catch(() => {});
    });

    mapTools.append(button);
  }

  function buildMapTools() {
    // The container goes up whatever ends up inside it: sync() reads a
    // missing one as a wiped one, and an empty flex column paints nothing.
    mapTools = document.createElement("div");
    mapTools.id = "stm-map-tools";
    // Each site keeps its own controls in a different corner, and content.css
    // moves the column out from under whichever ones this one has.
    mapTools.dataset.stmSite = site.id;

    if (settings.networkStatus) buildNetworkStatus();

    map.append(mapTools);

    for (const eventName of ["click", "pointerdown", "wheel"]) {
      mapTools.addEventListener(eventName, (event) => {
        event.stopPropagation();
      });
    }

    setNetworkState("loading");
  }

  function refreshCustomPoints() {
    customPointsDirty = true;
    customPointGroup?.replaceChildren();
    customPointList?.replaceChildren();
    customPointMarkers = [];

    for (const point of customPoints) {
      if (settings.points) {
        const marker = createSvgElement("circle", {
          fill: point.color,
          r: "7",
          stroke: "#ffffff",
          "stroke-width": "2"
        });
        const label = createSvgElement("text", {
          fill: "#202124",
          "font-family": "Arial, sans-serif",
          "font-size": "12",
          "font-weight": "600",
          "paint-order": "stroke",
          stroke: "#ffffff",
          "stroke-linejoin": "round",
          "stroke-width": "3"
        });
        label.textContent = point.label;
        customPointGroup?.append(marker, label);
        customPointMarkers.push({
          label,
          marker,
          point: localPoint(point.coordinates)
        });
      }

      // Hiding the points still leaves them listed, so they can be found and
      // deleted; switching the panel off is what takes the list away.
      if (!customPointList) continue;

      const row = document.createElement("div");
      row.className = "stm-custom-point-row";

      const name = document.createElement("span");
      name.textContent = point.label;
      name.style.setProperty("--point-color", point.color);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Supprimer";
      remove.addEventListener("click", () =>
        saveCustomPoints(customPoints.filter(({ id }) => id !== point.id))
      );

      row.append(name, remove);
      customPointList?.append(row);
    }

    refreshStripPoints();
    scheduleStripRender();
  }

  function buildCustomPointPanel() {
    customPanel = document.createElement("div");
    customPanel.id = "stm-custom-points";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.textContent = "Ajouter un point";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "stm-custom-points-panel");

    const panel = document.createElement("div");
    panel.id = "stm-custom-points-panel";
    panel.className = "stm-custom-points-panel";
    panel.hidden = true;

    const form = document.createElement("form");

    const label = document.createElement("input");
    label.name = "label";
    label.placeholder = "Nom";
    label.setAttribute("aria-label", "Nom");

    // type="url" would reject a pasted coordinate pair before submit ever
    // fires, and its built-in bubble is not in our wording. Validate here.
    const googleMapsUrl = document.createElement("input");
    googleMapsUrl.name = "googleMapsUrl";
    googleMapsUrl.type = "text";
    googleMapsUrl.autocomplete = "off";
    googleMapsUrl.spellcheck = false;
    googleMapsUrl.placeholder = STM_LOCATION_LABEL;
    googleMapsUrl.setAttribute("aria-label", STM_LOCATION_LABEL);
    googleMapsUrl.setAttribute("aria-describedby", "stm-custom-point-hint");

    const hint = document.createElement("p");
    hint.id = "stm-custom-point-hint";
    hint.className = "stm-custom-point-hint";

    const hintFormats = document.createElement("span");
    hintFormats.textContent = STM_LOCATION_HINT;

    const hintShortLink = document.createElement("span");
    hintShortLink.className = "stm-custom-point-hint-warning";
    hintShortLink.textContent = STM_SHORT_LINK_WARNING;

    hint.append(hintFormats, hintShortLink);

    const locationError = document.createElement("p");
    locationError.className = "stm-custom-point-error";
    locationError.setAttribute("role", "alert");
    locationError.hidden = true;

    const setLocationError = (message) => {
      locationError.textContent = message;
      locationError.hidden = !message;
      googleMapsUrl.setAttribute("aria-invalid", message ? "true" : "false");
    };

    googleMapsUrl.addEventListener("input", () => setLocationError(""));

    const color = document.createElement("input");
    color.name = "color";
    color.type = "color";
    color.value = STM_DEFAULT_POINT_COLOR;
    color.setAttribute("aria-label", "Couleur");

    const add = document.createElement("button");
    add.type = "submit";
    add.textContent = "Ajouter";

    const actions = document.createElement("div");
    actions.className = "stm-custom-point-actions";
    actions.append(color, add);

    customPointList = document.createElement("div");
    customPointList.className = "stm-custom-point-list";

    form.append(label, googleMapsUrl, hint, locationError, actions);
    panel.append(form, customPointList);
    customPanel.append(toggle, panel);
    mapTools.append(customPanel);

    toggle.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      toggle.setAttribute("aria-expanded", String(!panel.hidden));
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await customPointsReady;
      const data = new FormData(form);
      const rawLocation = String(data.get("googleMapsUrl") ?? "");
      const coordinates = stmCoordinatesFromLocation(rawLocation);

      if (!coordinates) {
        setLocationError(stmLocationErrorMessage(rawLocation));
        googleMapsUrl.focus();
        return;
      }

      await saveCustomPoints([
        ...customPoints,
        {
          id: crypto.randomUUID(),
          label: data.get("label"),
          color: data.get("color"),
          coordinates
        }
      ]);

      form.reset();
      setLocationError("");
      color.value = STM_DEFAULT_POINT_COLOR;
    });
  }

  function buildOverlay() {
    const pane = site.overlayHost(map) ?? map;
    const geometry = getNetworkGeometry();
    overlay = createSvgElement("svg", {
      "aria-hidden": "true",
      id: "stm-metro-overlay"
    });

    // Leaflet's overlay pane is already stacked where we want to be. Google's
    // panes are ordinary z-indexed siblings, so the overlay has to name the
    // layer it belongs on to land between the tiles and the property pins.
    if (site.overlayZIndex) overlay.style.zIndex = site.overlayZIndex;

    const haloGroup = createSvgElement("g", {
      fill: "none",
      stroke: "#ffffff",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-opacity": "0.9",
      "stroke-width": "9"
    });
    const lineGroup = createSvgElement("g", {
      fill: "none",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-width": "5"
    });
    const stationGroup = createSvgElement("g", {
      fill: "#ffffff",
      stroke: "#292929",
      "stroke-width": "2"
    });
    stationLabelGroup = createSvgElement("g", {
      fill: "#202124",
      "font-family": "Arial, sans-serif",
      "font-size": "11",
      "font-weight": "600",
      "paint-order": "stroke",
      stroke: "#ffffff",
      "stroke-linejoin": "round",
      "stroke-width": "3"
    });
    customPointGroup = createSvgElement("g", {});
    networkGroup = createSvgElement("g", {});
    lineTransformGroup = createSvgElement("g", {});

    // Circles and labels keep a fixed pixel size, so their groups carry a
    // translate and nothing else. Panning then costs one transform write
    // instead of two coordinates per station.
    stationTransformGroup = createSvgElement("g", {});
    customPointTransformGroup = createSvgElement("g", {});

    for (const { bounds, color, path } of geometry.paths) {
      const halo = createSvgElement("path", {
        d: path,
        "vector-effect": "non-scaling-stroke"
      });
      const route = createSvgElement("path", {
        d: path,
        stroke: color,
        "vector-effect": "non-scaling-stroke"
      });
      haloGroup.append(halo);
      lineGroup.append(route);
      linePaths.push({ bounds, halo, route });
    }

    for (const station of geometry.stations) {
      const marker = createSvgElement("circle", { r: "4.5" });
      let label;

      if (settings.stationLabels) {
        label = createSvgElement("text", {});
        label.textContent = station.name;
        stationLabelGroup.append(label);
      }

      stationGroup.append(marker);
      stationMarkers.push({
        label,
        marker,
        point: station.point,
        visible: true
      });
    }

    lineTransformGroup.append(haloGroup, lineGroup);
    stationTransformGroup.append(stationGroup, stationLabelGroup);
    customPointTransformGroup.append(customPointGroup);
    networkGroup.append(lineTransformGroup, stationTransformGroup);
    overlay.append(networkGroup, customPointTransformGroup);

    // A pane that stacks its own contents in the order they were added says
    // where in that order the overlay belongs. Everywhere else there is
    // nothing to go before, and the overlay is simply the last thing in.
    const before = site.overlayAnchor?.(pane);

    if (before?.parentElement === pane) pane.insertBefore(overlay, before);
    else pane.append(overlay);

    overlayFrame = positionedAncestor(overlay) ?? pane;

    buildOverlayTools(geometry);
    refreshCustomPoints();
  }

  function creditLink(href, label) {
    const link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = label;

    return link;
  }

  function buildAttribution(credits) {
    attribution = document.createElement("div");
    attribution.id = "stm-metro-attribution";
    attribution.dataset.stmSite = site.id;
    attribution.title = `Données ${new Intl.ListFormat("fr").format(
      credits.map(({ attribution: { label } }) => label)
    )}, adaptées pour cette extension non officielle.`;

    // Each operator beside the licence its own data came out under, rather
    // than one licence at the end standing in for all of them: two operators
    // on one map need not be publishing on the same terms.
    const parts = ["Données adaptées : "];

    for (const { attribution: credit } of credits) {
      if (parts.length > 1) parts.push(" · ");
      parts.push(
        creditLink(credit.terms, credit.label),
        " (",
        creditLink(credit.license.url, credit.license.label),
        ")"
      );
    }

    attribution.append(...parts);
    map.append(attribution);
  }

  function buildOverlayTools(geometry) {
    // Crediting an operator for a map drawing none of its lines would be an
    // odd thing to do, and the licence asks for the credit to travel with the
    // data rather than with the extension.
    if (geometry.credits.length) buildAttribution(geometry.credits);

    buildMapTools();

    if (settings.pointsTool) buildCustomPointPanel();
    if (settings.settingsShortcut) buildSettingsShortcut();
  }

  function tileCoordinatesFor(element) {
    const source = element.currentSrc || element.src;

    if (!source) return undefined;

    const entry = tileCoordinates.get(element);

    // Leaflet recycles its tile images, so parsed coordinates stay valid
    // until the source changes. Parsing once per load beats parsing every
    // tile on every rescan.
    if (entry?.source === source) return entry.coordinates;

    let coordinates = site.parseTile(source);

    if (
      coordinates &&
      ![coordinates.size, coordinates.x, coordinates.y, coordinates.z].every(
        Number.isFinite
      )
    ) {
      coordinates = undefined;
    }

    tileCoordinates.set(element, { coordinates, source });

    return coordinates;
  }

  function tileDetails() {
    if (anchorTile?.element.isConnected) {
      const container = anchorTile.element.parentElement;
      const opacity = container?.style.opacity ?? "";

      if (
        anchorTile.element.complete &&
        anchorTile.element.naturalWidth > 0 &&
        (opacity === "" || Number.parseFloat(opacity) > 0)
      ) {
        const rect = anchorTile.element.getBoundingClientRect();

        if (rect.width > 0 && rect.height > 0) {
          return { ...anchorTile, rect };
        }
      }
    }

    const containerStyles = new Map();
    const candidates = [];
    let index = 0;

    for (const element of map.querySelectorAll(site.tileSelector)) {
      index += 1;

      if (!element.complete || element.naturalWidth === 0) continue;

      const container = element.parentElement;

      if (!container) continue;

      let style = containerStyles.get(container);

      if (!style) {
        // Every tile of a zoom level shares one container, so this resolves
        // style two or three times per rescan instead of once per tile.
        const computed = getComputedStyle(container);

        style = {
          opacity: Number.parseFloat(computed.opacity) || 0,
          zIndex: Number.parseInt(computed.zIndex, 10) || 0
        };
        containerStyles.set(container, style);
      }

      if (style.opacity <= 0) continue;

      candidates.push({
        element,
        index,
        opacity: style.opacity,
        zIndex: style.zIndex
      });
    }

    candidates.sort(
      (left, right) =>
        right.zIndex - left.zIndex ||
        right.opacity - left.opacity ||
        right.index - left.index
    );

    // Only the winning tile gets measured, so a screenful of tiles costs one
    // layout read instead of one per tile.
    for (const candidate of candidates) {
      const coordinates = tileCoordinatesFor(candidate.element);

      if (!coordinates) continue;

      const rect = candidate.element.getBoundingClientRect();

      if (rect.width <= 0 || rect.height <= 0) continue;

      anchorTile = {
        element: candidate.element,
        size: coordinates.size,
        x: coordinates.x,
        y: coordinates.y,
        z: coordinates.z
      };

      return { ...anchorTile, rect };
    }

    anchorTile = undefined;

    return undefined;
  }

  // What both kinds of map come down to, and all the renderer below wants of
  // either: where the network's own origin lands inside the overlay's box, how
  // many screen pixels one of its units is worth, and the zoom that reading is
  // at. A projection that is missing is a map that cannot be drawn on yet; one
  // that is not level is a map that cannot be drawn on at all.
  function tileProjection(frameRect, mapRect) {
    const tile = tileDetails();

    if (!tile) return undefined;

    // Measured against the size the tile is served at, so a tile left over
    // from another zoom level anchors the overlay just as well as a current
    // one: it carries the zoom it was cut for, and its box carries how far it
    // has since been scaled.
    const tileScale = tile.rect.width / tile.size;
    const scale = tileScale * 2 ** (tile.z - NETWORK_ZOOM);
    const origin = getNetworkOrigin();
    // The tile's name says which cell of which zoom it is, and its box says
    // what fraction of that cell the middle of the map has landed on. Together
    // they put the viewport's centre on the grid without reference to any
    // city, which is what makes it something a city can be picked from.
    const acrossX =
      (mapRect.left + mapRect.width / 2 - tile.rect.left) / tile.rect.width;
    const acrossY =
      (mapRect.top + mapRect.height / 2 - tile.rect.top) / tile.rect.height;

    return {
      center: coordinatesAt(
        (tile.x + acrossX) * STM_TILE_SIZE,
        (tile.y + acrossY) * STM_TILE_SIZE,
        tile.z
      ),
      level: true,
      originX:
        tile.rect.left -
        frameRect.left +
        origin[0] * scale -
        tile.x * tile.size * tileScale,
      originY:
        tile.rect.top -
        frameRect.top +
        origin[1] * scale -
        tile.y * tile.size * tileScale,
      scale,
      zoom: tile.z + Math.log2(tileScale)
    };
  }

  // The same three things, but stated by the map itself through bridge.js
  // instead of worked out from a tile: where the anchor was projected to on
  // the canvas, and at what zoom. The anchor belongs to no city, so where the
  // network's own origin lands has to be stepped across to from it: the two
  // are a known distance apart in network units, and the scale turns that
  // distance into pixels.
  function cameraProjection(frameRect) {
    const value = document.documentElement.getAttribute(CAMERA_ATTRIBUTE);

    if (!value) return undefined;

    const [x, y, zoom, level] = value.split(" ").map(Number);

    if (![x, y, zoom].every(Number.isFinite)) return undefined;

    const surface = site.cameraSurface(map) ?? map;
    const rect = surface.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) return undefined;

    const scale = 2 ** (zoom - NETWORK_ZOOM);
    const anchor = getAnchorPoint();
    const origin = getNetworkOrigin();

    return {
      // Walking the same step the other way: the anchor sits at (x, y) on the
      // canvas and its world position is known outright, so the middle of the
      // canvas is one subtraction short of being a coordinate again.
      center: coordinatesAt(
        anchor[0] * scale + rect.width / 2 - x,
        anchor[1] * scale + rect.height / 2 - y,
        zoom
      ),
      level: level === 1,
      originX: rect.left - frameRect.left + x + (origin[0] - anchor[0]) * scale,
      originY: rect.top - frameRect.top + y + (origin[1] - anchor[1]) * scale,
      scale,
      zoom
    };
  }

  function worldPoint([longitude, latitude], zoom) {
    const scale = STM_TILE_SIZE * 2 ** zoom;
    const sine = Math.sin((latitude * Math.PI) / 180);

    return [
      ((longitude + 180) / 360) * scale,
      (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) *
        scale
    ];
  }

  // worldPoint() read backwards. Both kinds of map say where they are looking
  // in pixels on a grid rather than in degrees, and a city is chosen in
  // degrees.
  function coordinatesAt(x, y, zoom) {
    const scale = STM_TILE_SIZE * 2 ** zoom;

    return [
      (x / scale) * 360 - 180,
      (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / scale))) * 180) / Math.PI
    ];
  }

  function getNetworkOrigin() {
    return (networkOrigin ??= worldPoint(activeCity.origin, NETWORK_ZOOM));
  }

  function getAnchorPoint() {
    return (anchorPoint ??= worldPoint(ANCHOR_COORDINATES, NETWORK_ZOOM));
  }

  // Everything that was measured from the city just left behind: its origin,
  // the drawing made against that origin, and the file the drawing came from.
  function resetNetwork() {
    networkData = undefined;
    networkDataRequest = undefined;
    networkGeometry = undefined;
    networkOrigin = undefined;
    detach();
    detachStrip();
    scheduleSync();
  }

  // A map is only ever asked where it is looking, never which city it is in,
  // so a viewport out over the Atlantic names no city at all and whatever
  // network is already up stays up. A swap is a teardown: one city's drawing
  // cannot be reused as another's, because every coordinate in it is relative
  // to an origin that has just changed.
  function considerCity(coordinates) {
    const next = stmCityAt(coordinates);

    if (!next || next === activeCity) return false;

    activeCity = next;
    resetNetwork();

    return true;
  }

  function localPoint(coordinates) {
    const [worldX, worldY] = worldPoint(coordinates, NETWORK_ZOOM);
    const origin = getNetworkOrigin();

    return [worldX - origin[0], worldY - origin[1]];
  }

  // A geometry file is named for its city and says nothing else about it, so
  // the ids inside it are relative: "stm:1" rather than "montreal:stm:1".
  // Qualifying them once, on the way in, is what lets everything past here
  // deal in registry ids and nothing else.
  function qualifyNetwork(city, data) {
    return {
      lines: data.lines.map((line) => ({
        ...line,
        id: `${city.id}:${line.id}`
      })),
      stations: data.stations.map((station) => ({
        ...station,
        lines: station.lines.map((id) => `${city.id}:${id}`)
      }))
    };
  }

  function loadNetworkData() {
    const city = activeCity;

    networkDataRequest ??= fetch(chrome.runtime.getURL(city.data))
      .then((response) => response.json())
      .then((data) => {
        // The city can be swapped while this is in flight, and an answer about
        // the one just left behind is no answer about the one now drawn.
        if (city !== activeCity) return;

        networkData = qualifyNetwork(city, data);
        scheduleSync();
      })
      .catch(() => {
        // Let a later sync retry instead of leaving the overlay waiting on a
        // request that already failed.
        if (city === activeCity) networkDataRequest = undefined;
      });

    return networkDataRequest;
  }

  // The registry entry for a line that is going to be drawn, or nothing: a
  // line is drawn when the registry knows it and all three of its switches say
  // so. Data naming a line the registry has never heard of has no name, no
  // colour and no switch — the tests rule that out, and until one of them is
  // failing an overlay that goes up without that line beats one that does not
  // go up at all.
  function drawnLine(id) {
    const line = stmLineById(id);

    return line && stmIsLineEnabled(settings, id) ? line : undefined;
  }

  function getNetworkGeometry() {
    if (networkGeometry) return networkGeometry;

    // Switching every line off leaves nothing to project, and the origin is
    // seeded by projecting. Both renderers read it directly, so seed it here.
    getNetworkOrigin();

    const paths = [];
    // Which operators are actually on screen. The licence asks for the credit
    // to travel with the data rather than with the extension, so a map drawn
    // with every REM line switched off must not go on crediting the REM.
    const drawn = new Set();

    for (const line of networkData.lines) {
      const declared = drawnLine(line.id);

      if (!declared) continue;

      drawn.add(declared.systemId);

      for (const coordinates of line.paths) {
        const points = coordinates.map(localPoint);
        const bounds = {
          bottom: -Infinity,
          left: Infinity,
          right: -Infinity,
          top: Infinity
        };

        for (const [x, y] of points) {
          bounds.bottom = Math.max(bounds.bottom, y);
          bounds.left = Math.min(bounds.left, x);
          bounds.right = Math.max(bounds.right, x);
          bounds.top = Math.min(bounds.top, y);
        }

        paths.push({
          bounds,
          color: declared.color,
          path: points
            .map(
              ([x, y], index) =>
                `${index ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`
            )
            .join("")
        });
      }
    }

    const stations = settings.stations
      ? networkData.stations.filter(({ lines }) => lines.some(drawnLine))
      : [];

    for (const station of stations) {
      for (const id of station.lines) {
        const declared = drawnLine(id);

        if (declared) drawn.add(declared.systemId);
      }
    }

    networkGeometry = {
      // In the registry's order rather than the data's, so the credit line
      // reads the same way from one build to the next.
      credits: STM_SYSTEMS.filter(({ id }) => drawn.has(id)),
      paths,
      stations: stations.map((station) => ({
        name: station.name,
        point: localPoint(station.coordinates)
      }))
    };

    return networkGeometry;
  }

  // Our overlay is positioned, so it has to be mounted inside its own
  // containing block for left and top to mean what the rects say.
  function positionedAncestor(element) {
    for (
      let node = element.parentElement;
      node && node !== document.documentElement;
      node = node.parentElement
    ) {
      if (getComputedStyle(node).position !== "static") return node;
    }

    return undefined;
  }

  function setStyle(element, property, value) {
    // The observer below watches this subtree, and assigning a style property
    // records a mutation even when the value is identical. Reading first is
    // what keeps a render from scheduling the next one forever.
    if (element.style[property] !== value) element.style[property] = value;
  }

  function refreshStripPoints() {
    if (!stripPointGroup) return;

    stripPointGroup.replaceChildren();
    stripPointMarkers = [];

    if (!settings.points) return;

    for (const point of customPoints) {
      const marker = createSvgElement("circle", {
        fill: point.color,
        r: "4",
        stroke: "#ffffff",
        "stroke-width": "1.5"
      });

      stripPointGroup.append(marker);
      stripPointMarkers.push({ marker, point: localPoint(point.coordinates) });
    }
  }

  function buildStripOverlay(host) {
    const geometry = getNetworkGeometry();

    stripOverlay = createSvgElement("svg", {
      "aria-hidden": "true",
      class: "stm-static-overlay"
    });

    const haloGroup = createSvgElement("g", {
      fill: "none",
      stroke: "#ffffff",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-opacity": "0.85",
      "stroke-width": "3.5"
    });
    const lineGroup = createSvgElement("g", {
      fill: "none",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-width": "1.75"
    });

    for (const { color, path } of geometry.paths) {
      haloGroup.append(
        createSvgElement("path", {
          d: path,
          "vector-effect": "non-scaling-stroke"
        })
      );
      lineGroup.append(
        createSvgElement("path", {
          d: path,
          stroke: color,
          "vector-effect": "non-scaling-stroke"
        })
      );
    }

    // The strip is drawn at the zoom that fits a whole region into eighty
    // pixels. Ninety station dots at that size would swallow the lines they
    // sit on, so only the lines and the user's own points are worth drawing.
    stripLineGroup = createSvgElement("g", {});
    stripLineGroup.append(haloGroup, lineGroup);
    stripPointGroup = createSvgElement("g", {});

    stripOverlay.append(stripLineGroup, stripPointGroup);

    // Same as on the map: the credit rides with the lines, and a strip
    // showing only the user's own points has nothing to credit.
    if (geometry.credits.length) {
      stripCredit = createSvgElement("text", {
        "font-family": "Arial, sans-serif",
        "font-size": "8",
        "paint-order": "stroke",
        "stroke-linejoin": "round",
        "stroke-width": "2",
        x: "4"
      });
      stripCredit.textContent = geometry.credits
        .map(({ attribution: { label } }) => label)
        .join(" · ");
      stripOverlay.append(stripCredit);
    }

    host.append(stripOverlay);
  }

  function renderStrip() {
    stripRenderRequest = undefined;

    if (!strip?.isConnected || !stripOverlay?.isConnected) {
      scheduleSync();
      return;
    }

    const details = site.stripDetails(strip);

    if (!details) {
      detachStrip();
      return;
    }

    const hostRect = stripOverlay.parentElement.getBoundingClientRect();
    const stripRect = strip.getBoundingClientRect();

    if (!stripRect.width || !stripRect.height) return;

    const left = stripRect.left - hostRect.left;
    const top = stripRect.top - hostRect.top;

    setStyle(stripOverlay, "left", `${left.toFixed(2)}px`);
    setStyle(stripOverlay, "top", `${top.toFixed(2)}px`);
    setStyle(stripOverlay, "width", `${stripRect.width.toFixed(2)}px`);
    setStyle(stripOverlay, "height", `${stripRect.height.toFixed(2)}px`);

    // Projecting the network is what seeds networkOrigin, and the arithmetic
    // below reads it directly.
    getNetworkGeometry();

    // background-size is 100% 100%, so the raster is stretched to the box and
    // each axis carries its own scale. One shared factor would shear the
    // network off the streets it is supposed to sit on.
    const zoomScale = 2 ** (details.zoom - NETWORK_ZOOM);
    const scaleX = (stripRect.width / details.width) * zoomScale;
    const scaleY = (stripRect.height / details.height) * zoomScale;
    const center = worldPoint(details.center, details.zoom);
    const originX =
      (networkOrigin[0] * zoomScale - center[0]) *
        (stripRect.width / details.width) +
      stripRect.width / 2;
    const originY =
      (networkOrigin[1] * zoomScale - center[1]) *
        (stripRect.height / details.height) +
      stripRect.height / 2;

    stripLineGroup.setAttribute(
      "transform",
      `matrix(${scaleX} 0 0 ${scaleY} ${originX.toFixed(2)} ${originY.toFixed(
        2
      )})`
    );
    stripPointGroup.setAttribute(
      "transform",
      `translate(${originX.toFixed(2)} ${originY.toFixed(2)})`
    );

    for (const { marker, point } of stripPointMarkers) {
      marker.setAttribute("cx", (point[0] * scaleX).toFixed(1));
      marker.setAttribute("cy", (point[1] * scaleY).toFixed(1));
    }

    if (stripCredit) {
      stripCredit.setAttribute("fill", details.dark ? "#ffffff" : "#202124");
      stripCredit.setAttribute(
        "stroke",
        details.dark ? "#00000080" : "#ffffffcc"
      );
      stripCredit.setAttribute("y", (stripRect.height - 4).toFixed(1));
    }
  }

  function scheduleStripRender() {
    // A site with no strip, or one whose strip has not landed yet, has nothing
    // to render; renderStrip() reads a missing overlay as a wiped one and
    // would ask for a sync it does not need.
    if (!strip) return;

    stripRenderRequest ??= requestAnimationFrame(renderStrip);
  }

  function detachStrip() {
    stripObserver?.disconnect();
    stripResizeObserver?.disconnect();
    cancelAnimationFrame(stripRenderRequest);
    stripOverlay?.remove();

    strip = undefined;
    stripOverlay = undefined;
    stripLineGroup = undefined;
    stripPointGroup = undefined;
    stripCredit = undefined;
    stripPointMarkers = [];
    stripObserver = undefined;
    stripResizeObserver = undefined;
    stripRenderRequest = undefined;
  }

  function syncStrip() {
    const next = document.querySelector(site.stripSelector);
    const details = next && site.stripDetails(next);

    if (!details) {
      detachStrip();
      return;
    }

    // The strip names the listing's own coordinates outright, which is the
    // only thing on a listing page saying where in the world it is until the
    // map behind it is opened. Asked before the geometry below is looked at,
    // because a listing in one city is exactly how the network of another
    // ends up being the wrong one to have built.
    //
    // It answers only while there is no map: on a page with both, the two
    // describe the same place, and letting either one answer is how they
    // would end up swapping the city back and forth if they ever disagreed.
    if (!map && considerCity(details.center)) return;

    const geometry = getNetworkGeometry();

    // The sidebar re-renders often enough that watching it is worth doing
    // only for an overlay that has something in it.
    if (!geometry.paths.length && !(settings.points && customPoints.length)) {
      detachStrip();
      return;
    }

    if (next === strip && stripOverlay?.isConnected) {
      scheduleStripRender();
      return;
    }

    detachStrip();

    const host = positionedAncestor(next);

    if (!host) return;

    strip = next;
    buildStripOverlay(host);
    refreshStripPoints();

    stripResizeObserver = new ResizeObserver(scheduleStripRender);
    stripResizeObserver.observe(strip);

    // Marketplace re-renders the sidebar in place, which can swap the strip
    // out from under us or drop what we appended beside it. This box holds a
    // handful of nodes, so watching it costs nothing next to the page-wide
    // observer, and it keeps working after that one has been disconnected.
    stripObserver = new MutationObserver((records) => {
      for (const record of records) {
        if (stripOverlay?.contains(record.target)) continue;

        scheduleStripRender();
        return;
      }
    });
    stripObserver.observe(host, {
      attributeFilter: ["style"],
      attributes: true,
      childList: true,
      subtree: true
    });

    scheduleStripRender();
  }

  function render() {
    renderRequest = undefined;

    if (!map?.isConnected || !overlay?.isConnected) {
      scheduleSync();
      return;
    }

    // Every layout read is taken before the first attribute write. Reading a
    // rect after a write forces a second layout pass, and on a page the size
    // of Marketplace that pass is what a dropped frame is made of.
    const paneRect = overlayFrame.getBoundingClientRect();
    const mapRect = map.getBoundingClientRect();
    const projection = site.camera
      ? cameraProjection(paneRect)
      : tileProjection(paneRect, mapRect);

    // A map that has been turned or tilted has no projection this overlay can
    // follow, so the network comes off it rather than being drawn at an angle
    // the map is not at. It comes back by itself: the bridge keeps reporting,
    // and the first level reading puts the network back.
    //
    // No projection at all is a different thing and not answered here. A zoom
    // animation can outlive the tiles it started from, and the drawing already
    // on the map is a better answer for those few frames than no drawing.
    if (projection && projection.level !== overlayDrawable) {
      overlayDrawable = projection.level;
      setStyle(overlay, "display", projection.level ? "" : "none");
    }

    if (!projection?.level) {
      // Keep the loop alive so the overlay catches up as soon as there is
      // something to project from again.
      if (activeTransitions.size) renderRequest = requestAnimationFrame(render);
      return;
    }

    // Which metro area this map is over, asked on every frame because panning
    // is how a map arrives in another one, and only ever off a level
    // projection: the centre is recovered by stepping out from the anchor
    // along the world's own axes, and on a map that has been turned those are
    // not the screen's. A swap tears the overlay down and builds it again
    // around the new city's origin, so there is nothing left here to draw into.
    if (considerCity(projection.center)) return;

    const {
      originX,
      originY,
      scale: geometryScale,
      zoom: effectiveZoom
    } = projection;
    const labelsVisible =
      settings.stationLabels && effectiveZoom >= LABEL_MIN_ZOOM;
    const scaleChanged = geometryScale !== renderedScale;
    const originMoved =
      renderedOriginX === undefined ||
      Math.abs(originX - renderedOriginX) > ORIGIN_EPSILON ||
      Math.abs(originY - renderedOriginY) > ORIGIN_EPSILON;

    // Dragging moves the tile pane and the overlay pane as one, so the
    // projection is unchanged and every write below would repaint the whole
    // overlay for nothing. Only the culling further down still has work.
    if (scaleChanged || originMoved) {
      renderedOriginX = originX;
      renderedOriginY = originY;

      const translate = `translate(${originX.toFixed(2)} ${originY.toFixed(
        2
      )})`;

      lineTransformGroup.setAttribute(
        "transform",
        `matrix(${geometryScale} 0 0 ${geometryScale} ${originX.toFixed(
          2
        )} ${originY.toFixed(2)})`
      );
      stationTransformGroup.setAttribute("transform", translate);
      customPointTransformGroup.setAttribute("transform", translate);
    }

    if (scaleChanged) {
      renderedScale = geometryScale;
      customPointsDirty = true;

      for (const station of stationMarkers) {
        station.x = station.point[0] * geometryScale;
        station.y = station.point[1] * geometryScale;
        station.placed = false;
      }
    }

    if (labelsVisible !== stationLabelsVisible) {
      stationLabelsVisible = labelsVisible;
      stationLabelGroup.setAttribute(
        "display",
        labelsVisible ? "inline" : "none"
      );

      // Labels skip their coordinates while the group is hidden, so they all
      // need one placement pass before they can be shown again.
      if (labelsVisible) {
        for (const station of stationMarkers) station.placed = false;
      }
    }

    const visibleLeft = mapRect.left - paneRect.left;
    const visibleTop = mapRect.top - paneRect.top;
    const visibleRight = mapRect.right - paneRect.left;
    const visibleBottom = mapRect.bottom - paneRect.top;
    let networkIsVisible = false;

    for (const path of linePaths) {
      const left = originX + path.bounds.left * geometryScale;
      const top = originY + path.bounds.top * geometryScale;
      const right = originX + path.bounds.right * geometryScale;
      const bottom = originY + path.bounds.bottom * geometryScale;
      const visible =
        right >= visibleLeft &&
        left <= visibleRight &&
        bottom >= visibleTop &&
        top <= visibleBottom;

      if (visible !== path.visible) {
        path.visible = visible;
        path.halo.setAttribute("display", visible ? "inline" : "none");
        path.route.setAttribute("display", visible ? "inline" : "none");
      }

      networkIsVisible ||= visible;
    }

    networkGroup.setAttribute("display", networkIsVisible ? "inline" : "none");
    // With every line switched off there is no network that could be off
    // screen, and the notice would be answering a question nobody asked.
    setNetworkState(
      networkIsVisible || !linePaths.length ? "visible" : "outside"
    );

    if (networkIsVisible) {
      const cullLeft = visibleLeft - STATION_CULL_MARGIN;
      const cullTop = visibleTop - STATION_CULL_MARGIN;
      const cullRight = visibleRight + STATION_CULL_MARGIN;
      const cullBottom = visibleBottom + STATION_CULL_MARGIN;

      for (const station of stationMarkers) {
        const x = originX + station.x;
        const y = originY + station.y;
        const visible =
          x >= cullLeft && x <= cullRight && y >= cullTop && y <= cullBottom;

        if (visible !== station.visible) {
          station.visible = visible;

          const display = visible ? "inline" : "none";

          station.marker.setAttribute("display", display);
          station.label?.setAttribute("display", display);
        }

        // Coordinates live in the translated group, so they only go stale
        // when the zoom scale changed under them. Most of the ninety
        // stations are off screen anyway, and their labels are hidden
        // outright below zoom 13.
        if (!visible || station.placed) continue;

        station.placed = true;
        station.marker.setAttribute("cx", station.x.toFixed(1));
        station.marker.setAttribute("cy", station.y.toFixed(1));

        if (labelsVisible) {
          station.label.setAttribute("x", (station.x + 8).toFixed(1));
          station.label.setAttribute("y", (station.y - 8).toFixed(1));
        }
      }
    }

    if (customPointsDirty) {
      customPointsDirty = false;

      for (const { label, marker, point } of customPointMarkers) {
        const x = point[0] * geometryScale;
        const y = point[1] * geometryScale;

        marker.setAttribute("cx", x.toFixed(1));
        marker.setAttribute("cy", y.toFixed(1));
        label.setAttribute("x", (x + 10).toFixed(1));
        label.setAttribute("y", (y + 4).toFixed(1));
      }
    }

    if (activeTransitions.size) {
      const now = performance.now();

      for (const [target, started] of activeTransitions) {
        // A transition whose end event never arrives would otherwise pin the
        // render loop at full frame rate for the life of the page.
        if (now - started > TRANSITION_TIMEOUT || !map.contains(target)) {
          activeTransitions.delete(target);
        }
      }
    }

    // Either a transition that has not reported its end yet, or a map that
    // never reports anything and is still inside its settling window.
    if (activeTransitions.size || performance.now() < renderUntil) {
      renderRequest = requestAnimationFrame(render);
    }
  }

  function scheduleRender() {
    renderRequest ??= requestAnimationFrame(render);
  }

  // Google moves and zooms its map from a frame loop of its own, and there is
  // no event to say it has stopped. Rather than guess at the animation, the
  // overlay keeps redrawing for a moment past the last thing the map was seen
  // doing. On a site whose animations announce themselves the window is zero,
  // and this is scheduleRender() with extra steps.
  function keepRendering() {
    if (site.settleMs) {
      renderUntil = Math.max(renderUntil, performance.now() + site.settleMs);
    }

    scheduleRender();
  }

  // Our own writes land inside the map, and a settling window fed by them
  // would never close.
  function ownNode(node) {
    return Boolean(
      overlay?.contains(node) ||
        mapTools?.contains(node) ||
        attribution?.contains(node)
    );
  }

  // Everything we hang off the map, and whether it is all still hanging
  // there. The attribution only goes up when there is network data to credit,
  // so an absent one is not the same thing as a wiped one.
  function overlayIsIntact() {
    return Boolean(
      overlay?.isConnected &&
      mapTools?.isConnected &&
      (!attribution || attribution.isConnected)
    );
  }

  function detach() {
    mapObserver?.disconnect();
    resizeObserver?.disconnect();
    cameraObserver?.disconnect();
    eventController?.abort();
    activeTransitions.clear();
    cancelAnimationFrame(renderRequest);
    overlay?.remove();
    attribution?.remove();
    mapTools?.remove();

    map = undefined;
    overlay = undefined;
    networkGroup = undefined;
    attribution = undefined;
    mapTools = undefined;
    networkStatus = undefined;
    networkStatusText = undefined;
    cityShortcuts = undefined;
    networkState = undefined;
    customPanel = undefined;
    customPointGroup = undefined;
    customPointList = undefined;
    customPointMarkers = [];
    mapObserver = undefined;
    resizeObserver = undefined;
    cameraObserver = undefined;
    eventController = undefined;
    renderRequest = undefined;
    renderUntil = 0;
    anchorTile = undefined;
    overlayFrame = undefined;
    overlayDrawable = undefined;
    lineTransformGroup = undefined;
    stationTransformGroup = undefined;
    customPointTransformGroup = undefined;
    renderedOriginX = undefined;
    renderedOriginY = undefined;
    renderedScale = undefined;
    customPointsDirty = true;
    linePaths = [];
    stationMarkers = [];
    stationLabelGroup = undefined;
    stationLabelsVisible = undefined;
  }

  function attach(nextMap) {
    detach();
    map = nextMap;
    buildOverlay();

    eventController = new AbortController();
    const eventOptions = {
      capture: true,
      passive: true,
      signal: eventController.signal
    };
    const renderDrag = (event) => {
      if (event.buttons) keepRendering();
    };
    const renderTileLoad = (event) => {
      // Any painted tile anchors the overlay equally well, so a freshly
      // loaded one is no reason to rescan; tileDetails() drops the anchor by
      // itself once it stops being usable.
      if (!event.target.matches?.(site.tileSelector)) return;
      scheduleRender();
    };
    const trackTransition = (event) => {
      // Leaflet zooms one known pane and announces both ends of it, so the
      // transitions worth waiting on can be named exactly. A site that does
      // not say where its zoom happens is tracked by its settling window
      // instead: watching every transform inside the map would pin the render
      // loop at full frame rate for any hover effect the site happens to have.
      if (
        !site.tilePaneSelector ||
        event.propertyName !== "transform" ||
        !event.target.closest?.(site.tilePaneSelector)
      ) {
        return;
      }

      activeTransitions.set(event.target, performance.now());
      scheduleRender();
    };
    const finishTransition = (event) => {
      if (event.propertyName !== "transform") return;
      if (!activeTransitions.delete(event.target)) return;
      scheduleRender();
    };

    map.addEventListener("pointermove", renderDrag, eventOptions);
    map.addEventListener("pointerup", keepRendering, eventOptions);
    map.addEventListener("touchmove", keepRendering, eventOptions);
    map.addEventListener("wheel", keepRendering, eventOptions);
    map.addEventListener("transitionrun", trackTransition, eventOptions);
    map.addEventListener("transitionend", finishTransition, eventOptions);
    map.addEventListener("transitioncancel", finishTransition, eventOptions);

    // A map with tiles announces a fresh one by loading it, and a map without
    // them has nothing to say here that the selector could even be matched
    // against.
    if (site.tileSelector) {
      map.addEventListener("load", renderTileLoad, eventOptions);
    }

    // The projection arriving is the only thing that moves a camera map under
    // the overlay, and it covers the moves no pointer event would have
    // announced: the zoom buttons, and the flight the widget makes on its own
    // when a category is picked.
    if (site.camera) {
      cameraObserver = new MutationObserver(keepRendering);
      cameraObserver.observe(document.documentElement, {
        attributeFilter: [CAMERA_ATTRIBUTE],
        attributes: true
      });
    }

    mapObserver = new MutationObserver((records) => {
      if (location.pathname !== observedPathname) {
        scheduleRouteSync();
        return;
      }

      // Marketplace re-renders can wipe the nodes we appended to the map.
      // Watching for that here is what lets the document-wide observer stay
      // disconnected while the overlay is up.
      if (!overlayIsIntact()) {
        scheduleSync();
        return;
      }

      let moved = false;

      for (const record of records) {
        if (ownNode(record.target)) continue;

        moved = true;

        // Only the anchor being re-pointed at another tile matters here.
        // Removal, fade-out and failed loads are all caught by the checks in
        // tileDetails(), so panning no longer forces a full rescan.
        if (
          anchorTile &&
          record.attributeName === "src" &&
          record.target === anchorTile.element
        ) {
          anchorTile = undefined;
          break;
        }
      }

      // The map moving under us is the one thing that reliably shows up here
      // on every site, which is what a map with no events of its own is left
      // to be tracked by.
      if (moved) keepRendering();
    });
    mapObserver.observe(map, {
      attributes: true,
      attributeFilter: ["class", "src", "style"],
      childList: true,
      subtree: true
    });

    resizeObserver = new ResizeObserver(([entry]) => {
      // The popup map is a third the height of the one on a category page,
      // and the panel has to cap itself against that rather than the viewport
      // or it opens straight through the bottom of a map that clips it.
      mapTools?.style.setProperty(
        "--stm-map-height",
        `${entry.contentRect.height}px`
      );
      scheduleRender();
      if (!entry.contentRect.width || !entry.contentRect.height) {
        scheduleSync();
      }
    });
    resizeObserver.observe(map);
    scheduleRender();
  }

  function sync() {
    if (!enabled) return;

    observedPathname = location.pathname;

    const overlayPage = isOverlayPage();
    const wantsMap = overlayPage && settings.interactiveMaps;
    // A Centris listing has no static preview to draw on: the map in its
    // "Localisation" section is a live one, and it arrives in a frame of its
    // own where this script runs again as the Local Logic adapter.
    const wantsStrip =
      overlayPage && settings.listingPreview && Boolean(site.stripSelector);
    const nextMap = wantsMap ? site.findMap() : undefined;

    // The strip has no Leaflet DOM to hang off, so it comes and goes on its
    // own rather than with the interactive map the listing hides behind it.
    if (!wantsStrip || !networkData) detachStrip();
    else syncStrip();

    if (!nextMap) {
      if (map) detach();

      // Only hunt through the document while a page could plausibly grow a
      // map. Everywhere else the observer would just be taxing the feed.
      //
      // A listing renders its strip in its own time, so the hunt runs until
      // that lands. After it does, the popup map is the only thing left to
      // wait for, and the animation detector already catches that one — which
      // matters here, because a listing page carries a feed of its own.
      if (
        (wantsMap || wantsStrip) &&
        (!networkData ||
          (wantsMap && site.huntsForMap && site.isCategoryPage()) ||
          (wantsStrip && !strip))
      ) {
        connectPageObserver();
      } else {
        disconnectPageObserver();
      }

      if ((wantsMap || wantsStrip) && !networkData) loadNetworkData();

      return;
    }

    if (!networkData) {
      // A failed data load leaves nothing else to retrigger it, so stay
      // connected until the network data is actually in hand.
      connectPageObserver();
      loadNetworkData();
      return;
    }

    disconnectPageObserver();

    if (nextMap !== map || !overlayIsIntact()) attach(nextMap);
  }

  let syncRequest;
  const scheduleSync = () => {
    if (syncRequest) return;

    syncRequest = requestAnimationFrame(() => {
      syncRequest = undefined;
      sync();
    });
  };

  function scheduleRouteSync() {
    if (location.pathname === observedPathname) return;
    observedPathname = location.pathname;
    scheduleSync();
  }

  function observePage(records) {
    if (location.pathname !== observedPathname) {
      scheduleRouteSync();
      return;
    }

    for (const record of records) {
      for (const node of record.addedNodes) {
        if (
          node.nodeType === Node.ELEMENT_NODE &&
          (node.matches(PAGE_SELECTOR) || node.querySelector(PAGE_SELECTOR))
        ) {
          scheduleSync();
          return;
        }
      }
    }
  }

  function connectPageObserver() {
    if (pageObserver) return;

    pageObserver = new MutationObserver(observePage);
    pageObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function disconnectPageObserver() {
    pageObserver?.disconnect();
    pageObserver = undefined;
  }

  function detectMap(event) {
    // content.css hangs a no-op animation off the Leaflet panes, so the
    // browser tells us when one is inserted. Marketplace rewrites its feed on
    // every scroll, and making it build a MutationRecord for each of those
    // rewrites just to notice a map is what made the whole page feel heavy.
    if (event.animationName === MAP_DETECT_ANIMATION) scheduleSync();
  }

  // content.css hangs the map-detect animation off these two, so the rule
  // only starts matching once the extension is on and this site is one the
  // user still wants it on. A site switched off in the settings never has the
  // animation run for it at all, rather than running it and syncing to
  // nothing.
  function paintDetectAttributes() {
    const root = document.documentElement;
    const wanted = settings.sites[SITE_SWITCH] !== false;

    root.setAttribute(ENABLED_ATTRIBUTE, "");

    if (wanted) root.setAttribute(SITE_ATTRIBUTE, site.id);
    else root.removeAttribute(SITE_ATTRIBUTE);

    // The anchor is the whole of what the page world is ever asked for, and
    // asking is all it takes: bridge.js does nothing at all until the
    // coordinates it should project are sitting here, and lets go of the map
    // again the moment they are taken away. It is the same coordinate on every
    // page and never changes, which is what keeps the city out of it: a map
    // has to be projected before it can say which city it is showing.
    if (!site.camera) return;

    if (wanted) {
      root.setAttribute(ANCHOR_ATTRIBUTE, ANCHOR_COORDINATES.join(" "));
    } else {
      root.removeAttribute(ANCHOR_ATTRIBUTE);
    }
  }

  function activate() {
    if (pageController) return;

    pageController = new AbortController();
    const listenerOptions = { signal: pageController.signal };

    addEventListener("animationstart", detectMap, {
      capture: true,
      passive: true,
      signal: pageController.signal
    });
    addEventListener("popstate", scheduleRouteSync, listenerOptions);
    globalThis.navigation?.addEventListener(
      "currententrychange",
      scheduleRouteSync,
      listenerOptions
    );

    paintDetectAttributes();
    scheduleSync();
  }

  function deactivate() {
    pageController?.abort();
    pageController = undefined;
    document.documentElement.removeAttribute(ENABLED_ATTRIBUTE);
    document.documentElement.removeAttribute(SITE_ATTRIBUTE);
    document.documentElement.removeAttribute(ANCHOR_ATTRIBUTE);

    cancelAnimationFrame(syncRequest);
    syncRequest = undefined;

    detach();
    detachStrip();
    disconnectPageObserver();
  }

  function applySettings(stored) {
    settings = stmMergeSettings(stored);
    if (enabled) paintDetectAttributes();
    // The geometry is filtered by the line switches on the way in, and the
    // overlay is built once from what comes out, so both are thrown away and
    // the next sync puts them back the way the new settings ask for.
    networkGeometry = undefined;
    detach();
    detachStrip();
    scheduleSync();
  }

  function setEnabled(next) {
    if (next === enabled) return;
    enabled = next;

    if (enabled) activate();
    else deactivate();
  }

  function init() {
    // Injected by host match, so a page with no adapter means the manifest
    // and sites.js have drifted apart. Nothing below would know what to look
    // for on it.
    if (!site) return;

    // The one listener that outlives the toggle. Everything else hangs off
    // activate(), but a switched-off tab still needs a way to hear that it
    // has been switched back on.
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;

      if (changes[STM_SETTINGS_KEY]) {
        applySettings(changes[STM_SETTINGS_KEY].newValue);
      }

      if (changes[STM_CUSTOM_POINTS_KEY]) {
        customPoints = changes[STM_CUSTOM_POINTS_KEY].newValue ?? [];
        refreshCustomPoints();
        scheduleRender();
      }

      if (changes[STM_ENABLED_KEY]) {
        setEnabled(changes[STM_ENABLED_KEY].newValue ?? true);
      }
    });

    customPointsReady = chrome.storage.local
      .get([STM_CUSTOM_POINTS_KEY, STM_ENABLED_KEY, STM_SETTINGS_KEY])
      .then((stored) => {
        // Settings first: the refresh below and everything activate() starts
        // read them, and the defaults are only a stand-in until this lands.
        settings = stmMergeSettings(stored[STM_SETTINGS_KEY]);
        customPoints = stored[STM_CUSTOM_POINTS_KEY] ?? [];
        refreshCustomPoints();
        setEnabled(stored[STM_ENABLED_KEY] ?? true);
      });
  }

  init();
})();
