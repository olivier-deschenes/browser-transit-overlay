import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../extension/', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const context = vm.createContext({});
vm.runInContext(read('networks.js'), context);
const registry = vm.runInContext('({ STM_CITIES, STM_CITIES_BY_COUNTRY, STM_COUNTRIES, STM_DEFAULT_CITY_ID, STM_LINES, STM_MODES, STM_SYSTEMS, stmCityAt, stmCityById, stmLineBadge, stmLineById, stmLineInk })', context);
const { STM_CITIES, STM_COUNTRIES, STM_LINES, STM_MODES, STM_SYSTEMS } = registry;
// The registry is evaluated in its own realm, so anything it maps or filters
// comes back as that realm's array. Sorted copies made here are this one's.
const sorted = (values) => [...values].sort();

const SEGMENT = /^[a-z0-9-]+$/;
const geometry = new Map(STM_CITIES.map((city) => [city.id, JSON.parse(read(city.data))]));

test('ids are lowercase segments that spell out the levels above them', () => {
  for (const city of STM_CITIES) {
    assert.match(city.id, SEGMENT, city.id);
    for (const system of city.systems) {
      assert.match(system.id, SEGMENT, system.id);
      for (const line of system.lines) assert.match(line.id, SEGMENT, line.id);
    }
  }
  assert.deepEqual(sorted(STM_SYSTEMS.map(({ id }) => id)), sorted(new Set(STM_SYSTEMS.map(({ id }) => id))));
  assert.deepEqual(sorted(STM_LINES.map(({ id }) => id)), sorted(new Set(STM_LINES.map(({ id }) => id))));
  for (const line of STM_LINES) {
    assert.equal(line.id.split(':').length, 3, line.id);
    assert.equal(line.id.startsWith(`${line.systemId}:`), true, line.id);
    assert.equal(line.systemId.startsWith(`${line.cityId}:`), true, line.systemId);
  }
  assert.ok(registry.stmCityById(registry.STM_DEFAULT_CITY_ID));
  assert.equal(registry.stmLineById(STM_LINES[0].id), STM_LINES[0]);
});

// Neither is a level of id, so nothing checks them by spelling a key out: what
// keeps them honest is that the settings page offers exactly these and
// i18n.test.mjs holds every language to naming them.
test('every city names its country and every line its kind of service', () => {
  for (const city of STM_CITIES) {
    assert.match(city.country, SEGMENT, city.id);
    for (const system of city.systems) assert.match(system.mode, SEGMENT, system.id);
  }

  // A line takes its operator's kind of service unless it says otherwise, so
  // every one of them has one either way.
  for (const line of STM_LINES) {
    assert.ok(STM_MODES.includes(line.mode), line.id);
    assert.equal(line.countryId, registry.stmCityById(line.cityId).country, line.id);
  }

  // Derived rather than declared, so what they hold is every country and kind
  // of service the catalogue has, each of them once.
  assert.deepEqual(sorted(STM_COUNTRIES), sorted(new Set(STM_CITIES.map(({ country }) => country))));
  assert.deepEqual(sorted(STM_MODES), sorted(new Set(STM_LINES.map(({ mode }) => mode))));
});

// What each of these is called is up to each language, and i18n.test.mjs
// checks that every language names every one of them.
test('every line has a colour, and every operator somebody to credit', () => {
  for (const line of STM_LINES) {
    assert.match(line.color, /^#[0-9a-f]{6}$/i, line.id);
  }
  // Nothing is drawn without a name to credit and the terms that name was
  // handed out under. The licence sits on the operator rather than on the
  // catalogue, because the catalogue spans more than one set of terms.
  for (const system of STM_SYSTEMS) {
    assert.ok(system.attribution.label.trim(), system.id);
    assert.match(system.attribution.terms, /^https:\/\//, system.id);
    assert.ok(system.attribution.license.label.trim(), system.id);
    assert.match(system.attribution.license.url, /^https:\/\//, system.id);
  }
});

// The city panel on the map offers the catalogue a country at a time and never
// walks it to find out what is in one, so the grouping has to hold every city
// exactly once. A city missing from it is a city with no way to be reached.
test('the catalogue grouped by country is the catalogue', () => {
  const grouped = [...registry.STM_CITIES_BY_COUNTRY];
  const listed = grouped.flatMap(([, cities]) => cities);

  assert.deepEqual(grouped.map(([country]) => country), [...STM_COUNTRIES]);
  assert.equal(listed.length, STM_CITIES.length);
  assert.deepEqual(sorted(listed.map(({ id }) => id)), sorted(STM_CITIES.map(({ id }) => id)));

  for (const [country, cities] of grouped) {
    for (const city of cities) assert.equal(city.country, country, city.id);
  }
});

// The registry declares the lines and the build draws them. Either one carrying a
// line the other has never heard of is a line that switches nothing, or a
// switch that draws nothing.
test('declared lines and bundled geometry are the same set', () => {
  const shipped = new Set(readdirSync(new URL('networks/', root)).map((name) => `networks/${name}`));
  assert.deepEqual(sorted(shipped), sorted(STM_CITIES.map(({ data }) => data)));

  for (const city of STM_CITIES) {
    const data = geometry.get(city.id);
    // A geometry file is named for its city, so the ids inside it leave the
    // city off: "stm:1" under montreal.json is "montreal:stm:1".
    const drawn = new Set(data.lines.map(({ id }) => `${city.id}:${id}`));
    const declared = STM_LINES.filter(({ cityId }) => cityId === city.id).map(({ id }) => id);
    assert.deepEqual(sorted(drawn), sorted(declared), city.id);
    assert.match(data.notice, /\S/, city.id);
  }
});

test('stations carry declared lines and real coordinates', () => {
  for (const city of STM_CITIES) {
    const data = geometry.get(city.id);
    assert.ok(data.stations.length > 0, city.id);
    for (const station of data.stations) {
      assert.ok(station.name.trim(), city.id);
      assert.ok(station.lines.length > 0, station.name);
      for (const id of station.lines) assert.ok(registry.stmLineById(`${city.id}:${id}`), `${city.id}:${id}`);
    }
  }
});

// Picking the city from a viewport is only trustworthy if a city's box holds
// everything that city draws; a line reaching outside it is a line that would
// vanish as soon as the map followed it there.
test('each city’s bounds contain its own geometry', () => {
  for (const city of STM_CITIES) {
    const [[west, south], [east, north]] = city.bounds;
    assert.ok(west < east && south < north, city.id);

    const data = geometry.get(city.id);
    const points = [
      ...data.lines.flatMap(({ paths }) => paths.flat()),
      ...data.stations.map(({ coordinates }) => coordinates)
    ];

    for (const [longitude, latitude] of points) {
      assert.ok(Number.isFinite(longitude) && longitude >= west && longitude <= east, `${city.id} ${longitude}`);
      assert.ok(Number.isFinite(latitude) && latitude >= south && latitude <= north, `${city.id} ${latitude}`);
    }

    for (const { paths } of data.lines) {
      assert.ok(paths.length > 0, city.id);
      for (const path of paths) assert.ok(path.length >= 2, city.id);
    }

    // The origin is what every drawn coordinate is measured from, so a city
    // whose origin sat outside its own box would push the whole network out
    // to the far numbers the local coordinates exist to avoid.
    const [originLongitude, originLatitude] = city.origin;
    assert.ok(originLongitude >= west && originLongitude <= east, city.id);
    assert.ok(originLatitude >= south && originLatitude <= north, city.id);
  }
});

test('a viewport resolves to one city, or to none at all', () => {
  for (const city of STM_CITIES) {
    assert.equal(registry.stmCityAt(city.origin), city, city.id);
    const [[west, south], [east, north]] = city.bounds;
    assert.equal(registry.stmCityAt([west - 1, south - 1]), undefined, city.id);
    assert.equal(registry.stmCityAt([east + 1, north + 1]), undefined, city.id);

    for (const other of STM_CITIES) {
      if (other === city) continue;
      const [[otherWest, otherSouth], [otherEast, otherNorth]] = other.bounds;
      const overlaps = west <= otherEast && otherWest <= east && south <= otherNorth && otherSouth <= north;
      assert.equal(overlaps, false, `${city.id} overlaps ${other.id}`);
    }
  }
  assert.equal(registry.stmCityAt([0, 0]), undefined);
});

// The bullet a line is known by is drawn twice over — as a grid per city on
// the settings page, and for the city being drawn in the panel on the map — so
// what goes on one is the registry's answer rather than either form's. The ink
// is the half of that answer that can be got wrong quietly: a catalogue that
// runs from the Toulouse yellow to the Paris purple has no one ink, and a
// colour picked for a new line is the moment the wrong one would ship.
test('every line has a bullet whose ink stays readable on its colour', () => {
  const { stmLineBadge, stmLineInk } = registry;

  // The operator's own printed name for the line, raised at the first
  // character only: 3bis is not 3BIS.
  assert.equal(stmLineBadge({ id: 'montreal:stm:1' }), '1');
  assert.equal(stmLineBadge({ id: 'montreal:rem:a' }), 'A');
  assert.equal(stmLineBadge({ id: 'paris:metro:3bis' }), '3bis');

  const channel = (value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  const luminance = (color) => {
    const [red, green, blue] = [1, 3, 5].map((offset) => channel(parseInt(color.slice(offset, offset + 2), 16) / 255));
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };

  // Unless the line spells its bullet out itself, because its network prints
  // it in capitals a lowercase id cannot carry.
  assert.equal(stmLineBadge({ badge: 'SIR', id: 'new-york:sir:sir' }), 'SIR');

  for (const line of STM_LINES) {
    const derived = line.id.slice(line.id.lastIndexOf(':') + 1).replace(/^./, (first) => first.toUpperCase());
    assert.equal(stmLineBadge(line), line.badge ?? derived, line.id);
    if (line.badge !== undefined) {
      assert.notEqual(line.badge, derived, `${line.id} spells out the bullet its id already gives`);
      assert.equal(line.badge.toLowerCase().replaceAll('–', '-'), line.id.slice(line.id.lastIndexOf(':') + 1), `${line.id} ${line.badge}`);
    }

    const ink = stmLineInk(line.color);
    assert.ok(ink === '#000000' || ink === '#ffffff', `${line.id} ${ink}`);

    // What the ink actually buys, against the 4.5:1 that 10px bold text has
    // to clear. Whichever of the two is chosen, the other would be worse.
    const [lighter, darker] = [luminance(ink), luminance(line.color)].sort((a, b) => b - a);
    const contrast = (lighter + 0.05) / (darker + 0.05);
    assert.ok(contrast >= 4.5, `${line.id} ${line.color} on ${ink}: ${contrast.toFixed(2)}:1`);
  }
});
