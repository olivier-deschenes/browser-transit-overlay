import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../extension/sites.js', import.meta.url), 'utf8');
function page(hostname, pathname = '/', ancestorOrigins = []) {
  const context = vm.createContext({ URL, location: { hostname, pathname, ancestorOrigins } });
  vm.runInContext(source, context);
  return vm.runInContext('({ site: stmSiteForPage(), parseLeaflet: stmParseLeafletTile, parseGoogle: stmParseGoogleTile })', context);
}

test('site matching respects hostname boundaries', () => {
  assert.equal(page('www.facebook.com').site.id, 'facebook');
  assert.equal(page('www.centris.ca').site.id, 'centris');
  for (const host of ['notfacebook.com', 'facebook.com.example.org', 'centris.ca.example.org']) {
    assert.equal(page(host).site, undefined);
  }
});

test('Local Logic is activated only when embedded by Centris', () => {
  assert.equal(page('sdk.locallogic.co', '/', ['https://www.centris.ca']).site.switchId, 'centris');
  for (const origins of [[], ['https://example.org'], ['https://www.centris.ca.example.org']]) {
    assert.equal(page('sdk.locallogic.co', '/', origins).site, undefined);
  }
});

test('Marketplace recognises rental searches and listings', () => {
  assert.equal(page('www.facebook.com', '/marketplace/montreal/propertyrentals/').site.isCategoryPage(), true);
  assert.equal(page('www.facebook.com', '/marketplace/item/123456/').site.isItemPage(), true);
  assert.equal(page('www.facebook.com', '/marketplace/montreal/vehicles/').site.isCategoryPage(), false);
});

test('Centris recognises French and English listing routes', () => {
  assert.equal(page('www.centris.ca', '/fr/condo~a-vendre~montreal-ile').site.isCategoryPage(), true);
  assert.equal(page('www.centris.ca', '/en/condos~for-sale~montreal/12345678').site.isItemPage(), true);
});

test('tile parsers obtain the zoom, position, and native tile size', () => {
  const { parseLeaflet, parseGoogle } = page('www.facebook.com');
  assert.deepEqual(JSON.parse(JSON.stringify(parseLeaflet('https://example.org/tile?x=12&y=14&z=6'))), { size: 256, x: 12, y: 14, z: 6 });
  assert.deepEqual(JSON.parse(JSON.stringify(parseGoogle('https://example.org/tile?pb=!1i6!2i12!3i14!4i512'))), { size: 512, x: 12, y: 14, z: 6 });
  assert.equal(parseLeaflet('not a URL'), undefined);
  assert.equal(parseLeaflet('https://example.org/tile?x=1&y=2'), undefined);
  assert.equal(parseGoogle('https://example.org/no-tile'), undefined);
});
