(() => {
  // The rows are described rather than written out in options.html so that a
  // new switch is one entry here plus its default in settings.js, and so the
  // dependency between a switch and the one it sits under is stated once.
  const SECTIONS = [
    {
      rows: [
        {
          hint: "La carte de la liste des logements et celle qui s’ouvre depuis une annonce.",
          key: "interactiveMaps",
          label: "Cartes interactives"
        },
        {
          hint: "L’image fixe affichée à côté de l’adresse d’une annonce. Marketplace seulement : une annonce Centris n’affiche aucune carte.",
          key: "listingPreview",
          label: "Aperçu de carte des annonces"
        }
      ],
      title: "Où afficher le réseau"
    },
    {
      rows: [
        { key: "stations", label: "Stations" },
        {
          hint: "Affichés à partir d’un certain niveau de zoom seulement.",
          key: "stationLabels",
          label: "Noms des stations",
          parent: "stations"
        },
        {
          hint: "Vos points apparaissent sur les cartes et dans l’aperçu des annonces.",
          key: "points",
          label: "Points de repère"
        }
      ],
      title: "Éléments affichés"
    },
    {
      rows: [
        {
          hint: "Le bouton « Ajouter un point » et sa liste.",
          key: "pointsTool",
          label: "Ajout de points de repère"
        },
        {
          hint: "Prévient quand la carte est loin du réseau.",
          key: "networkStatus",
          label: "Avis « Réseau hors champ »"
        },
        {
          hint: "Raccourcis vers les logements de chaque ville prise en charge. Marketplace seulement.",
          key: "cityShortcut",
          label: "Boutons « Voir les villes »",
          parent: "networkStatus"
        },
        {
          hint: "L’engrenage qui ouvre cette page depuis la carte.",
          key: "settingsShortcut",
          label: "Bouton de réglages"
        }
      ],
      title: "Outils sur la carte"
    }
  ];

  // Every switch on the page, by the settings key it writes, and each one
  // holding on to the switch it hangs under. That chain is what a held row is
  // read off: a line answers to its system and its city as well as to itself.
  const rows = new Map();
  const sectionsHost = document.querySelector("#stm-sections");
  const masterSection = document.querySelector("#stm-master-section");

  let enabled = true;
  let settings = stmMergeSettings();
  let points = [];
  let masterInput;
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

  function createRow({ depth, hint, label, swatch }) {
    const row = document.createElement("label");
    row.className = "stm-row";

    // How far in the row sits, rather than which level it is: the indent and
    // the elbow drawn in the gutter are both worked out from the number, so a
    // third level needs no third class in the stylesheet.
    if (depth) {
      row.classList.add("stm-row-nested");
      row.style.setProperty("--stm-depth", depth);
    }

    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "stm-switch";
    input.setAttribute("role", "switch");

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

    row.append(text, input);

    return { input, row };
  }

  function buildMaster() {
    const { input, row } = createRow({
      hint: "Coupe l’extension partout, sans toucher aux réglages ci-dessous. Le bouton de la barre d’outils fait la même chose.",
      label: "Activer l’extension"
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

  // The sites are their own section rather than rows in "Où afficher le
  // réseau": that one is about which kind of map, this one is about which
  // site, and the two switches multiply rather than overlap.
  function buildSitesSection() {
    const section = createSection("Sites");

    for (const { detail, id, name } of STM_SITES) {
      addRow(section, { hint: detail, key: `sites.${id}`, label: name });
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
      ["Tout activer", true],
      ["Tout désactiver", false]
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

    const section = createSection("Lignes", actions);

    for (const city of STM_CITIES) {
      const cityKey = `cities.${city.id}`;
      const hasCityRow = STM_CITIES.length > 1;

      if (hasCityRow) addRow(section, { key: cityKey, label: city.name });

      const underCity = hasCityRow ? cityKey : undefined;

      for (const system of city.systems) {
        const systemKey = `systems.${city.id}:${system.id}`;
        const hasSystemRow = city.systems.length > 1;

        if (hasSystemRow) {
          addRow(section, {
            key: systemKey,
            label: system.name,
            parent: underCity
          });
        }

        const underSystem = hasSystemRow ? systemKey : underCity;

        for (const line of system.lines) {
          addRow(section, {
            hint: line.detail,
            key: `lines.${city.id}:${system.id}:${line.id}`,
            label: line.name,
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
    const host = document.querySelector("#stm-credits");
    const parts = ["Données adaptées : "];
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

    host.append(...parts);
  }

  function createLocationHint() {
    const hint = document.createElement("p");
    hint.className = "stm-point-hint";

    const formats = document.createElement("span");
    formats.textContent = STM_LOCATION_HINT;

    const shortLink = document.createElement("span");
    shortLink.textContent = STM_SHORT_LINK_WARNING;

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
    label.placeholder = "Nom";
    label.setAttribute("aria-label", "Nom");
    label.value = point?.label ?? "";

    // type="url" would reject a pasted coordinate pair before submit ever
    // fires, and its built-in bubble is not in our wording. Validate here.
    const location = document.createElement("input");
    location.name = "location";
    location.type = "text";
    location.autocomplete = "off";
    location.spellcheck = false;
    location.placeholder = STM_LOCATION_LABEL;
    location.setAttribute("aria-label", STM_LOCATION_LABEL);
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
    color.setAttribute("aria-label", "Couleur");

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
      cancel.textContent = "Annuler";
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
    title.textContent = point.label?.trim() || "Sans nom";

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
    edit.textContent = "Modifier";
    edit.addEventListener("click", () => {
      editingId = point.id;
      renderPoints();
      pointList.querySelector(".stm-point-form input")?.focus();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "stm-point-remove";
    remove.textContent = "Supprimer";
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
      empty.textContent =
        "Aucun point enregistré. Ajoutez-en un ci-dessous, ou depuis la carte.";
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
        submitLabel: "Enregistrer"
      });

      pointList.append(form.element);
    }
  }

  function buildPointsSection() {
    const section = document.createElement("section");

    const heading = document.createElement("h2");
    heading.textContent = "Points de repère";

    pointList = document.createElement("div");
    pointList.className = "stm-point-list";

    const addHeading = document.createElement("p");
    addHeading.className = "stm-point-add-heading";
    addHeading.textContent = "Ajouter un point";

    const add = createPointForm({
      onSubmit: async (values) => {
        await savePoints([...points, { id: crypto.randomUUID(), ...values }]);
        add.reset();
      },
      submitLabel: "Ajouter"
    });

    section.append(heading, pointList, addHeading, add.element);
    sectionsHost.append(section);
    renderPoints();
  }

  function syncInputs() {
    masterInput.checked = enabled;
    document.body.classList.toggle("stm-off", !enabled);

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

  async function load() {
    const stored = await chrome.storage.local.get([
      STM_CUSTOM_POINTS_KEY,
      STM_ENABLED_KEY,
      STM_SETTINGS_KEY
    ]);

    enabled = stored[STM_ENABLED_KEY] ?? true;
    settings = stmMergeSettings(stored[STM_SETTINGS_KEY]);
    points = stored[STM_CUSTOM_POINTS_KEY] ?? [];
    syncInputs();
    renderPoints();
  }

  buildMaster();
  buildSitesSection();

  for (const section of SECTIONS) buildSection(section);

  buildLinesSection();
  buildPointsSection();
  buildCredits();

  document.querySelector("#stm-reset").addEventListener("click", async () => {
    if (!confirm("Rétablir tous les réglages par défaut ?")) return;

    enabled = true;
    settings = stmMergeSettings();
    await chrome.storage.local.set({
      [STM_ENABLED_KEY]: enabled,
      [STM_SETTINGS_KEY]: settings
    });
    syncInputs();
  });

  // The toolbar button writes the master switch behind this page's back, and
  // a second copy of the page may be open in another window.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;

    if (changes[STM_ENABLED_KEY]) {
      enabled = changes[STM_ENABLED_KEY].newValue ?? true;
    }

    if (changes[STM_SETTINGS_KEY]) {
      settings = stmMergeSettings(changes[STM_SETTINGS_KEY].newValue);
    }

    if (changes[STM_ENABLED_KEY] || changes[STM_SETTINGS_KEY]) syncInputs();

    // The panel on the map writes the same list, so a point added or deleted
    // there lands here. An edit in progress whose point has just gone is an
    // edit with nothing left to save into.
    if (changes[STM_CUSTOM_POINTS_KEY]) {
      points = changes[STM_CUSTOM_POINTS_KEY].newValue ?? [];

      if (!points.some(({ id }) => id === editingId)) editingId = undefined;

      renderPoints();
    }
  });

  load();
})();
