import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../extension/settings.js', import.meta.url), 'utf8'), context);
const settings = vm.runInContext('({ stmCoordinatesFromLocation, stmMergeSettings, stmFormatCoordinates, stmLocationErrorMessage })', context);
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
  const stored = { stations: false, lines: { '1': false }, sites: { centris: false } };
  const merged = settings.stmMergeSettings(stored);
  assert.equal(merged.stations, false);
  assert.equal(merged.lines['1'], false);
  assert.equal(merged.lines['2'], true);
  assert.equal(merged.sites.centris, false);
  assert.equal(merged.sites.facebook, true);
  merged.lines['2'] = false;
  assert.equal(settings.stmMergeSettings().lines['2'], true);
  assert.deepEqual(stored, { stations: false, lines: { '1': false }, sites: { centris: false } });
});
