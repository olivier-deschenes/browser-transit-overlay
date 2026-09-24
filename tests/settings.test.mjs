import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const context = vm.createContext({});
// The defaults are derived from the registry and the language list at load, so
// both have to be there first — the same order the manifest, the options page
// and the worker use.
for (const name of ['i18n.js', 'networks.js', 'settings.js']) {
  vm.runInContext(readFileSync(new URL(`../extension/${name}`, import.meta.url), 'utf8'), context);
}
const settings = vm.runInContext('({ stmCoordinatesFromLocation, stmIsLineEnabled, stmMergeSettings, stmFormatCoordinates, stmLocationErrorMessage, stmOnlyCity, stmUseLanguage, STM_AUTO_LANGUAGE, STM_CITIES, STM_DEFAULT_SETTINGS, STM_LINES })', context);
const [line] = settings.STM_LINES;
const [cityId, systemId] = line.id.split(':');
const plain = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

test('coordinates are stored longitude first and preserve precision when editing', () => {
  const input = '45.501912345, -73.567412345';
  const coordinates = settings.stmCoordinatesFromLocation(input);
  assert.deepEqual(plain(coordinates), [-73.567412345, 45.501912345]);
  assert.equal(settings.stmFormatCoordinates(coordinates), input);
});

test('place coordinates take precedence over the Google Maps viewport', () => {
  const url = 'https://www.google.com/maps/place/Test/@45.6,-73.8,12z/data=!3d45.5!4d-73.6';
  assert.deepEqual(plain(settings.stmCoordinatesFromLocation(url)), [-73.6, 45.5]);
});

test('encoded query coordinates and zero coordinates are accepted', () => {
  assert.deepEqual(plain(settings.stmCoordinatesFromLocation('https://www.google.com/maps?query=45.5%2C-73.6')), [-73.6, 45.5]);
  assert.deepEqual(plain(settings.stmCoordinatesFromLocation('0, 0')), [0, 0]);
});

test('invalid, missing, and out-of-range coordinates are rejected', () => {
  for (const value of ['', 'not a location', '91, 0', '0, -181', 'NaN, 5', '45.5.1, -73.6', 'https://maps.app.goo.gl/example']) {
    assert.equal(settings.stmCoordinatesFromLocation(value), undefined, value);
  }
});

test('short-link errors explain how to obtain full coordinates, in the chosen language', () => {
  settings.stmUseLanguage('fr');
  assert.match(settings.stmLocationErrorMessage('https://maps.app.goo.gl/example'), /Lien court/);
  assert.match(settings.stmLocationErrorMessage(''), /Entrez/);

  settings.stmUseLanguage('en');
  assert.match(settings.stmLocationErrorMessage('https://maps.app.goo.gl/example'), /Short link/);
  assert.match(settings.stmLocationErrorMessage(''), /Enter/);
  assert.match(settings.stmLocationErrorMessage('not a location'), /No coordinates/);
});

test('saved preferences survive new defaults without sharing mutable state', () => {
  const other = settings.STM_LINES.find(({ id }) => id !== line.id).id;
  const stored = { stations: false, lines: { [line.id]: false }, sites: { centris: false } };
  const merged = settings.stmMergeSettings(stored);
  assert.equal(merged.stations, false);
  // Nobody has picked a language yet, so the browser's is the one followed.
  assert.equal(merged.language, settings.STM_AUTO_LANGUAGE);
  assert.equal(settings.stmMergeSettings({ language: 'fr' }).language, 'fr');
  assert.equal(merged.lines[line.id], false);
  assert.equal(merged.lines[other], true);
  assert.equal(merged.sites.centris, false);
  assert.equal(merged.sites.facebook, true);
  // An operator absent from storage is one this build has added, and it ships
  // switched on rather than needing a migration to turn it on. A city added
  // the same way ships off instead, because only one city is ever on and the
  // one that is on is the one somebody picked.
  assert.equal(merged.systems[`${cityId}:${systemId}`], true);
  assert.equal(merged.cities[cityId], true);
  assert.equal(merged.cities[settings.STM_CITIES[1].id], false);
  merged.lines[other] = false;
  assert.equal(settings.stmMergeSettings().lines[other], true);
  assert.deepEqual(stored, { stations: false, lines: { [line.id]: false }, sites: { centris: false } });
});

// The map draws the city its viewport is over and no other, so the cities are
// a choice between them rather than a row of switches. Both forms write the
// whole map through one helper, and storage from a build that had them all on
// is read as the first of them rather than shown breaking the rule.
test('exactly one city is ever switched on', () => {
  const [first, second] = settings.STM_CITIES;
  // The registry is evaluated in its own realm, so a copy is taken here before
  // anything is mapped out of it: a realm's array is never deep-equal to one
  // of this realm's, however alike the two of them read.
  const names = [...settings.STM_CITIES].map(({ id }) => id);
  const on = (cities) => names.filter((id) => cities[id] !== false);

  assert.deepEqual(on(settings.STM_DEFAULT_SETTINGS.cities), [first.id]);
  assert.deepEqual(on(settings.stmOnlyCity(second.id)), [second.id]);
  // Nothing picked is a map with no network on it, not a map with all of them.
  assert.deepEqual(on(settings.stmOnlyCity(undefined)), []);
  // Every city is named on the way out, so a patch can never leave a stale one
  // standing where it is merged over the settings already in hand.
  assert.deepEqual(Object.keys(settings.stmOnlyCity(second.id)).sort(), [...names].sort());

  assert.deepEqual(on(settings.stmMergeSettings().cities), [first.id]);
  assert.deepEqual(on(settings.stmMergeSettings({ cities: { [second.id]: true } }).cities), [second.id]);
  assert.deepEqual(on(settings.stmMergeSettings({ cities: { [first.id]: false } }).cities), []);

  // What a build that drew every city at once left behind.
  const legacy = Object.fromEntries(names.map((id) => [id, true]));
  assert.deepEqual(on(settings.stmMergeSettings({ cities: legacy }).cities), [first.id]);

  // Storage with nothing to say about the cities is the one case answered out
  // of the defaults, which are copied rather than handed over: a form writing
  // to the map it was given must not write through to the next read's.
  const fresh = settings.stmMergeSettings().cities;
  fresh[second.id] = true;
  assert.deepEqual(on(settings.stmMergeSettings().cities), [first.id]);
});

// A line is drawn where its city, its system and the line itself all say so,
// which is what lets one operator be switched off without writing to any of
// the lines underneath it.
test('the three levels of switch multiply rather than overlap', () => {
  const merged = settings.stmMergeSettings();
  assert.equal(settings.stmIsLineEnabled(merged, line.id), true);

  for (const off of [{ lines: { [line.id]: false } }, { systems: { [`${cityId}:${systemId}`]: false } }, { cities: { [cityId]: false } }]) {
    assert.equal(settings.stmIsLineEnabled(settings.stmMergeSettings(off), line.id), false, JSON.stringify(off));
  }

  // Switching a system off leaves every other system's lines alone.
  const elsewhere = settings.STM_LINES.find(({ systemId: id }) => id !== line.systemId);
  if (elsewhere) {
    const partial = settings.stmMergeSettings({ systems: { [line.systemId]: false } });
    assert.equal(settings.stmIsLineEnabled(partial, elsewhere.id), true);
  }
});

// The overlay rebuilds the column of tools on the map when one of these
// changes and only redraws the network otherwise, which is what lets a city
// switched off from the panel on the map leave that panel standing. A key
// renamed out from under the list is a switch that quietly stops taking effect
// until the page is reloaded — exactly the thing the panel exists to avoid.
test('every switch the overlay rebuilds its tools for is a switch that exists', () => {
  const source = readFileSync(new URL('../extension/content.js', import.meta.url), 'utf8');
  const [, block] = source.match(/const STM_SHELL_KEYS = \[([^\]]+)\]/);
  const keys = [...block.matchAll(/"([^"]+)"/g)].map(([, key]) => key);

  assert.ok(keys.length > 0);
  for (const key of keys) {
    assert.ok(Object.hasOwn(settings.STM_DEFAULT_SETTINGS, key), key);
  }

  // The switches that only change what is drawn are deliberately not in it.
  for (const key of ['cities', 'lines', 'points', 'stationLabels', 'stations', 'systems']) {
    assert.equal(keys.includes(key), false, key);
  }
});
