import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../extension/', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const manifest = JSON.parse(read('manifest.json'));

// A web-accessible resource may be a pattern rather than a path: which cities
// ship is the registry's to decide, so the manifest names the folder instead
// of listing them.
function resourceExists(resource) {
  if (!resource.includes('*')) return existsSync(new URL(resource, root));
  const slash = resource.lastIndexOf('/');
  const directory = new URL(resource.slice(0, slash + 1), root);
  const name = new RegExp(`^${resource.slice(slash + 1).replaceAll('.', '\\.').replaceAll('*', '.*')}$`);
  return existsSync(directory) && readdirSync(directory).some((entry) => name.test(entry));
}

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
  for (const path of resources) assert.ok(resourceExists(path), path);
});

// The registry and the language list are what the settings are derived from,
// synchronously and at load, so every place that reads a setting has to have
// run both first.
test('the registry and the languages are loaded ahead of everything that reads them', () => {
  assert.match(read('background.js'), /^importScripts\("i18n\.js", "networks\.js", "settings\.js"\);/);
  const options = read('options.html');
  assert.ok(options.indexOf('i18n.js') < options.indexOf('networks.js'));
  assert.ok(options.indexOf('networks.js') < options.indexOf('settings.js'));
  for (const script of manifest.content_scripts) {
    if (!script.js.includes('settings.js')) continue;
    assert.ok(script.js.indexOf('i18n.js') === 0, script.js.join(' '));
    assert.ok(script.js.indexOf('networks.js') < script.js.indexOf('settings.js'), script.js.join(' '));
  }
});

test('every extension script parses as a classic browser script', () => {
  for (const file of readdirSync(root).filter((name) => name.endsWith('.js'))) {
    assert.doesNotThrow(() => new vm.Script(read(file), { filename: file }));
  }
});

// The licence asks for the notice to travel with the data, so it rides in the
// geometry file rather than only in the extension around it. What the notice
// has to say is the publisher's to dictate and the city module's to write
// down, and no two publishers word it alike; what every one of them has to
// admit to is the adaptation these files have all been through. Everything
// else about them — which lines are in them, where they sit, who to credit —
// is checked against the registry in networks.test.mjs.
test('bundled geometry keeps the notice the licence asks for', () => {
  for (const name of readdirSync(new URL('networks/', root))) {
    const { notice } = JSON.parse(read(`networks/${name}`));
    assert.ok(notice.trim().length > 20, name);
    assert.match(notice, /modifi/i, name);
  }
});
