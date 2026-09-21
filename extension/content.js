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
  // The two boxes of the site's own that the listings button takes hold of:
  // the column the map sits in, and the row it shares with the listings. They
  // are marked rather than styled, and content.css does the hiding, so that a
  // listings column the site swaps in under the same row is hidden as well —
  // it is everything in the row but the map's own column.
  const MAP_COLUMN_ATTRIBUTE = "data-stm-map-column";
  const HIDE_LISTINGS_ATTRIBUTE = "data-stm-hide-listings";
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
  let networkStatusAction;
  let cityPicker;
  let cityPickerButton;
  let cityPickerName;
  let cityPickerPanel;
  let networkState;
  let linePicker;
  let linePickerButton;
  let linePickerCount;
  let linePickerPanel;
  // Which of the two panels is open, if either. They are one question in two
  // halves — which city, then which of its lines — and they sit one directly
  // above the other, so only ever one of them is: the popup map beside a
  // Centris listing has nothing like the height for both, and on any map a
  // second panel opening below the first pushes the rest of the column off the
  // bottom of it.
  //
  // Kept out here because it is the one piece of the column that has to
  // survive the column: throwing a switch inside either panel writes the
  // settings, and a settings change that took the panel down with it would
  // shut it in the face of whoever was using it.
  let openPicker;
  let listingsToggle;
  // The map's column and the row it shares with the listings, as the adapter
  // found them beside this map.
  let listingsLayout;
  // Whether the listings are hidden. Kept out here for the same reason as
  // openPicker: the overlay is rebuilt under it whenever the site redraws the
  // map, and listings that came back every time it did would be the button
  // forgetting what it was just asked. Storage carries it on to the next page.
  let listingsHidden = false;
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
  let haloGroup;
  let lineGroup;
  let stationGroup;
  let networkData;
  // Every city's geometry that has been fetched in this page's lifetime, and
  // whichever fetches are still out, both by city id. A map wandering back
  // into a city it has already drawn puts the network up in the same frame,
  // which is the difference between a swap that reads as a swap and one that
  // reads as the overlay having given up and needing a reload.
  const networkCache = new Map();
  const networkRequests = new Map();
  // The city whose last fetch failed, so the notice can offer to ask again.
  // Nothing else on the page ever would: the map is already where it was sent,
  // and a city does not change under a map that has stopped moving.
  let networkFailure;
  // Which city's geometry is actually drawn, by the data it was drawn from.
  // That is what tells an overlay that is merely up from one that is up and
  // current, and it is how the drawing catches up with a fetch that landed
  // after the overlay went on the map.
  let drawnFrom;
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
  // The map's drawnFrom, for the strip: which city's geometry the little
  // raster beside the address was drawn with, so the strip catches up with a
  // fetch the same way the map does.
  let stripDrawnFrom;
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

  // The settings page and the panel on the map are two views of one stored
  // object, so neither of them writes a copy of its own: the patch is merged
  // over the settings in hand and the storage listener hands the result back
  // to both, in this tab and in every other one. The maps inside the settings
  // are merged a level deeper, or a patch naming one city would take the rest
  // of them away.
  async function saveSettings(patch) {
    // Applied here as well as written, so that a second switch thrown before
    // the first write has come back round through storage is merged over the
    // first rather than over whatever was there before it.
    settings = {
      ...settings,
      ...patch,
      cities: { ...settings.cities, ...patch.cities },
      lines: { ...settings.lines, ...patch.lines },
      systems: { ...settings.systems, ...patch.systems }
    };

    await chrome.storage.local.set({ [STM_SETTINGS_KEY]: settings });
  }

  // What the overlay is doing about the city it is on. "visible" is the only
  // one with nothing to say — the network is drawn and on screen — and the
  // notice is hidden for it; the other three are the swap, and being able to
  // see them happen is the whole point of saying them out loud.
  function setNetworkState(state, force = false) {
    if (state === networkState && !force) return;

    networkState = state;
    paintNetworkState();
  }

  // What the state would be for a column of tools that has just been built and
  // has not seen the render loop yet. The loop corrects it on the next frame;
  // this is only so the notice never opens on "loading" for a city whose
  // geometry has been in hand since the last map.
  function currentNetworkState() {
    if (networkData) return "visible";
    if (networkFailure === activeCity.id) return "failed";

    return "loading";
  }

  // Both places the overlay says where it is: the notice, which has the words,
  // and the picker's button, which carries the city's name and a dot for the
  // rest. Either can be switched off, and neither needs the other to be right.
  function paintNetworkState() {
    const state = networkState ?? "loading";
    const city = stmText(`city.${activeCity.id}.name`);

    if (cityPicker) {
      cityPicker.dataset.stmState = state;
      cityPickerName.textContent = city;
      cityPickerButton.title = stmText("map.cityPicker", { city });
      cityPickerButton.setAttribute(
        "aria-label",
        stmText("map.cityPicker", { city })
      );
    }

    if (!networkStatus) return;

    if (state === "visible") {
      networkStatus.hidden = true;
      return;
    }

    networkStatus.hidden = false;
    networkStatusAction.hidden = state !== "failed";
    networkStatusText.textContent =
      state === "failed"
        ? stmText("map.failed", { city })
        : state === "outside"
          ? stmText("map.offNetwork", { city })
          : stmText("map.loading", { city });
  }

  function buildNetworkStatus() {
    networkStatus = document.createElement("div");
    networkStatus.id = "stm-network-status";

    // The message is the part that changes on its own, so it is the part that
    // announces itself. The button beside it is a control, and it is shown and
    // hidden with the state: inside the live region that would be read out as
    // news every time the map wandered off the network.
    networkStatusText = document.createElement("span");
    networkStatusText.setAttribute("role", "status");
    networkStatusText.setAttribute("aria-live", "polite");

    // A load that failed has nowhere else to be retried from. Nothing on the
    // page asks again by itself, and the city will not change under a map
    // that is already where it was sent, so without this the overlay is
    // waiting on a request that was given up on and a reload is the only way
    // out — which is exactly what this notice exists to make unnecessary.
    networkStatusAction = document.createElement("button");
    networkStatusAction.type = "button";
    networkStatusAction.textContent = stmText("map.retry");
    networkStatusAction.hidden = true;
    networkStatusAction.addEventListener("click", () => {
      networkFailure = undefined;
      setNetworkState("loading", true);
      loadNetworkData();
    });

    networkStatus.append(networkStatusText, networkStatusAction);
    mapTools.append(networkStatus);
  }

  // Opening one panel shuts the other, and a button pressed twice shuts its
  // own. Either panel can be switched off on the settings page, so neither is
  // assumed to be there.
  function showPicker(name) {
    openPicker = openPicker === name ? undefined : name;
    paintPickers();
  }

  // Both buttons and both panels agree with the one piece of state, whether
  // they were just built or a press has moved it.
  function paintPickers() {
    for (const [name, button, panel] of [
      ["city", cityPickerButton, cityPickerPanel],
      ["line", linePickerButton, linePickerPanel]
    ]) {
      if (!panel) continue;

      panel.hidden = openPicker !== name;
      button.setAttribute("aria-expanded", String(openPicker === name));
    }
  }

  // Which city the overlay is on, and which of the others it could be on, in
  // the corner of the map rather than two clicks away on the settings page.
  // The button alone is worth the room: a map that swaps its network as it
  // pans has to be able to say which one it swapped to.
  function buildCityPicker() {
    cityPicker = document.createElement("div");
    cityPicker.id = "stm-city-picker";

    cityPickerButton = document.createElement("button");
    cityPickerButton.type = "button";
    cityPickerButton.className = "stm-tool-button";
    cityPickerButton.setAttribute("aria-controls", "stm-city-panel");

    // The state, for anyone reading the column rather than the notice under
    // it. It is named by the notice in words, so here it is decoration.
    const dot = document.createElement("span");
    dot.className = "stm-city-dot";
    dot.setAttribute("aria-hidden", "true");

    cityPickerName = document.createElement("span");
    cityPickerName.className = "stm-city-current";

    const chevron = document.createElement("span");
    chevron.className = "stm-tool-chevron";
    chevron.setAttribute("aria-hidden", "true");

    cityPickerButton.append(dot, cityPickerName, chevron);

    cityPickerPanel = document.createElement("div");
    cityPickerPanel.id = "stm-city-panel";
    cityPickerPanel.className = "stm-tool-panel";

    cityPickerButton.addEventListener("click", () => showPicker("city"));

    cityPicker.append(cityPickerButton, cityPickerPanel);
    mapTools.append(cityPicker);

    renderCityPicker();
    paintPickers();
  }

  // One row per city, under the country it is in. The switch is the same one
  // the settings page shows, written to the same place, and the row around it
  // is its label: the city's name is what anyone reaches for, and the box
  // beside it is a dozen pixels square.
  //
  // The switches are a choice between cities rather than a row of independent
  // ones: the map draws a single city, so the one switched on is the one that
  // draws and the rest go off with it. Unchecking the one that is on is still
  // allowed, and leaves a map with no network drawn on it at all.
  //
  // Wherever the site's own routing names the city and can therefore be
  // rewritten, the row ends in a button that goes there, kept outside the
  // label as the one part of the row where a click is not the switch. A
  // Centris search is an opaque payload with no city in it to swap, and there
  // the row is the switch and nothing more.
  function cityPickerRow(city) {
    const name = stmText(`city.${city.id}.name`);
    const current = city === activeCity;

    const row = document.createElement("div");
    row.className = "stm-city-row";

    if (current) row.dataset.stmCurrent = "";

    const label = document.createElement("label");
    label.className = "stm-city-label";

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.checked = settings.cities[city.id] !== false;
    toggle.dataset.stmKey = `city:${city.id}`;
    toggle.setAttribute("aria-label", stmText("map.cityToggle", { city: name }));
    toggle.addEventListener("change", () => {
      saveSettings({
        cities: stmOnlyCity(toggle.checked ? city.id : undefined)
      });
    });

    const cityName = document.createElement("span");
    cityName.className = "stm-city-name";
    cityName.textContent = name;

    label.append(toggle, cityName);

    if (current) {
      const here = document.createElement("span");
      here.className = "stm-city-here";
      here.textContent = stmText("map.here");
      label.append(here);
    }

    row.append(label);

    if (!current && site.shortcut?.applies(city)) {
      const go = document.createElement("button");
      go.type = "button";
      go.className = "stm-city-go";
      go.dataset.stmKey = `go:${city.id}`;
      go.textContent = "→";
      go.title = stmText("map.goTo", { city: name });
      go.setAttribute("aria-label", stmText("map.goTo", { city: name }));
      go.addEventListener("click", async () => {
        // The map at the other end draws only the city that is switched on,
        // so going there switches it on: a search sent to Toronto that lands
        // with Montréal still picked is a Toronto map with nothing on it. The
        // write is waited on because this page is about to be thrown away.
        try {
          await saveSettings({ cities: stmOnlyCity(city.id) });
        } finally {
          site.shortcut.run(city);
        }
      });
      row.append(go);
    }

    return row;
  }

  // Rebuilt outright rather than synced switch by switch: it is a dozen rows,
  // and both of the things that decide what is in them — which city is active
  // and what the settings say — change under a map that is never rebuilt.
  function renderCityPicker() {
    if (!cityPickerPanel) return;

    // The panel is rebuilt under whoever just threw a switch in it: the write
    // goes out to storage and comes back as a settings change. Whatever had
    // the focus is therefore put back on the control that replaced it, or a
    // keyboard is dropped at the top of the page on every click.
    const focused = cityPickerPanel.contains(document.activeElement)
      ? document.activeElement.dataset.stmKey
      : undefined;

    cityPickerPanel.replaceChildren();

    for (const [country, cities] of STM_CITIES_BY_COUNTRY) {
      const countryName = stmText(`country.${country}.name`);
      const on = cities.filter(({ id }) => settings.cities[id] !== false);

      const group = document.createElement("div");
      group.className = "stm-city-country";

      const head = document.createElement("div");
      head.className = "stm-city-country-head";

      const heading = document.createElement("span");
      heading.className = "stm-city-country-name";
      heading.textContent = countryName;

      // Which country the one city that is on belongs to, for a panel long
      // enough that the row itself can be scrolled out of sight. There is no
      // switch beside it: a country is several cities, and several cities is
      // the one thing this panel cannot be asked for.
      const count = document.createElement("span");
      count.className = "stm-city-count";
      count.textContent = stmText("map.cityCount", {
        all: cities.length,
        on: on.length
      });

      head.append(heading, count);
      group.append(head);

      for (const city of cities) group.append(cityPickerRow(city));

      cityPickerPanel.append(group);
    }

    if (focused) {
      cityPickerPanel
        .querySelector(`[data-stm-key="${CSS.escape(focused)}"]`)
        ?.focus();
    }
  }

  // Which of the city's lines are drawn, under the button that says which city
  // it is. Picking a city is half of the question a map raises — the other
  // half is which of the dozen-odd lines it just put on screen were the ones
  // being looked for — and answering that on the settings page means leaving
  // the map, coming back, and finding out there whether it was the right
  // answer. Only the city being drawn is offered: the rest of the catalogue is
  // the settings page's to show, and none of it could draw here anyway.
  function buildLinePicker() {
    linePicker = document.createElement("div");
    linePicker.id = "stm-line-picker";

    linePickerButton = document.createElement("button");
    linePickerButton.type = "button";
    linePickerButton.className = "stm-tool-button";
    linePickerButton.setAttribute("aria-controls", "stm-line-panel");

    const name = document.createElement("span");
    name.className = "stm-line-heading";
    name.textContent = stmText("map.lines");

    // How many of them are drawn, which is the whole of what the panel says
    // while it is shut: a map missing a line is a map whose count is short.
    linePickerCount = document.createElement("span");
    linePickerCount.className = "stm-line-count";

    const chevron = document.createElement("span");
    chevron.className = "stm-tool-chevron";
    chevron.setAttribute("aria-hidden", "true");

    linePickerButton.append(name, linePickerCount, chevron);

    linePickerPanel = document.createElement("div");
    linePickerPanel.id = "stm-line-panel";
    linePickerPanel.className = "stm-tool-panel stm-line-panel";

    linePickerButton.addEventListener("click", () => showPicker("line"));

    linePicker.append(linePickerButton, linePickerPanel);
    mapTools.append(linePicker);

    renderLinePicker();
    paintPickers();
  }

  // One line, as the bullet its own network prints it on and the name beside
  // it. A button carrying both rather than a checkbox and a label: at this
  // size the colour is what a line is recognised by, and role="switch" is what
  // says the pair is still a switch.
  //
  // That role is also why the name is written out rather than left to the
  // contents: a switch is named by its author and by nothing else, so a button
  // carrying its name in a span is a switch with no name at all. The bullet
  // repeats that name in the network's own shorthand, which is worth seeing
  // and not worth hearing twice.
  //
  // A line under a switch that is off is disabled rather than left looking as
  // though it still decides anything — its city or its operator has already
  // decided — and its bullet is hollowed out the way the settings page
  // hollows one, since neither is being drawn.
  function linePickerChip(line, held) {
    const checked = settings.lines[line.id] !== false;

    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "stm-line-chip";
    chip.dataset.stmKey = `line:${line.id}`;
    chip.disabled = held;
    chip.title = stmText(`line.${line.id}.detail`);
    chip.setAttribute("role", "switch");
    chip.setAttribute("aria-checked", String(checked));
    chip.setAttribute("aria-label", stmText(`line.${line.id}.name`));
    chip.classList.toggle("stm-line-chip-off", !checked);

    const bullet = document.createElement("span");
    bullet.className = "stm-bullet";
    bullet.style.setProperty("--stm-swatch", line.color);
    bullet.style.setProperty("--stm-ink", stmLineInk(line.color));
    bullet.textContent = stmLineBadge(line);
    bullet.setAttribute("aria-hidden", "true");
    bullet.classList.toggle("stm-bullet-off", !checked || held);

    const name = document.createElement("span");
    name.className = "stm-line-name";
    name.textContent = stmText(`line.${line.id}.name`);

    chip.append(bullet, name);
    chip.addEventListener("click", () => {
      saveSettings({ lines: { [line.id]: !checked } });
    });

    return chip;
  }

  // One operator's lines, headed by the operator wherever the city runs more
  // than one: a city with nobody to be told apart from is a grid of lines and
  // nothing else, since the button above the panel has already named it. The
  // header is a switch of its own — the same one the settings page shows —
  // because switching the REM off is a thing to want on a map of Montréal and
  // doing it one line at a time is not.
  function linePickerGroup(system, lines, cityOff) {
    const systemId = `${activeCity.id}:${system.id}`;
    const checked = settings.systems[systemId] !== false;

    const group = document.createElement("div");
    group.className = "stm-line-system";

    if (activeCity.systems.length > 1) {
      const head = document.createElement("label");
      head.className = "stm-line-system-head";

      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.checked = checked;
      toggle.disabled = cityOff;
      toggle.dataset.stmKey = `system:${systemId}`;
      toggle.addEventListener("change", () => {
        saveSettings({ systems: { [systemId]: toggle.checked } });
      });

      const name = document.createElement("span");
      name.className = "stm-line-system-name";
      name.textContent = stmText(`system.${systemId}.name`);

      head.append(toggle, name);
      group.append(head);
    }

    const grid = document.createElement("div");
    grid.className = "stm-line-grid";

    for (const line of lines) {
      grid.append(linePickerChip(line, cityOff || !checked));
    }

    group.append(grid);

    return group;
  }

  // The pair of buttons that act on every line at once. Isolating one line out
  // of the twenty-one Paris draws is otherwise twenty clicks, and putting them
  // back is another twenty.
  //
  // Turning them on reaches the switches above them as well, or a city or an
  // operator left off would go on hiding lines that now say they are on —
  // including the city this panel is about, since a map with every line on and
  // nothing drawn is exactly the state this button is being pressed to leave.
  // Turning them off needs only the lines: holding their parents off as well
  // would leave a panel of hollow bullets with nothing in it left to click.
  function linePickerBulk(lines) {
    const bulk = document.createElement("div");
    bulk.className = "stm-line-bulk";

    for (const [key, label, value] of [
      ["all-on", stmText("map.lineAllOn"), true],
      ["all-off", stmText("map.lineAllOff"), false]
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.stmKey = key;
      button.textContent = label;
      button.addEventListener("click", () => {
        const patch = {
          lines: Object.fromEntries(lines.map(({ id }) => [id, value]))
        };

        if (value) {
          patch.cities = stmOnlyCity(activeCity.id);
          patch.systems = Object.fromEntries(
            activeCity.systems.map(({ id }) => [`${activeCity.id}:${id}`, true])
          );
        }

        saveSettings(patch);
      });

      bulk.append(button);
    }

    return bulk;
  }

  // Rebuilt outright, like the city panel and for the same reasons: it is a
  // handful of switches, and both of the things that decide what is in them —
  // which city the map is on and what the settings say — change under a map
  // that is never rebuilt.
  function renderLinePicker() {
    if (!linePickerPanel) return;

    const lines = STM_LINES.filter(({ cityId }) => cityId === activeCity.id);
    // What is actually on screen rather than what the line switches say: a
    // line whose city or operator is off is not being drawn, and a count that
    // claimed otherwise would be the one number on the map that lied.
    const on = lines.filter(({ id }) => stmIsLineEnabled(settings, id)).length;
    const cityOff = settings.cities[activeCity.id] === false;

    linePickerCount.textContent = stmText("map.lineCount", {
      all: lines.length,
      on
    });

    // The count is in the name rather than beside it, because the name is what
    // replaces everything the button shows for anyone who cannot see it.
    const label = stmText("map.linePicker", {
      all: lines.length,
      city: stmText(`city.${activeCity.id}.name`),
      on
    });

    linePickerButton.title = label;
    linePickerButton.setAttribute("aria-label", label);

    // Same as the city panel: the write goes out to storage and comes back as
    // a settings change, which rebuilds this under whoever just threw a switch
    // in it. Whatever had the focus is put back on the control that replaced
    // it, or a keyboard is dropped at the top of the page on every click.
    const focused = linePickerPanel.contains(document.activeElement)
      ? document.activeElement.dataset.stmKey
      : undefined;

    linePickerPanel.replaceChildren(linePickerBulk(lines));

    for (const system of activeCity.systems) {
      const systemId = `${activeCity.id}:${system.id}`;

      linePickerPanel.append(
        linePickerGroup(
          system,
          lines.filter((line) => line.systemId === systemId),
          cityOff
        )
      );
    }

    if (focused) {
      linePickerPanel
        .querySelector(`[data-stm-key="${CSS.escape(focused)}"]`)
        ?.focus();
    }
  }

  function buildSettingsShortcut() {
    const button = document.createElement("button");
    button.type = "button";
    button.id = "stm-settings-shortcut";
    button.textContent = "⚙";
    button.title = stmText("extension.settings");
    button.setAttribute("aria-label", stmText("extension.settings"));
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

  // The listings beside a search, hidden and shown again from a button on the
  // edge of the map they are laid out against. Hiding them is all it takes to
  // give the map their width: the site sizes the map's column to whatever the
  // row has left over, so the listings only have to leave the row.
  function buildListingsToggle() {
    listingsLayout = site.listingsBeside?.(map);

    // A site that lays nothing out beside its maps, or a layout the adapter
    // does not recognise. Either way there is nothing to hide.
    if (!listingsLayout) return;

    listingsToggle = document.createElement("button");
    listingsToggle.type = "button";
    listingsToggle.id = "stm-listings-toggle";

    // Which way the map's edge is about to move. The label says the same
    // thing in words.
    const chevron = document.createElement("span");
    chevron.className = "stm-tool-chevron";
    chevron.setAttribute("aria-hidden", "true");

    listingsToggle.append(chevron);
    listingsToggle.addEventListener("click", () => {
      listingsHidden = !listingsHidden;
      paintListings();

      // Where the next search in this browser starts. Nothing reads it back
      // until then: a tab left open elsewhere keeps its listings rather than
      // having them vanish from under whoever is reading them.
      chrome.storage.local
        .set({ [STM_LISTINGS_HIDDEN_KEY]: listingsHidden })
        .catch(() => {});
    });

    // A press on the button is not a press on the map. These are the events
    // Leaflet keeps its own controls out of the map with: a double press would
    // zoom it, and a press that wanders off the button would drag it.
    for (const eventName of [
      "click",
      "dblclick",
      "mousedown",
      "pointerdown",
      "touchstart",
      "wheel"
    ]) {
      listingsToggle.addEventListener(eventName, (event) => {
        event.stopPropagation();
      });
    }

    listingsLayout.column.setAttribute(MAP_COLUMN_ATTRIBUTE, "");
    map.append(listingsToggle);
    paintListings();
  }

  // The button and the row agree with the one piece of state, whether the
  // button was just built or a press has moved it.
  function paintListings() {
    if (!listingsToggle) return;

    const label = listingsHidden
      ? stmText("map.showListings")
      : stmText("map.hideListings");

    listingsToggle.dataset.stmState = listingsHidden ? "hidden" : "shown";
    listingsToggle.title = label;
    listingsToggle.setAttribute("aria-label", label);
    setListingsRow(listingsHidden);
  }

  // Leaflet measures its box when the window is resized and not otherwise,
  // so a map that has just been handed the listings' width is told the way it
  // would be told about any other resize. Marketplace notices the change on
  // its own today; the event costs one redraw, and without it a map that
  // stopped noticing would load tiles only as far as it used to reach.
  function setListingsRow(hidden) {
    const { row } = listingsLayout;

    if (row.hasAttribute(HIDE_LISTINGS_ATTRIBUTE) === hidden) return;

    row.toggleAttribute(HIDE_LISTINGS_ATTRIBUTE, hidden);
    dispatchEvent(new Event("resize"));
  }

  function buildMapTools() {
    // The container goes up whatever ends up inside it: sync() reads a
    // missing one as a wiped one, and an empty flex column paints nothing.
    mapTools = document.createElement("div");
    mapTools.id = "stm-map-tools";
    // Each site keeps its own controls in a different corner, and content.css
    // moves the column out from under whichever ones this one has.
    mapTools.dataset.stmSite = site.id;

    // The city first: it is the one thing in the column that is true whatever
    // the overlay is doing, and the notice under it only ever elaborates. The
    // lines come straight after, because they are the same question one level
    // down and the notice between them would come and go as the city loaded.
    if (settings.cityPicker) buildCityPicker();
    if (settings.linePicker) buildLinePicker();
    if (settings.networkStatus) buildNetworkStatus();

    map.append(mapTools);

    for (const eventName of ["click", "pointerdown", "wheel"]) {
      mapTools.addEventListener(eventName, (event) => {
        event.stopPropagation();
      });
    }

    // A rebuilt column has said nothing yet, so the state it carries is
    // repainted into it whether or not it has changed.
    setNetworkState(networkState ?? currentNetworkState(), true);
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
      remove.textContent = stmText("point.remove");
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
    toggle.textContent = stmText("point.addTitle");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "stm-custom-points-panel");

    const panel = document.createElement("div");
    panel.id = "stm-custom-points-panel";
    panel.className = "stm-custom-points-panel";
    panel.hidden = true;

    const form = document.createElement("form");

    const label = document.createElement("input");
    label.name = "label";
    label.placeholder = stmText("point.name");
    label.setAttribute("aria-label", stmText("point.name"));

    // type="url" would reject a pasted coordinate pair before submit ever
    // fires, and its built-in bubble is not in our wording. Validate here.
    const googleMapsUrl = document.createElement("input");
    googleMapsUrl.name = "googleMapsUrl";
    googleMapsUrl.type = "text";
    googleMapsUrl.autocomplete = "off";
    googleMapsUrl.spellcheck = false;
    googleMapsUrl.placeholder = stmText("point.location");
    googleMapsUrl.setAttribute("aria-label", stmText("point.location"));
    googleMapsUrl.setAttribute("aria-describedby", "stm-custom-point-hint");

    const hint = document.createElement("p");
    hint.id = "stm-custom-point-hint";
    hint.className = "stm-custom-point-hint";

    const hintFormats = document.createElement("span");
    hintFormats.textContent = stmText("point.formats");

    const hintShortLink = document.createElement("span");
    hintShortLink.className = "stm-custom-point-hint-warning";
    hintShortLink.textContent = stmText("point.shortLinks");

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
    color.setAttribute("aria-label", stmText("point.color"));

    const add = document.createElement("button");
    add.type = "submit";
    add.textContent = stmText("point.add");

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

  // The shell: the svg, the groups the render loop writes transforms onto, and
  // the column of tools in the corner. None of it belongs to a city, and none
  // of it comes down when the map moves into another one — taking it down is
  // what used to make a swap look like the overlay had given up and needed a
  // reload to come back.
  function buildOverlay() {
    const pane = site.overlayHost(map) ?? map;
    overlay = createSvgElement("svg", {
      "aria-hidden": "true",
      id: "stm-metro-overlay"
    });

    // Leaflet's overlay pane is already stacked where we want to be. Google's
    // panes are ordinary z-indexed siblings, so the overlay has to name the
    // layer it belongs on to land between the tiles and the property pins.
    if (site.overlayZIndex) overlay.style.zIndex = site.overlayZIndex;

    haloGroup = createSvgElement("g", {
      fill: "none",
      stroke: "#ffffff",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-opacity": "0.9",
      "stroke-width": "9"
    });
    lineGroup = createSvgElement("g", {
      fill: "none",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-width": "5"
    });
    stationGroup = createSvgElement("g", {
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

    // The tools before the network rather than after it: the column is where
    // a city still on its way is announced, and it cannot announce anything
    // from a corner it has not been put in yet.
    buildOverlayTools();
    drawNetwork();
    refreshCustomPoints();
  }

  // Everything in the overlay that is made out of geometry, which is
  // everything that belongs to one city: the lines, the stations, and who to
  // credit for them. Called again on a swap instead of the shell being rebuilt
  // around it, and again when a fetch lands under an overlay that went up
  // while it was still in flight.
  function drawNetwork() {
    const geometry = getNetworkGeometry();

    drawnFrom = networkData;
    linePaths = [];
    stationMarkers = [];
    haloGroup.replaceChildren();
    lineGroup.replaceChildren();
    stationGroup.replaceChildren();
    stationLabelGroup.replaceChildren();

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

    // Everything the render loop remembers about where it put things was
    // measured from an origin that has just changed, so none of it is worth
    // keeping. The labels are hidden outright rather than left to be shown at
    // the last city's coordinates for the frame before the loop catches up.
    renderedOriginX = undefined;
    renderedOriginY = undefined;
    renderedScale = undefined;
    stationLabelsVisible = undefined;
    stationLabelGroup.setAttribute("display", "none");
    networkGroup.setAttribute("display", "none");

    refreshAttribution(geometry.credits);
    scheduleRender();
  }

  // The drawing again, points and all. A landmark is stored in degrees and
  // drawn in units measured from the city's origin, so one that is not placed
  // again after a swap is a landmark left out over the old city.
  function redrawNetwork() {
    if (!overlay) return;

    drawNetwork();
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
    // By who is being credited rather than by operator, the same way the
    // settings page counts them: Paris splits its métro from its RER so that
    // each has a switch, and both came out of Île-de-France Mobilités, who
    // is one name to thank rather than two.
    const named = new Map();

    for (const { attribution: credit } of credits) {
      if (!named.has(credit.label)) named.set(credit.label, credit);
    }

    attribution = document.createElement("div");
    attribution.id = "stm-metro-attribution";
    attribution.dataset.stmSite = site.id;
    attribution.title = stmText("map.creditTitle", {
      operators: new Intl.ListFormat(stmLocale).format([...named.keys()])
    });

    // Each operator beside the licence its own data came out under, rather
    // than one licence at the end standing in for all of them: two operators
    // on one map need not be publishing on the same terms.
    const parts = [`${stmText("credits.lead")} `];

    for (const credit of named.values()) {
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

  // The credit belongs to whoever published what is on screen, so it is made
  // again with the drawing rather than once with the overlay: a map that has
  // moved from Montréal to Toronto must stop thanking the STM.
  function refreshAttribution(credits) {
    attribution?.remove();
    attribution = undefined;

    // Crediting an operator for a map drawing none of its lines would be an
    // odd thing to do, and the licence asks for the credit to travel with the
    // data rather than with the extension.
    if (credits.length) buildAttribution(credits);
  }

  function buildOverlayTools() {
    buildMapTools();

    if (settings.pointsTool) buildCustomPointPanel();
    if (settings.settingsShortcut) buildSettingsShortcut();
    if (settings.listingsToggle) buildListingsToggle();
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
  // and the drawing made against that origin. The geometry itself is whatever
  // has already been fetched for the city now in front of us, which on a map
  // wandering back over its own path is all of it.
  function resetNetwork() {
    networkData = networkCache.get(activeCity.id);
    networkGeometry = undefined;
    networkOrigin = undefined;
    detachStrip();
    redrawNetwork();
    scheduleSync();
  }

  // A map is only ever asked where it is looking, never which city it is in,
  // so a viewport out over the Atlantic names no city at all and whatever
  // network is already up stays up. A swap throws the drawing away — every
  // coordinate in it is relative to an origin that has just changed — but not
  // the overlay around it: the column in the corner is the only thing on the
  // page that can say a swap is what happened.
  function considerCity(coordinates) {
    const next = stmCityAt(coordinates);

    if (!next || next === activeCity) return false;

    activeCity = next;

    // Where the next page in this browser starts its guess. A map that has
    // been over Paris all afternoon has no business opening on Montréal and
    // fetching it before finding out.
    chrome.storage.local
      .set({ [STM_ACTIVE_CITY_KEY]: next.id })
      .catch(() => {});

    resetNetwork();

    // Forced, because the state itself often does not change across a swap —
    // a city already in hand goes straight from drawn to drawn — while the
    // name beside it always does, and a column still naming the city just
    // left behind is worse than one saying nothing. The render loop settles
    // the rest on the next frame.
    setNetworkState(currentNetworkState(), true);
    renderCityPicker();
    renderLinePicker();

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
    const cached = networkCache.get(city.id);

    // A city drawn once in this page's life is drawn again without waiting on
    // anything, which is what a map panned back and forth across a boundary
    // should feel like.
    if (cached) {
      networkData = cached;
      return;
    }

    if (networkRequests.has(city.id)) return;

    // A city that has just failed is not asked for again on its own. Every
    // sync would ask, and on a page that resyncs off its own feed that turns
    // one failed load into a stream of them; the notice carries the way back,
    // and a route change below is the other one.
    if (networkFailure === city.id) return;

    const request = fetch(chrome.runtime.getURL(city.data))
      .then((response) => {
        // A 404 answers with a page rather than by rejecting, and parsing it
        // as the geometry would fail somewhere far less obvious than here.
        if (!response.ok) throw new Error(String(response.status));

        return response.json();
      })
      .then((data) => {
        networkRequests.delete(city.id);
        networkCache.set(city.id, qualifyNetwork(city, data));

        // The city can be swapped while this is in flight, and an answer about
        // the one just left behind is no answer about the one now drawn. It is
        // still worth keeping: a map that has left a city once is a map that
        // can come back to it.
        if (city !== activeCity) return;

        networkFailure = undefined;
        networkData = networkCache.get(city.id);
        scheduleSync();
      })
      .catch(() => {
        networkRequests.delete(city.id);
        networkFailure = city.id;

        // Nothing on the page would ask again by itself, so the notice says so
        // and offers to. Staying quiet here is what left a failed load looking
        // like an overlay that needed the page reloaded.
        if (city === activeCity) setNetworkState("failed", true);
      });

    networkRequests.set(city.id, request);
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

    // Nothing to draw yet is not nothing to show: the overlay and its tools go
    // up while the city's geometry is still on its way, which is what lets the
    // notice say so instead of the map sitting bare. The empty answer is not
    // memoised, because the data landing is exactly what makes it wrong.
    if (!networkData) return { credits: [], paths: [], stations: [] };

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

    stripDrawnFrom = networkData;

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
      stripCredit.textContent = [
        ...new Set(geometry.credits.map(({ attribution: { label } }) => label))
      ].join(" · ");
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
    stripDrawnFrom = undefined;
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

    // Same strip, same geometry: there is nothing to build, only to place. A
    // strip that went up while the city was still loading is a different
    // matter — it has the landmarks and none of the lines, and the lines are
    // what has just arrived.
    if (
      next === strip &&
      stripOverlay?.isConnected &&
      stripDrawnFrom === networkData
    ) {
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
    // screen, and the notice would be answering a question nobody asked. A
    // city whose geometry has not landed has no lines either, and there the
    // notice is in the middle of saying so — the loop has nothing to add.
    if (networkData) {
      setNetworkState(
        networkIsVisible || !linePaths.length ? "visible" : "outside"
      );
    }

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
        attribution?.contains(node) ||
        listingsToggle?.contains(node)
    );
  }

  // Everything we hang off the map, and whether it is all still hanging
  // there. The attribution only goes up when there is network data to credit,
  // and the listings button only beside listings, so an absent one is not the
  // same thing as a wiped one.
  function overlayIsIntact() {
    return Boolean(
      overlay?.isConnected &&
      mapTools?.isConnected &&
      (!attribution || attribution.isConnected) &&
      (!listingsToggle || listingsToggle.isConnected)
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
    listingsToggle?.remove();

    // The listings come back with the button rather than staying hidden with
    // nothing left on the page to bring them back. Whether they were hidden
    // is kept: a button built on the next map puts them away again.
    if (listingsLayout) {
      setListingsRow(false);
      listingsLayout.column.removeAttribute(MAP_COLUMN_ATTRIBUTE);
    }

    map = undefined;
    overlay = undefined;
    networkGroup = undefined;
    haloGroup = undefined;
    lineGroup = undefined;
    stationGroup = undefined;
    drawnFrom = undefined;
    attribution = undefined;
    mapTools = undefined;
    networkStatus = undefined;
    networkStatusText = undefined;
    networkStatusAction = undefined;
    cityPicker = undefined;
    cityPickerButton = undefined;
    cityPickerName = undefined;
    cityPickerPanel = undefined;
    linePicker = undefined;
    linePickerButton = undefined;
    linePickerCount = undefined;
    linePickerPanel = undefined;
    listingsToggle = undefined;
    listingsLayout = undefined;
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
    // Asked before anything has been fetched, because on a listing page with
    // no map open it is the only thing that knows which city to fetch.
    if (!wantsStrip) detachStrip();
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

    // The map is in hand, so there is nothing left for the document-wide
    // observer to hunt for: the overlay watches its own corner of the page
    // from here, and the geometry announces itself by scheduling a sync when
    // it lands.
    disconnectPageObserver();

    // The overlay goes up with the map rather than with the geometry. A city
    // still on its way is something the notice has to be able to say, and it
    // cannot say it from a column that is not on the map yet — which is what
    // made a slow or failed load look like nothing was going to happen.
    if (!networkData) loadNetworkData();

    if (nextMap !== map || !overlayIsIntact()) attach(nextMap);
    // An overlay that is up is not the same thing as one that is current: the
    // fetch that was out when it went up has landed, or the map has moved into
    // another city since. Either way the shell stays and the drawing is made
    // again inside it.
    else if (drawnFrom !== networkData) redrawNetwork();
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
    // A new page is a fair reason to ask again for a city whose geometry did
    // not arrive on the last one. Without this, a load that failed with the
    // notice switched off would have nothing left to clear it.
    networkFailure = undefined;
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

  // What the column of tools and the overlay around the drawing are built out
  // of, and the language they are built in. A change to any of these is a
  // rebuild; a change to which lines are drawn is not, and rebuilding for one
  // of those is what would shut the city panel in the face of someone who was
  // in the middle of using it.
  const STM_SHELL_KEYS = [
    "cityPicker",
    "interactiveMaps",
    "language",
    "linePicker",
    "listingPreview",
    "listingsToggle",
    "networkStatus",
    "pointsTool",
    "settingsShortcut",
    "sites"
  ];

  function shellSignature(value) {
    return JSON.stringify(STM_SHELL_KEYS.map((key) => value[key]));
  }

  function applySettings(stored) {
    const previous = settings;
    settings = stmMergeSettings(stored);
    // Called for what it does rather than for what it answers: the language is
    // one of the shell keys, so a new one is a rebuild either way.
    stmUseLanguage(settings.language);

    if (enabled) paintDetectAttributes();

    // The geometry is filtered by the line switches on the way in, so it is
    // thrown away and made again from the same data whatever else happens.
    // The strip is simply built again by the next sync.
    networkGeometry = undefined;
    detachStrip();

    if (shellSignature(settings) !== shellSignature(previous)) detach();
    else if (overlay) {
      // Nothing the column is built out of has changed, so it stays where it
      // is: a city switched off from the panel on the map must not take that
      // panel down with it.
      redrawNetwork();
      renderCityPicker();
      renderLinePicker();
      paintNetworkState();
    }

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

      // STM_ACTIVE_CITY_KEY is deliberately not listened for. Every map writes
      // it as it goes, and a tab that followed another tab's would be swapping
      // its network to wherever someone else's map had drifted.
    });

    customPointsReady = chrome.storage.local
      .get([
        STM_ACTIVE_CITY_KEY,
        STM_CUSTOM_POINTS_KEY,
        STM_ENABLED_KEY,
        STM_LISTINGS_HIDDEN_KEY,
        STM_SETTINGS_KEY
      ])
      .then((stored) => {
        // Settings first: the refresh below and everything activate() starts
        // read them, and the defaults are only a stand-in until this lands.
        settings = stmMergeSettings(stored[STM_SETTINGS_KEY]);
        stmUseLanguage(settings.language);
        // Wherever the last map to say so was looking, which is a far better
        // opening guess than the first city in the registry: without it, a
        // browser that lives in Paris fetches Montréal, draws it, and throws
        // it away again on the first frame it can project. A stale guess costs
        // nothing, because the map corrects it as soon as it is found.
        activeCity =
          stmCityById(stored[STM_ACTIVE_CITY_KEY]) ?? activeCity;
        // How the last search left its listings, read before anything is
        // attached so that the first map this page finds already knows.
        listingsHidden = stored[STM_LISTINGS_HIDDEN_KEY] === true;
        customPoints = stored[STM_CUSTOM_POINTS_KEY] ?? [];
        refreshCustomPoints();
        setEnabled(stored[STM_ENABLED_KEY] ?? true);
      });
  }

  init();
})();
