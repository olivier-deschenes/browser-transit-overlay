import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const context = vm.createContext({});
// The defaults are derived from the registry at load, so it has to be there
// first — the same order the manifest, the options page and the worker use.
for (const name of ['networks.js', 'settings.js']) {
  vm.runInContext(readFileSync(new URL(`../extension/${name}`, import.meta.url), 'utf8'), context);
}
const settings = vm.runInContext('({ stmCoordinatesFromLocation, stmIsLineEnabled, stmMergeSettings, stmFormatCoordinates, stmLocationErrorMessage, STM_LINES })', context);
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

test('short-link errors explain how to obtain full coordinates', () => {
  assert.match(settings.stmLocationErrorMessage('https://maps.app.goo.gl/example'), /Lien court/);
  assert.match(settings.stmLocationErrorMessage(''), /Entrez/);
});

test('saved preferences survive new defaults without sharing mutable state', () => {
  const other = settings.STM_LINES.find(({ id }) => id !== line.id).id;
  const stored = { stations: false, lines: { [line.id]: false }, sites: { centris: false } };
  const merged = settings.stmMergeSettings(stored);
  assert.equal(merged.stations, false);
  assert.equal(merged.lines[line.id], false);
  assert.equal(merged.lines[other], true);
  assert.equal(merged.sites.centris, false);
  assert.equal(merged.sites.facebook, true);
  // A city or system absent from storage is one this build has added, and it
  // ships switched on rather than needing a migration to turn it on.
  assert.equal(merged.cities[cityId], true);
  assert.equal(merged.systems[`${cityId}:${systemId}`], true);
  merged.lines[other] = false;
  assert.equal(settings.stmMergeSettings().lines[other], true);
  assert.deepEqual(stored, { stations: false, lines: { [line.id]: false }, sites: { centris: false } });
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
