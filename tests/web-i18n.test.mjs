import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

const moduleUrl = new URL('../web/src/i18n.ts', import.meta.url).href;
const localesUrl = new URL('../web/src/locales.ts', import.meta.url).href;

function mockStorage(t, get) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  });
}

async function loadI18n(id) {
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === '@tanstack/react-router' && context.parentURL?.startsWith(moduleUrl)) {
        return { shortCircuit: true, url: 'data:text/javascript,export function useParams() { throw new Error("No router in this test") }' };
      }
      if (specifier === './locales' && context.parentURL?.startsWith(moduleUrl)) {
        return { shortCircuit: true, url: localesUrl };
      }
      return nextResolve(specifier, context);
    }
  });
  try {
    return await import(`${moduleUrl}?test=${id}`);
  } finally {
    hooks.deregister();
  }
}

test('a chosen website language remains selected when browser storage is unavailable', async (t) => {
  mockStorage(t, () => {
    throw new Error('Storage access denied');
  });
  const { chosenLocale, chooseLocale } = await loadI18n('unavailable');
  assert.equal(chosenLocale(), undefined);
  chooseLocale('fr');
  assert.equal(chosenLocale(), 'fr');
  chooseLocale('en');
  assert.equal(chosenLocale(), 'en');
});

test('a new website language overrides an older preference when storage writes fail', async (t) => {
  mockStorage(t, () => ({
    getItem: () => 'en',
    setItem() { throw new Error('Storage quota exceeded'); }
  }));
  const { chosenLocale, chooseLocale } = await loadI18n('read-only');
  assert.equal(chosenLocale(), 'en');
  chooseLocale('fr');
  assert.equal(chosenLocale(), 'fr');
});

test('website language choices are persisted when storage is available', async (t) => {
  const values = new Map([['language', 'fr']]);
  mockStorage(t, () => ({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  }));
  const { chosenLocale, chooseLocale } = await loadI18n('writable');
  assert.equal(chosenLocale(), 'fr');
  chooseLocale('en');
  assert.equal(chosenLocale(), 'en');
  assert.equal(values.get('language'), 'en');
});
