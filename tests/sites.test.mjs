import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../extension/sites.js', import.meta.url), 'utf8');
function page(hostname, pathname = '/', ancestorOrigins = []) {
  const location = { hostname, pathname, ancestorOrigins, href: `https://${hostname}${pathname}`, assign(value) { location.assigned = value; } };
  const context = vm.createContext({ URL, getComputedStyle: ({ position = 'static' }) => ({ position }), location });
  vm.runInContext(source, context);
  return { location, ...vm.runInContext('({ site: stmSiteForPage(), parseLeaflet: stmParseLeafletTile, parseGoogle: stmParseGoogleTile })', context) };
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

// The adapter knows where in a Marketplace path the city goes; which city to
// write there is the registry's to say.
test('the Marketplace shortcut is written from the city it is given', () => {
  const city = { id: 'montreal', marketplaceSlug: 'montreal' };
  const search = page('www.facebook.com', '/marketplace/109459475742/propertyrentals/');
  assert.equal(search.site.shortcut.applies(city), true);
  search.site.shortcut.run(city);
  assert.equal(search.location.assigned, 'https://www.facebook.com/marketplace/montreal/propertyrentals/');

  // A city Marketplace has no name for has nowhere to be sent, and a single
  // listing has no category path to rewrite.
  assert.equal(search.site.shortcut.applies({ id: 'elsewhere' }), false);
  assert.equal(page('www.facebook.com', '/marketplace/item/123456/').site.shortcut.applies(city), false);
});

// Just enough of a laid-out element for the walk from a map to the listings
// beside it: where its box starts and how big it is, how it is positioned,
// and who its parent and children are.
function box(left, width, height, { position, role } = {}, ...children) {
  const node = {
    children,
    closest(selector) {
      assert.equal(selector, '[role="main"]');
      for (let current = this; current; current = current.parentElement) {
        if (current.role === 'main') return current;
      }
      return null;
    },
    getBoundingClientRect: () => ({ height, left, right: left + width, width }),
    position,
    role
  };
  for (const child of children) child.parentElement = node;
  return node;
}

// The shape of a Marketplace search as it was measured: the zoom buttons are
// pinned over the map beside it in the DOM, a box of no height follows each of
// the two wrappers around it, and the filters down the left of the page are
// outside the main region altogether.
function marketplaceSearch() {
  const map = box(360, 385, 844);
  const frame = box(360, 385, 844, {}, map, box(745, 0, 0), box(368, 50, 110, { position: 'absolute' }));
  const column = box(360, 385, 844, {}, frame, box(360, 385, 0));
  const row = box(360, 1065, 5247, {}, column, box(745, 680, 5247));
  box(0, 1425, 5247, {}, box(0, 360, 5247), box(360, 1065, 5247, { role: 'main' }, row));
  return { column, map, row };
}

test('the listings beside a Marketplace search are found by the shape of the page', () => {
  const { column, map, row } = marketplaceSearch();
  const found = page('www.facebook.com', '/marketplace/montreal/propertyrentals/').site.listingsBeside(map);
  assert.equal(found.column, column);
  assert.equal(found.row, row);

  // The map on a listing opens with nothing beside it.
  assert.equal(page('www.facebook.com', '/marketplace/item/123456/').site.listingsBeside(map), undefined);
});

// Hiding the wrong thing is worse than offering to hide nothing, so anything
// but the map's column with the listings to its right is left alone.
test('a layout that is not a map beside its listings is left as it is', () => {
  const { site } = page('www.facebook.com', '/marketplace/montreal/propertyrentals/');

  const between = box(360, 385, 844);
  box(0, 1065, 844, { role: 'main' }, box(0, 1065, 844, {}, box(0, 360, 844), box(360, 385, 844, {}, between), box(745, 320, 844)));
  assert.equal(site.listingsBeside(between), undefined);

  const alone = box(0, 1065, 844);
  box(0, 1065, 844, { role: 'main' }, box(0, 1065, 844, {}, alone));
  assert.equal(site.listingsBeside(alone), undefined);

  const outside = box(0, 385, 844);
  box(0, 1065, 844, {}, outside, box(385, 680, 844));
  assert.equal(site.listingsBeside(outside), undefined);

  // Centris draws no listings beside its maps that this knows how to hide.
  assert.equal(page('www.centris.ca', '/fr/condo~a-vendre~montreal-ile').site.listingsBeside, undefined);
});

test('tile parsers obtain the zoom, position, and native tile size', () => {
  const { parseLeaflet, parseGoogle } = page('www.facebook.com');
  assert.deepEqual(JSON.parse(JSON.stringify(parseLeaflet('https://example.org/tile?x=12&y=14&z=6'))), { size: 256, x: 12, y: 14, z: 6 });
  assert.deepEqual(JSON.parse(JSON.stringify(parseGoogle('https://example.org/tile?pb=!1i6!2i12!3i14!4i512'))), { size: 512, x: 12, y: 14, z: 6 });
  assert.equal(parseLeaflet('not a URL'), undefined);
  assert.equal(parseLeaflet('https://example.org/tile?x=1&y=2'), undefined);
  assert.equal(parseGoogle('https://example.org/no-tile'), undefined);
});
