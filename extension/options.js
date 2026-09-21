(() => {
  // The rows are described rather than written out in options.html so that a
  // new switch is one entry here, its default in settings.js and its words in
  // i18n.js, and so the dependency between a switch and the one it sits under
  // is stated once. They are read again on every build, because a build is
  // what a change of language comes down to.
  function sections() {
    return [
      {
        rows: [
          {
            hint: stmText("options.interactiveMaps.hint"),
            key: "interactiveMaps",
            label: stmText("options.interactiveMaps")
          },
          {
            hint: stmText("options.listingPreview.hint"),
            key: "listingPreview",
            label: stmText("options.listingPreview")
          }
        ],
        title: stmText("options.where.title")
      },
      {
        rows: [
          { key: "stations", label: stmText("options.stations") },
          {
            hint: stmText("options.stationLabels.hint"),
            key: "stationLabels",
            label: stmText("options.stationLabels"),
            parent: "stations"
          },
          {
            hint: stmText("options.points.hint"),
            key: "points",
            label: stmText("options.points")
          }
        ],
        title: stmText("options.shown.title")
      },
      {
        rows: [
          {
            hint: stmText("options.pointsTool.hint"),
            key: "pointsTool",
            label: stmText("options.pointsTool")
          },
          {
            hint: stmText("options.networkStatus.hint"),
            key: "networkStatus",
            label: stmText("options.networkStatus")
          },
          {
            hint: stmText("options.cityPicker.hint"),
            key: "cityPicker",
            label: stmText("options.cityPicker")
          },
          {
            hint: stmText("options.linePicker.hint"),
            key: "linePicker",
            label: stmText("options.linePicker")
          },
          {
            hint: stmText("options.listingsToggle.hint"),
            key: "listingsToggle",
            label: stmText("options.listingsToggle")
          },
          {
            hint: stmText("options.settingsShortcut.hint"),
            key: "settingsShortcut",
            label: stmText("options.settingsShortcut")
          }
        ],
        title: stmText("options.tools.title")
      }
    ];
  }

  // Every switch on the page, by the settings key it writes, and each one
  // holding on to the switch it hangs under. That chain is what a held row is
  // read off: a line answers to its system and its city as well as to itself.
  // The catalogue's own switches are kept apart because they are thrown away
  // and built again whenever the filters change, and the rest of the page is
  // not.
  const rows = new Map();
  const networkRows = new Map();

  // What every filter reads when it is asking for nothing in particular.
  const STM_ANY = "all";

  // How the catalogue is being looked at, rather than anything it stores: a
  // filter is not a setting and is never written to storage. It outlives a
  // change of language, which rebuilds the page, and nothing else.
  let lineQuery = "";
  let countryFilter = STM_ANY;
  let modeFilter = STM_ANY;

  // Which cities are open. A card opened by hand stays open until it is
  // closed by hand; a search opens whatever it matches for as long as it runs.
  const openCities = new Set();

  // Redraws the catalogue, and brings what its switches say back in line with
  // the settings. Assigned when the section is built, since everything the two
  // of them touch is built along with it.
  let renderNetwork = () => {};
  let syncNetwork = () => {};

  const main = document.querySelector("main");
  const masterSection = document.querySelector("#stm-master-section");
  const languageSection = document.querySelector("#stm-language-section");
  const sectionsHost = document.querySelector("#stm-sections");
  const creditsHost = document.querySelector("#stm-credits");

  let enabled = true;
  let settings = stmMergeSettings();
  let points = [];
  let masterInput;
  let languageInput;
  let pointList;
  // The row being edited, if any. Only one at a time: two half-finished
  // edits of the same list is a way to lose one of them.
  let editingId;

  function saveSettings() {
    return chrome.storage.local.set({ [STM_SETTINGS_KEY]: settings });
  }

  // A key is either a setting of its own or a name inside one of the maps the
  // settings keep — "stations", or "lines.montreal:stm:1". Only the first dot
  // separates the two; a line id carries colons, never dots.
  function settingGroup(key) {
    const dot = key.indexOf(".");

    return dot === -1 ? undefined : [key.slice(0, dot), key.slice(dot + 1)];
  }

  function readSetting(key) {
    const group = settingGroup(key);

    return group ? settings[group[0]][group[1]] : settings[key];
  }

  function writeSetting(key, value) {
    const group = settingGroup(key);

    if (group) settings[group[0]][group[1]] = value;
    else settings[key] = value;
  }

  function savePoints(next) {
    return chrome.storage.local.set({ [STM_CUSTOM_POINTS_KEY]: next });
  }

  function createSwitch() {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "stm-switch";
    input.setAttribute("role", "switch");

    return input;
  }

  // A switch unless told otherwise. The label wraps whichever control it is
  // handed, so a click anywhere on the row still lands on that control.
  function createRow({ control = createSwitch(), depth, hint, label, swatch }) {
    const row = document.createElement("label");
    row.className = "stm-row";

    // How far in the row sits, rather than which level it is: the indent and
    // the elbow drawn in the gutter are both worked out from the number, so a
    // third level needs no third class in the stylesheet.
    if (depth) {
      row.classList.add("stm-row-nested");
      row.style.setProperty("--stm-depth", depth);
    }

    const text = document.createElement("span");
    text.className = "stm-row-text";

    const title = document.createElement("span");
    title.className = "stm-row-title";

    if (swatch) {
      const chip = document.createElement("span");
      chip.className = "stm-swatch";
      chip.style.setProperty("--stm-swatch", swatch);
      title.append(chip);
    }

    title.append(label);
    text.append(title);

    if (hint) {
      const description = document.createElement("span");
      description.className = "stm-row-hint";
      description.textContent = hint;
      text.append(description);
    }

    row.append(text, control);

    return { input: control, row };
  }

  // Accents are how these networks spell themselves and not how anyone types
  // them in a hurry, so "metro" has to find "Métro".
  function foldText(value) {
    return value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  }

  // Everything about a line somebody might type to look for it: the country
  // and city it runs in, who runs it, what it is called, what kind of service
  // it is, and the id itself.
  function lineSearchText(line) {
    return foldText(
      [
        stmText(`country.${line.countryId}.name`),
        stmText(`city.${line.cityId}.name`),
        stmText(`system.${line.systemId}.name`),
        stmText(`line.${line.id}.name`),
        stmText(`line.${line.id}.detail`),
        stmText(`mode.${line.mode}.name`),
        line.id
      ].join(" ")
    );
  }

  // The bullet a line is known by: its colour, carrying its short name. Drawn
  // both in the strip a closed city shows and on the button that switches the
  // line, because it is the one part of a line anybody recognises at a glance.
  // What goes on it is the registry's to say, since the panel on the map draws
  // the same bullet from the same entry.
  function createBullet(line) {
    const bullet = document.createElement("span");
    bullet.className = "stm-bullet";
    bullet.style.setProperty("--stm-swatch", line.color);
    bullet.style.setProperty("--stm-ink", stmLineInk(line.color));
    bullet.textContent = stmLineBadge(line);

    return bullet;
  }

  function buildMaster() {
    const { input, row } = createRow({
      hint: stmText("options.enable.hint"),
      label: stmText("options.enable")
    });

    masterInput = input;
    row.classList.add("stm-row-master");
    input.addEventListener("change", async () => {
      enabled = input.checked;
      await chrome.storage.local.set({ [STM_ENABLED_KEY]: enabled });
      syncInputs();
    });
    masterSection.append(row);
  }

  // Its own card, above everything the master switch dims, because it is the
  // one setting that is about this page as much as about the maps. Following
  // the browser is offered by name, so it says which language that turns out
  // to be.
  function buildLanguageSection() {
    const heading = document.createElement("h2");
    heading.textContent = stmText("options.language.title");

    const select = document.createElement("select");
    select.className = "stm-select";
    select.append(
      new Option(
        stmText("options.language.auto", {
          language: STM_LOCALES[stmBrowserLocale()].name
        }),
        STM_AUTO_LANGUAGE
      )
    );

    for (const [code, { name }] of Object.entries(STM_LOCALES)) {
      const option = new Option(name, code);

      // Read out in its own language by a screen reader, the way it is
      // written.
      option.lang = code;
      select.append(option);
    }

    const { input, row } = createRow({
      control: select,
      hint: stmText("options.language.hint"),
      label: stmText("options.language")
    });

    languageInput = input;
    input.addEventListener("change", async () => {
      settings.language = input.value;
      await saveSettings();
      refresh();
    });
    languageSection.append(heading, row);
  }

  function addRow(section, definition) {
    const parent = definition.parent ? rows.get(definition.parent) : undefined;
    const depth = parent ? parent.depth + 1 : 0;
    const { input, row } = createRow({ ...definition, depth });

    input.addEventListener("change", async () => {
      writeSetting(definition.key, input.checked);
      await saveSettings();
      syncInputs();
    });

    rows.set(definition.key, {
      depth,
      key: definition.key,
      parent,
      sync(checked, held) {
        input.checked = checked;
        input.disabled = held;
        row.classList.toggle("stm-row-held", held);
      }
    });
    section.append(row);
  }

  function createSection(title) {
    const section = document.createElement("section");
    const heading = document.createElement("h2");
    heading.textContent = title;
    section.append(heading);
    sectionsHost.append(section);

    return section;
  }

  function buildSection({ rows: definitions, title }) {
    const section = createSection(title);

    for (const definition of definitions) addRow(section, definition);
  }

  // The sites are their own section rather than rows in "Where to show the
  // network": that one is about which kind of map, this one is about which
  // site, and the two switches multiply rather than overlap.
  function buildSitesSection() {
    const section = createSection(stmText("options.sites.title"));

    for (const { id, name } of STM_SITES) {
      addRow(section, {
        hint: stmText(`site.${id}.detail`),
        key: `sites.${id}`,
        label: name
      });
    }
  }

  // The catalogue is too long to read as a list — eight cities and better
  // than forty lines — so it is shown as a card per city that opens, over a
  // search and two filters that decide what those cards hold. The filters are
  // the country a network runs in and the kind of service it is, because those
  // are the two questions somebody arrives with: everything here is a métro
  // except where it is not, and half of it is in another country.
  //
  // Everything the buttons do, they do to whatever the filters have left
  // standing. Turning off the regional lines in France is two chips and one
  // button rather than eleven switches, and that is the whole point of them.
  function buildLinesSection() {
    const section = createSection(stmText("options.lines.title"));

    // What the last render left on screen, which is what the buttons beside
    // the count act on and what the fold button counts to name itself.
    let shownLines = [];
    let shownCities = [];
    let searching = false;

    const cards = [];
    const chips = [];

    const search = document.createElement("input");
    search.type = "search";
    search.className = "stm-search";
    search.autocomplete = "off";
    search.spellcheck = false;
    search.value = lineQuery;
    search.placeholder = stmText("options.lines.search");
    search.setAttribute("aria-label", stmText("options.lines.search"));
    search.addEventListener("input", () => {
      lineQuery = search.value;
      renderNetwork();
    });

    // Radio buttons rather than anything drawn from scratch, so that a group
    // is one stop in the tab order and the arrow keys walk it without a line
    // of keyboard code of our own. Each one is left where it is and made
    // invisible, and the chip drawn beside it is styled from it: what is
    // wanted is the platform's control wearing our clothes.
    const createFilter = (name, heading, choices, selected, pick) => {
      const group = document.createElement("div");
      group.className = "stm-filter";
      group.setAttribute("role", "radiogroup");

      const caption = document.createElement("span");
      caption.className = "stm-filter-label";
      caption.id = `stm-filter-${name}`;
      caption.textContent = heading;
      group.setAttribute("aria-labelledby", caption.id);
      group.append(caption);

      for (const { id, label } of choices) {
        const chip = document.createElement("label");
        chip.className = "stm-chip";

        const input = document.createElement("input");
        input.type = "radio";
        input.name = name;
        input.checked = id === selected;
        input.addEventListener("change", () => {
          pick(id);
          renderNetwork();
        });

        // How many lines this chip would leave, counted under whatever the
        // other filter and the search already say rather than on its own: a
        // chip promising twenty-one lines that turn out to be none is worse
        // than no number at all. Filled in on every render.
        const count = document.createElement("span");
        count.className = "stm-chip-count";

        const face = document.createElement("span");
        face.className = "stm-chip-face";
        face.append(label, count);

        chip.append(input, face);
        chips.push({ count, face, group: name, id, input });
        group.append(chip);
      }

      return group;
    };

    const filters = document.createElement("div");
    filters.className = "stm-filters";
    filters.append(
      createFilter(
        "stm-country",
        stmText("options.lines.country"),
        [
          { id: STM_ANY, label: stmText("options.lines.filterAll") },
          ...STM_COUNTRIES.map((id) => ({
            id,
            label: stmText(`country.${id}.name`)
          }))
        ],
        countryFilter,
        (id) => {
          countryFilter = id;
        }
      ),
      createFilter(
        "stm-mode",
        stmText("options.lines.mode"),
        [
          { id: STM_ANY, label: stmText("options.lines.filterAll") },
          ...STM_MODES.map((id) => ({ id, label: stmText(`mode.${id}.name`) }))
        ],
        modeFilter,
        (id) => {
          modeFilter = id;
        }
      )
    );

    const summary = document.createElement("p");
    summary.className = "stm-network-summary";

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "stm-link";
    clear.textContent = stmText("options.lines.clearFilters");
    clear.addEventListener("click", () => {
      countryFilter = STM_ANY;
      modeFilter = STM_ANY;
      lineQuery = "";
      search.value = "";

      for (const chip of chips) chip.input.checked = chip.id === STM_ANY;

      renderNetwork();
    });

    const fold = document.createElement("button");
    fold.type = "button";
    fold.className = "stm-link";

    // Named for what it would do rather than for what is open, so it never
    // reads as a label for a state.
    const updateFold = () => {
      const closed = shownCities.some(({ id }) => !openCities.has(id));

      fold.hidden = searching || shownCities.length < 2;
      fold.textContent = closed
        ? stmText("options.lines.expandAll")
        : stmText("options.lines.collapseAll");
    };

    fold.addEventListener("click", () => {
      const open = shownCities.some(({ id }) => !openCities.has(id));

      // Through the cards rather than through the set, so that the one part
      // of the page that changed is the only part redrawn and the button
      // keeps the focus that was just put on it.
      for (const card of cards) card.setOpen(open);
    });

    const bulk = document.createElement("div");
    bulk.className = "stm-bulk";
    bulk.title = stmText("options.lines.bulkHint");

    for (const [label, value] of [
      [stmText("options.lines.allOn"), true],
      [stmText("options.lines.allOff"), false]
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", async () => {
        for (const { id } of shownLines) settings.lines[id] = value;

        // Switching lines back on has to reach the switches above them too,
        // or a city or an operator left off would go on hiding lines that now
        // say they are on. Switching them off needs only the lines: holding
        // their parents off as well would leave a card of dimmed bullets with
        // nothing in it left to click.
        //
        // The cities are the exception, because only one of them can be on.
        // The one already picked is left alone wherever the list still has
        // something of its own in it, and only a list with nothing of the
        // picked city in it moves the pick — to the first city shown, which
        // is the only one of them this could have meant.
        if (value) {
          for (const { systemId } of shownLines) {
            settings.systems[systemId] = true;
          }

          const picked = STM_CITIES.find(
            ({ id }) => settings.cities[id] !== false
          );

          if (
            shownLines.length > 0 &&
            !shownLines.some(({ cityId }) => cityId === picked?.id)
          ) {
            settings.cities = stmOnlyCity(shownLines[0].cityId);
          }
        }

        await saveSettings();
        syncInputs();
      });
      bulk.append(button);
    }

    const actions = document.createElement("div");
    actions.className = "stm-network-actions";
    actions.append(clear, fold, bulk);

    const bar = document.createElement("div");
    bar.className = "stm-network-bar";
    bar.append(summary, actions);

    const list = document.createElement("div");
    list.className = "stm-network-list";

    const empty = document.createElement("p");
    empty.className = "stm-network-empty";
    empty.textContent = stmText("options.lines.empty");

    section.append(search, filters, bar, list, empty);

    // A switch inside the catalogue, kept in the shape the rest of the page's
    // switches are kept in so that one pass can hold every one of them to the
    // switches above it.
    const register = (key, parent, sync) => {
      const control = { key, parent, sync };
      networkRows.set(key, control);

      return control;
    };

    // One line, as the button that switches it. A button rather than a
    // checkbox because the bullet and the name are the control here, and
    // there is no room beside them for a switch as well; role="switch" is
    // what says it is still one of those.
    //
    // A switch is named by its author and by nothing else, so the name is
    // written out rather than left to the span inside the button: without it
    // every chip in the catalogue answers to whatever its tooltip says, and a
    // city's worth of them all say "Métro".
    const createLineChip = (line, parent, drawn) => {
      const key = `lines.${line.id}`;

      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "stm-line";
      chip.setAttribute("role", "switch");
      chip.setAttribute("aria-label", stmText(`line.${line.id}.name`));
      chip.title = stmText(`line.${line.id}.detail`);

      const name = document.createElement("span");
      name.className = "stm-line-name";
      name.textContent = stmText(`line.${line.id}.name`);

      const bullet = createBullet(line);

      chip.append(bullet, name);
      chip.addEventListener("click", async () => {
        writeSetting(key, readSetting(key) === false);
        await saveSettings();
        syncInputs();
      });

      register(key, parent, (checked, held) => {
        chip.setAttribute("aria-checked", String(checked));
        chip.disabled = held;
        chip.classList.toggle("stm-line-off", !checked);

        // Both of the line's bullets: the one on this button, and the one the
        // card's header shows while it is closed. A line held by the switch
        // above it is not being drawn either, whatever its own switch says.
        for (const shown of [bullet, drawn]) {
          shown.classList.toggle("stm-bullet-off", !checked || held);
        }
      });

      return chip;
    };

    // One city, closed by default: eight cards and the strip of bullets each
    // one carries say more about the catalogue at a glance than forty rows
    // of switch ever did.
    const createCityCard = (city, lines, open) => {
      const card = document.createElement("div");
      card.className = "stm-city";

      const head = document.createElement("div");
      head.className = "stm-city-head";

      const body = document.createElement("div");
      body.className = "stm-city-body";
      body.id = `stm-city-${city.id}`;

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "stm-city-toggle";
      toggle.setAttribute("aria-controls", body.id);

      const chevron = document.createElement("span");
      chevron.className = "stm-chevron";
      chevron.setAttribute("aria-hidden", "true");

      const name = document.createElement("span");
      name.className = "stm-city-name";
      name.textContent = stmText(`city.${city.id}.name`);

      const country = document.createElement("span");
      country.className = "stm-city-country";
      country.textContent = stmText(`country.${city.country}.name`);

      const badge = document.createElement("span");
      badge.className = "stm-city-badge";

      const title = document.createElement("span");
      title.className = "stm-city-title";
      title.append(name, country, badge);

      // The lines themselves, on a line of their own under the name, which is
      // the one place a city's worth of them fits while the card is closed.
      // They are named inside the card, so out here they are decoration and
      // are kept out of the button's name.
      const strip = document.createElement("span");
      strip.className = "stm-city-strip";
      strip.setAttribute("aria-hidden", "true");

      const bullets = new Map(
        lines.map((line) => {
          const bullet = createBullet(line);
          strip.append(bullet);

          return [line.id, bullet];
        })
      );

      toggle.append(chevron, title, strip);

      const control = createSwitch();
      const cityKey = `cities.${city.id}`;

      // A city is picked rather than switched on: the map draws one city at a
      // time, so every other city goes off with this one coming on. The whole
      // map is written, never the one name in it, which is what keeps this
      // and the panel on the map from disagreeing about how many can be on.
      control.addEventListener("change", async () => {
        settings.cities = stmOnlyCity(control.checked ? city.id : undefined);
        await saveSettings();
        syncInputs();
      });

      const cityControl = register(cityKey, undefined, (checked) => {
        control.checked = checked;
        card.classList.toggle("stm-city-off", !checked);
      });

      head.append(toggle, control);
      card.append(head, body);

      for (const system of city.systems) {
        const systemId = `${city.id}:${system.id}`;
        const owned = lines.filter((line) => line.systemId === systemId);

        if (!owned.length) continue;

        const group = document.createElement("div");
        group.className = "stm-system";
        let parent = cityControl;

        // An operator with nobody to be told apart from is left out rather
        // than given a row that could only repeat what the card already says.
        // Which operators a city has is the registry's answer and not the
        // filter's, so that a switch turned off can never be filtered out of
        // reach of the lines it is holding.
        if (city.systems.length > 1) {
          const header = document.createElement("label");
          header.className = "stm-system-head";

          const label = document.createElement("span");
          label.textContent = stmText(`system.${systemId}.name`);

          const input = createSwitch();
          const key = `systems.${systemId}`;

          input.addEventListener("change", async () => {
            writeSetting(key, input.checked);
            await saveSettings();
            syncInputs();
          });

          parent = register(key, cityControl, (checked, held) => {
            input.checked = checked;
            input.disabled = held;
            header.classList.toggle("stm-row-held", held);
            group.classList.toggle("stm-system-off", !checked);
          });

          header.append(label, input);
          group.append(header);
        }

        // Within an operator, by kind of service, and only where there is
        // more than one of them to tell apart: Toronto runs its light rail
        // under the same name and out of the same feed as its subway.
        for (const mode of STM_MODES) {
          const run = owned.filter((line) => line.mode === mode);

          if (!run.length) continue;

          if (new Set(owned.map((line) => line.mode)).size > 1) {
            const label = document.createElement("p");
            label.className = "stm-mode";
            label.textContent = stmText(`mode.${mode}.name`);
            group.append(label);
          }

          const grid = document.createElement("div");
          grid.className = "stm-line-grid";

          for (const line of run) {
            grid.append(createLineChip(line, parent, bullets.get(line.id)));
          }

          group.append(grid);
        }

        body.append(group);
      }

      // Opening a card by hand is remembered and opening one on a filter's
      // behalf is not, so that a city the search happened to land on is closed
      // again by clearing the search rather than left standing open.
      const setOpen = (value, remember = true) => {
        if (remember && value) openCities.add(city.id);
        if (remember && !value) openCities.delete(city.id);

        body.hidden = !value;
        card.classList.toggle("stm-city-open", value);
        toggle.setAttribute("aria-expanded", String(value));
        updateFold();
      };

      toggle.addEventListener("click", () => setOpen(body.hidden));
      setOpen(open, false);

      cards.push({
        setOpen,
        update() {
          const on = lines.filter(({ id }) =>
            stmIsLineEnabled(settings, id)
          ).length;

          badge.textContent = `${on}/${lines.length}`;
          badge.title = stmText("options.lines.summary", {
            on,
            shown: lines.length
          });
        }
      });

      return card;
    };

    renderNetwork = () => {
      const terms = foldText(lineQuery).split(/\s+/).filter(Boolean);
      const haystacks = new Map(
        STM_LINES.map((line) => [line.id, lineSearchText(line)])
      );
      const matching = (country, mode) =>
        STM_LINES.filter(
          (line) =>
            (country === STM_ANY || line.countryId === country) &&
            (mode === STM_ANY || line.mode === mode) &&
            terms.every((term) => haystacks.get(line.id).includes(term))
        );

      searching = terms.length > 0;
      shownLines = matching(countryFilter, modeFilter);
      shownCities = STM_CITIES.filter(({ id }) =>
        shownLines.some(({ cityId }) => cityId === id)
      );

      for (const chip of chips) {
        const left =
          chip.group === "stm-country"
            ? matching(chip.id, modeFilter)
            : matching(countryFilter, chip.id);

        chip.count.textContent = String(left.length);
        chip.face.classList.toggle("stm-chip-empty", left.length === 0);
      }

      cards.length = 0;
      networkRows.clear();
      list.replaceChildren();

      for (const city of shownCities) {
        // A search opens what it found, and so does a filter that has left
        // one city standing: either way there is nothing else on screen to
        // read, and a card that has to be opened to show the one answer is a
        // click asking for nothing.
        const open =
          searching || shownCities.length === 1 || openCities.has(city.id);

        list.append(
          createCityCard(
            city,
            shownLines.filter(({ cityId }) => cityId === city.id),
            open
          )
        );
      }

      empty.hidden = shownCities.length > 0;
      clear.hidden =
        !searching && countryFilter === STM_ANY && modeFilter === STM_ANY;
      updateFold();
      syncInputs();
    };

    // Everything that counts rather than everything that is drawn: a line
    // switched off changes these and nothing else on the page, so they are
    // brought up to date wherever the switches are.
    syncNetwork = () => {
      const on = shownLines.filter(({ id }) =>
        stmIsLineEnabled(settings, id)
      ).length;

      summary.textContent = stmText("options.lines.summary", {
        on,
        shown: shownLines.length
      });

      for (const card of cards) card.update();
    };

    renderNetwork();
  }

  // The licence asks for the credit to travel with the data, and this page
  // lists the whole catalogue rather than whatever one map happens to show.
  function buildCredits() {
    const parts = [`${stmText("credits.lead")} `];
    // By who is being credited rather than by operator, since one operator
    // running into two cities is still one name to thank.
    const credited = new Set();

    const creditLink = (href, label) => {
      const link = document.createElement("a");
      link.href = href;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = label;

      return link;
    };

    for (const { attribution } of STM_SYSTEMS) {
      if (credited.has(attribution.label)) continue;

      credited.add(attribution.label);

      if (parts.length > 1) parts.push(" · ");

      // The licence rides with the operator it covers: this page lists the
      // whole catalogue, and the catalogue spans more than one set of terms.
      parts.push(
        creditLink(attribution.terms, attribution.label),
        " (",
        creditLink(attribution.license.url, attribution.license.label),
        ")"
      );
    }

    creditsHost.append(...parts);
  }

  function createLocationHint() {
    const hint = document.createElement("p");
    hint.className = "stm-point-hint";

    const formats = document.createElement("span");
    formats.textContent = stmText("point.formats");

    const shortLink = document.createElement("span");
    shortLink.textContent = stmText("point.shortLinks");

    hint.append(formats, shortLink);

    return hint;
  }

  // Adding a point and editing one are the same form: an edit is an add that
  // starts filled in, and the panel on the map asks for exactly these fields.
  function createPointForm({ onCancel, onSubmit, point, submitLabel }) {
    const form = document.createElement("form");
    form.className = "stm-point-form";

    const label = document.createElement("input");
    label.name = "label";
    label.type = "text";
    label.placeholder = stmText("point.name");
    label.setAttribute("aria-label", stmText("point.name"));
    label.value = point?.label ?? "";

    // type="url" would reject a pasted coordinate pair before submit ever
    // fires, and its built-in bubble is not in our wording. Validate here.
    const location = document.createElement("input");
    location.name = "location";
    location.type = "text";
    location.autocomplete = "off";
    location.spellcheck = false;
    location.placeholder = stmText("point.location");
    location.setAttribute("aria-label", stmText("point.location"));
    location.value = point ? stmFormatCoordinates(point.coordinates) : "";

    const error = document.createElement("p");
    error.className = "stm-point-error";
    error.setAttribute("role", "alert");
    error.hidden = true;

    const setError = (message) => {
      error.textContent = message;
      error.hidden = !message;
      location.setAttribute("aria-invalid", message ? "true" : "false");
    };

    location.addEventListener("input", () => setError(""));

    const color = document.createElement("input");
    color.name = "color";
    color.type = "color";
    color.value = point?.color ?? STM_DEFAULT_POINT_COLOR;
    color.setAttribute("aria-label", stmText("point.color"));

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "stm-point-submit";
    submit.textContent = submitLabel;

    const actions = document.createElement("div");
    actions.className = "stm-point-form-actions";
    actions.append(color, submit);

    if (onCancel) {
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "stm-point-cancel";
      cancel.textContent = stmText("point.cancel");
      cancel.addEventListener("click", onCancel);
      actions.append(cancel);
    }

    form.append(label, location);

    // The reference belongs under the add form, which is always on screen.
    // An edit opens in place of a row and should not tower over the rest of
    // the list; a mistake made there still gets the same error message.
    if (!point) form.append(createLocationHint());

    form.append(error, actions);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const raw = String(new FormData(form).get("location") ?? "");
      const coordinates = stmCoordinatesFromLocation(raw);

      if (!coordinates) {
        setError(stmLocationErrorMessage(raw));
        location.focus();
        return;
      }

      await onSubmit({ color: color.value, coordinates, label: label.value });
    });

    return {
      element: form,
      reset() {
        form.reset();
        // reset() restores the value attributes, which these inputs never
        // had: they were given their values as properties.
        color.value = STM_DEFAULT_POINT_COLOR;
        label.value = "";
        location.value = "";
        setError("");
      }
    };
  }

  function createPointRow(point) {
    const row = document.createElement("div");
    row.className = "stm-point-row";

    const text = document.createElement("div");
    text.className = "stm-point-text";

    const name = document.createElement("span");
    name.className = "stm-point-name";

    const chip = document.createElement("span");
    chip.className = "stm-swatch";
    chip.style.setProperty("--stm-swatch", point.color);

    const title = document.createElement("span");
    // A point saved without a name is still a place on the map, and it has
    // to be findable in this list to be edited or deleted.
    title.textContent = point.label?.trim() || stmText("point.unnamed");

    if (!point.label?.trim()) title.className = "stm-point-unnamed";

    name.append(chip, title);

    const coordinates = document.createElement("span");
    coordinates.className = "stm-point-coordinates";
    coordinates.textContent = stmFormatCoordinates(point.coordinates, 5);

    text.append(name, coordinates);

    const actions = document.createElement("div");
    actions.className = "stm-point-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = stmText("point.edit");
    edit.addEventListener("click", () => {
      editingId = point.id;
      renderPoints();
      pointList.querySelector(".stm-point-form input")?.focus();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "stm-point-remove";
    remove.textContent = stmText("point.remove");
    remove.addEventListener("click", () =>
      savePoints(points.filter(({ id }) => id !== point.id))
    );

    actions.append(edit, remove);
    row.append(text, actions);

    return row;
  }

  function renderPoints() {
    pointList.replaceChildren();

    if (!points.length) {
      const empty = document.createElement("p");
      empty.className = "stm-point-empty";
      empty.textContent = stmText("options.points.empty");
      pointList.append(empty);
      return;
    }

    for (const point of points) {
      if (point.id !== editingId) {
        pointList.append(createPointRow(point));
        continue;
      }

      const form = createPointForm({
        onCancel: () => {
          editingId = undefined;
          renderPoints();
        },
        onSubmit: async (values) => {
          editingId = undefined;
          await savePoints(
            points.map((entry) =>
              entry.id === point.id ? { ...entry, ...values } : entry
            )
          );
        },
        point,
        submitLabel: stmText("point.save")
      });

      pointList.append(form.element);
    }
  }

  function buildPointsSection() {
    const section = document.createElement("section");

    const heading = document.createElement("h2");
    heading.textContent = stmText("options.points.title");

    pointList = document.createElement("div");
    pointList.className = "stm-point-list";

    const addHeading = document.createElement("p");
    addHeading.className = "stm-point-add-heading";
    addHeading.textContent = stmText("point.addTitle");

    const add = createPointForm({
      onSubmit: async (values) => {
        await savePoints([...points, { id: crypto.randomUUID(), ...values }]);
        add.reset();
      },
      submitLabel: stmText("point.add")
    });

    section.append(heading, pointList, addHeading, add.element);
    sectionsHost.append(section);
    renderPoints();
  }

  function syncInputs() {
    masterInput.checked = enabled;
    document.body.classList.toggle("stm-off", !enabled);
    // A stored language this build has no words for is followed as the
    // browser's choice, and the list says so rather than showing a blank.
    languageInput.value = Object.hasOwn(STM_LOCALES, settings.language)
      ? settings.language
      : STM_AUTO_LANGUAGE;

    for (const control of [...rows.values(), ...networkRows.values()]) {
      // A switch drives something that only exists inside whatever it hangs
      // under, so it is held rather than left to look as though it still does
      // something. Any switch above it being off is enough: a line answers to
      // its system and its city as well as to itself.
      let held = false;

      for (let above = control.parent; above && !held; above = above.parent) {
        held = readSetting(above.key) === false;
      }

      control.sync(readSetting(control.key) !== false, held);
    }

    syncNetwork();
  }

  // The whole page, from nothing, in the current language. Only the storage it
  // is drawn from survives a rebuild: a half-typed point is lost with the form
  // it was typed into, which is a fair price for a change of language.
  function build() {
    rows.clear();
    masterSection.replaceChildren();
    languageSection.replaceChildren();
    sectionsHost.replaceChildren();
    creditsHost.replaceChildren();

    document.documentElement.lang = stmLocale;

    for (const element of document.querySelectorAll("[data-stm-text]")) {
      element.textContent = stmText(element.dataset.stmText);
    }

    buildMaster();
    buildLanguageSection();
    buildSitesSection();

    for (const section of sections()) buildSection(section);

    buildLinesSection();
    buildPointsSection();
    buildCredits();
    syncInputs();
  }

  // Everything on the page was written in the language it was built in, so a
  // new language is a rebuild, and anything else is only switches to sync. The
  // list that asked for the rebuild is rebuilt with the rest, and is handed
  // the focus back so a keyboard is not dropped at the top of the page.
  function refresh() {
    if (!stmUseLanguage(settings.language)) {
      syncInputs();
      return;
    }

    const refocus = document.activeElement === languageInput;

    build();

    if (refocus) languageInput.focus();
  }

  // The toolbar button writes the master switch behind this page's back, and
  // a second copy of the page may be open in another window.
  function handleStorageChange(changes, area) {
    if (area !== "local") return;

    if (changes[STM_ENABLED_KEY]) {
      enabled = changes[STM_ENABLED_KEY].newValue ?? true;
    }

    if (changes[STM_SETTINGS_KEY]) {
      settings = stmMergeSettings(changes[STM_SETTINGS_KEY].newValue);
    }

    if (changes[STM_ENABLED_KEY] || changes[STM_SETTINGS_KEY]) refresh();

    // The panel on the map writes the same list, so a point added or deleted
    // there lands here. An edit in progress whose point has just gone is an
    // edit with nothing left to save into.
    if (changes[STM_CUSTOM_POINTS_KEY]) {
      points = changes[STM_CUSTOM_POINTS_KEY].newValue ?? [];

      if (!points.some(({ id }) => id === editingId)) editingId = undefined;

      renderPoints();
    }
  }

  // Nothing is built before the settings are in, because the settings say
  // which language to build in. Changes are listened for from then on, once
  // there is a page for them to land on.
  async function load() {
    const stored = await chrome.storage.local.get([
      STM_CUSTOM_POINTS_KEY,
      STM_ENABLED_KEY,
      STM_SETTINGS_KEY
    ]);

    enabled = stored[STM_ENABLED_KEY] ?? true;
    settings = stmMergeSettings(stored[STM_SETTINGS_KEY]);
    points = stored[STM_CUSTOM_POINTS_KEY] ?? [];
    stmUseLanguage(settings.language);
    build();
    main.hidden = false;
    chrome.storage.onChanged.addListener(handleStorageChange);
  }

  document.querySelector("#stm-reset").addEventListener("click", async () => {
    if (!confirm(stmText("options.reset.confirm"))) return;

    enabled = true;
    settings = stmMergeSettings();
    await chrome.storage.local.set({
      [STM_ENABLED_KEY]: enabled,
      [STM_SETTINGS_KEY]: settings
    });
    refresh();
  });

  load();
})();
