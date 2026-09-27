import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { extensionCatalog } from '../web/plugins/extension-catalog.ts';

// Build the real catalogue without Vite, then resolve its virtual module and
// extensionless locale import the same way Vite does in the website.
const plugin = extensionCatalog({
  extension: fileURLToPath(new URL('../extension/', import.meta.url)),
  locales: ['fr', 'en']
});
const source = plugin.load.call({
  environment: { config: { consumer: 'server' } },
  addWatchFile() {}
}, '\0virtual:extension-catalog');
const catalogUrl = new URL('../web/src/lib/catalog.ts', import.meta.url);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === catalogUrl.href) {
      if (specifier === 'virtual:extension-catalog') {
        return { url: `data:text/javascript,${encodeURIComponent(source)}`, shortCircuit: true };
      }
      if (specifier === '../locales') {
        return { url: new URL('../web/src/locales.ts', import.meta.url).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  }
});
const { lineFromHash, lineHash } = await import(catalogUrl.href);
hooks.deregister();

test('city fragments select known lines, including encoded fragments', () => {
  assert.equal(lineHash('paris:metro:14'), 'metro:14');
  assert.equal(lineFromHash('paris', 'metro:14'), 'paris:metro:14');
  assert.equal(lineFromHash('paris', 'metro%3A14'), 'paris:metro:14');
  assert.equal(lineFromHash('montreal', 'stm:2'), 'montreal:stm:2');
});

test('unknown and malformed city fragments leave the page without a selected line', () => {
  for (const hash of ['', 'main', 'metro:999', 'stm:2', '%', '%2', '%GG', '%E0%A4', '%FF']) {
    assert.equal(lineFromHash('paris', hash), undefined, hash);
  }
  assert.equal(lineFromHash(undefined, 'metro:14'), undefined);
  assert.equal(lineFromHash('unknown-city', 'metro:14'), undefined);
});
