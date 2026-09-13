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
          hint: "Raccourci vers les logements de Montréal. Marketplace seulement.",
          key: "montrealShortcut",
          label: "Bouton « Voir Montréal »",
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

  const inputs = new Map();
  const rows = [];
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

  function savePoints(next) {
    return chrome.storage.local.set({ [STM_CUSTOM_POINTS_KEY]: next });
  }

  function createRow({ hint, label, swatch }) {
    const row = document.createElement("label");
    row.className = "stm-row";

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

  function buildSection({ rows: definitions, title }) {
    const section = document.createElement("section");
    const heading = document.createElement("h2");
    heading.textContent = title;
    section.append(heading);

    for (const definition of definitions) {
      const { input, row } = createRow(definition);

      if (definition.parent) row.classList.add("stm-row-child");

      input.addEventListener("change", async () => {
        settings[definition.key] = input.checked;
        await saveSettings();
        syncInputs();
      });

      inputs.set(definition.key, input);
      rows.push({ ...definition, input, row });
      section.append(row);
    }

    sectionsHost.append(section);
  }

  // The sites are their own section rather than rows in "Où afficher le
  // réseau": that one is about which kind of map, this one is about which
  // site, and the two switches multiply rather than overlap.
  function buildSitesSection() {
    const section = document.createElement("section");

    const heading = document.createElement("h2");
    heading.textContent = "Sites";
    section.append(heading);

    for (const { detail, id, name } of STM_SITES) {
      const { input, row } = createRow({ hint: detail, label: name });

      input.addEventListener("change", async () => {
        settings.sites[id] = input.checked;
        await saveSettings();
        syncInputs();
      });

      inputs.set(`sites.${id}`, input);
      rows.push({ input, key: `sites.${id}`, row });
      section.append(row);
    }

    sectionsHost.append(section);
  }

  function buildLinesSection() {
    const section = document.createElement("section");

    const heading = document.createElement("h2");
    heading.textContent = "Lignes";

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
        await saveSettings();
        syncInputs();
      });
      actions.append(button);
    }

    const header = document.createElement("div");
    header.className = "stm-section-header";
    header.append(heading, actions);
    section.append(header);

    for (const { color, detail, id, name } of STM_LINES) {
      const { input, row } = createRow({
        hint: detail,
        label: name,
        swatch: color
      });

      input.addEventListener("change", async () => {
        settings.lines[id] = input.checked;
        await saveSettings();
        syncInputs();
      });

      inputs.set(`lines.${id}`, input);
      rows.push({ input, key: `lines.${id}`, row });
      section.append(row);
    }

    sectionsHost.append(section);
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

  // A line switched off takes its stations with it, so the two sections have
  // to be read together rather than one at a time.
  function syncInputs() {
    masterInput.checked = enabled;
    document.body.classList.toggle("stm-off", !enabled);

    for (const { id } of STM_LINES) {
      inputs.get(`lines.${id}`).checked = settings.lines[id] !== false;
    }

    for (const { id } of STM_SITES) {
      inputs.get(`sites.${id}`).checked = settings.sites[id] !== false;
    }

    for (const { input, key, parent, row } of rows) {
      if (key.startsWith("lines.") || key.startsWith("sites.")) continue;

      input.checked = settings[key] !== false;

      // A child switch drives something that only exists inside its parent,
      // so it is held rather than left to look like it still does something.
      const held = Boolean(parent) && settings[parent] === false;

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
