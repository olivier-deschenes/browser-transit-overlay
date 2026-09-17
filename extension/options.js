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
            hint: stmText("options.cityShortcut.hint"),
            key: "cityShortcut",
            label: stmText("options.cityShortcut"),
            parent: "networkStatus"
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
  const rows = new Map();
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

    rows.set(definition.key, { depth, input, key: definition.key, parent, row });
    section.append(row);
  }

  function createSection(title, actions) {
    const section = document.createElement("section");
    const heading = document.createElement("h2");
    heading.textContent = title;

    if (actions) {
      const header = document.createElement("div");
      header.className = "stm-section-header";
      header.append(heading, actions);
      section.append(header);
    } else {
      section.append(heading);
    }

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

  // The registry's three levels, drawn as three depths of switch. A level
  // with nothing to choose between is left out rather than given a row that
  // could only repeat what the row under it already says: one city is the
  // whole catalogue, and a lone operator in a city is all of that city.
  function buildLinesSection() {
    const actions = document.createElement("div");
    actions.className = "stm-bulk";

    for (const [label, value] of [
      [stmText("options.lines.allOn"), true],
      [stmText("options.lines.allOff"), false]
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", async () => {
        for (const { id } of STM_LINES) settings.lines[id] = value;

        // Switching everything back on has to reach the rows above the lines
        // too, or a system left off would go on hiding lines that now say
        // they are on. Switching everything off needs only the lines: holding
        // their parents off as well would leave a section of dimmed rows with
        // nothing in it left to click.
        if (value) {
          for (const { id } of STM_CITIES) settings.cities[id] = true;
          for (const { id } of STM_SYSTEMS) settings.systems[id] = true;
        }

        await saveSettings();
        syncInputs();
      });
      actions.append(button);
    }

    const section = createSection(stmText("options.lines.title"), actions);

    for (const city of STM_CITIES) {
      const cityKey = `cities.${city.id}`;
      const hasCityRow = STM_CITIES.length > 1;

      if (hasCityRow) {
        addRow(section, {
          key: cityKey,
          label: stmText(`city.${city.id}.name`)
        });
      }

      const underCity = hasCityRow ? cityKey : undefined;

      for (const system of city.systems) {
        const systemKey = `systems.${city.id}:${system.id}`;
        const hasSystemRow = city.systems.length > 1;

        if (hasSystemRow) {
          addRow(section, {
            key: systemKey,
            label: stmText(`system.${city.id}:${system.id}.name`),
            parent: underCity
          });
        }

        const underSystem = hasSystemRow ? systemKey : underCity;

        for (const line of system.lines) {
          const lineId = `${city.id}:${system.id}:${line.id}`;

          addRow(section, {
            hint: stmText(`line.${lineId}.detail`),
            key: `lines.${lineId}`,
            label: stmText(`line.${lineId}.name`),
            parent: underSystem,
            swatch: line.color
          });
        }
      }
    }
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

    for (const { input, key, parent, row } of rows.values()) {
      input.checked = readSetting(key) !== false;

      // A switch drives something that only exists inside whatever it hangs
      // under, so it is held rather than left to look as though it still does
      // something. Any switch above it being off is enough: a line answers to
      // its system and its city as well as to itself.
      let held = false;

      for (let above = parent; above && !held; above = above.parent) {
        held = readSetting(above.key) === false;
      }

      input.disabled = held;
      row.classList.toggle("stm-row-held", held);
    }
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
