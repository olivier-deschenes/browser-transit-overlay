import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../extension/', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const manifest = JSON.parse(read('manifest.json'));

test('manifest keeps permissions scoped to supported sites', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.externally_connectable, undefined);
  const allowed = new Set(['https://www.facebook.com/marketplace/*', 'https://www.centris.ca/*', 'https://sdk.locallogic.co/sdks-app/*']);
  for (const script of manifest.content_scripts) {
    for (const match of script.matches) assert.ok(allowed.has(match), match);
    if (script.world === 'MAIN') {
      assert.deepEqual(script.matches, ['https://sdk.locallogic.co/sdks-app/*']);
      assert.deepEqual(script.js, ['bridge.js']);
    }
  }
});

test('all manifest resources and options assets exist', () => {
  const resources = [manifest.background.service_worker, manifest.options_ui.page, ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon)];
  for (const script of manifest.content_scripts) resources.push(...(script.js ?? []), ...(script.css ?? []));
  for (const group of manifest.web_accessible_resources) resources.push(...group.resources);
  for (const match of read('options.html').matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (!match[1].startsWith('https://')) resources.push(match[1]);
  }
  for (const path of resources) assert.ok(existsSync(new URL(path, root)), path);
});

test('every extension script parses as a classic browser script', () => {
  for (const file of readdirSync(root).filter((name) => name.endsWith('.js'))) {
    assert.doesNotThrow(() => new vm.Script(read(file), { filename: file }));
  }
});

test('bundled geometry retains attribution and valid stations and paths', () => {
  const data = JSON.parse(read('metro-data.json'));
  assert.equal(data.license.terms, 'https://creativecommons.org/licenses/by/4.0/');
  assert.match(data.license.notice, /STM/);
  assert.match(data.license.notice, /métropolitain/);
  const lineIds = new Set(data.lines.map(({ id }) => id));
  for (const id of ['1', '2', '4', '5']) assert.ok(lineIds.has(id));
  assert.ok(data.stations.length > 0);
  function checkCoordinates(point) {
    assert.equal(point.length, 2);
    const [longitude, latitude] = point;
    assert.ok(Number.isFinite(longitude) && Math.abs(longitude) <= 180);
    assert.ok(Number.isFinite(latitude) && Math.abs(latitude) <= 90);
  }
  for (const line of data.lines) {
    assert.match(line.color, /^#[0-9a-f]{6}$/i);
    assert.ok(line.paths.length > 0);
    for (const path of line.paths) {
      assert.ok(path.length >= 2);
      path.forEach(checkCoordinates);
    }
  }
  for (const station of data.stations) {
    assert.ok(station.name.trim());
    checkCoordinates(station.coordinates);
    for (const line of station.lines) assert.ok(line === 'REM' || lineIds.has(line));
  }
});
