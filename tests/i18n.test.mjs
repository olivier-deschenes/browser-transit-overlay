import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../extension/', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const context = vm.createContext({});
for (const name of ['i18n.js', 'networks.js', 'settings.js']) vm.runInContext(read(name), context);
const i18n = vm.runInContext('({ STM_AUTO_LANGUAGE, STM_FALLBACK_LOCALE, STM_LOCALES, STM_CITIES, STM_LINES, STM_SITES, STM_SYSTEMS, stmBrowserLocale, stmResolveLocale, stmText, stmUseLanguage })', context);
const { STM_FALLBACK_LOCALE, STM_LOCALES } = i18n;
// The registry is evaluated in its own realm, so anything it maps or filters
// comes back as that realm's array. Sorted copies made here are this one's.
const sorted = (values) => [...values].sort();
const reference = STM_LOCALES[STM_FALLBACK_LOCALE].messages;
const placeholders = (message) => sorted(new Set(message.match(/\{\w+\}/g) ?? []));

// What each language has to say about the registry: every city, operator and
// line by its own id, and the line under each site's switch.
const REGISTRY_FAMILIES = ['city', 'line', 'site', 'system'];
const registryKeys = new Set([
  ...i18n.STM_CITIES.map(({ id }) => `city.${id}.name`),
  ...i18n.STM_SYSTEMS.map(({ id }) => `system.${id}.name`),
  ...i18n.STM_LINES.flatMap(({ id }) => [`line.${id}.name`, `line.${id}.detail`]),
  ...i18n.STM_SITES.map(({ id }) => `site.${id}.detail`)
]);

// A language added by copying a block has to be translated all the way
// through: a message missing from it would quietly show up in the fallback
// language, and a placeholder lost in translation would show up as a hole.
test('every language has the same messages, with the same placeholders', () => {
  assert.ok(Object.hasOwn(STM_LOCALES, STM_FALLBACK_LOCALE));

  for (const [code, { messages, name }] of Object.entries(STM_LOCALES)) {
    assert.match(code, /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/, code);
    assert.ok(name.trim(), code);
    assert.notEqual(code, i18n.STM_AUTO_LANGUAGE);

    const keys = Object.keys(messages);
    const missing = Object.keys(reference).filter((key) => !Object.hasOwn(messages, key));
    const extra = keys.filter((key) => !Object.hasOwn(reference, key));
    assert.deepEqual({ extra, missing }, { extra: [], missing: [] }, code);

    for (const key of keys) {
      assert.equal(typeof messages[key], 'string', `${code} ${key}`);
      assert.ok(messages[key].trim(), `${code} ${key}`);
      assert.deepEqual(placeholders(messages[key]), placeholders(reference[key]), `${code} ${key}`);
    }
  }
});

// Keys are written out whole at every call so that this can find them. The
// registry's names are the exception, built from ids, and are checked against
// the registry instead.
test('every message is shown somewhere, and everything shown has a message', () => {
  const scripts = readdirSync(root).filter((name) => name.endsWith('.js'));
  const used = new Set();

  for (const name of scripts) {
    const source = read(name);
    for (const [, key] of source.matchAll(/stmText\(\s*"([^"]+)"/g)) used.add(key);
    for (const [, family] of source.matchAll(/stmText\(\s*`([^.`$]*)\./g)) {
      assert.ok(REGISTRY_FAMILIES.includes(family), `${name}: stmText(\`${family}.…\`)`);
    }
  }

  for (const [, key] of read('options.html').matchAll(/data-stm-text="([^"]+)"/g)) used.add(key);

  for (const key of used) assert.ok(Object.hasOwn(reference, key), `no message for ${key}`);
  for (const key of registryKeys) assert.ok(Object.hasOwn(reference, key), `no message for ${key}`);

  for (const key of Object.keys(reference)) {
    assert.ok(used.has(key) || registryKeys.has(key), `${key} is never shown`);
  }
});

test('the browser’s languages are followed in order until one is chosen', () => {
  const { STM_AUTO_LANGUAGE, stmBrowserLocale, stmResolveLocale } = i18n;

  assert.equal(stmBrowserLocale(['fr-CA', 'en-US']), 'fr');
  assert.equal(stmBrowserLocale(['en-CA', 'fr-CA']), 'en');
  assert.equal(stmBrowserLocale(['de-DE', 'FR']), 'fr');
  assert.equal(stmBrowserLocale(['de-DE', 'es']), STM_FALLBACK_LOCALE);
  assert.equal(stmBrowserLocale([]), STM_FALLBACK_LOCALE);

  assert.equal(stmResolveLocale(STM_AUTO_LANGUAGE, ['fr-CA']), 'fr');
  assert.equal(stmResolveLocale('en', ['fr-CA']), 'en');
  assert.equal(stmResolveLocale('fr', ['en-US']), 'fr');
  // A language this build no longer has is no choice at all.
  assert.equal(stmResolveLocale('xx', ['fr-CA']), 'fr');
  assert.equal(stmResolveLocale(undefined, ['en-US']), 'en');
});

test('messages are read in the language in use, with their placeholders filled', () => {
  const { stmText, stmUseLanguage } = i18n;

  stmUseLanguage('fr');
  assert.equal(stmText('point.add'), STM_LOCALES.fr.messages['point.add']);
  assert.equal(stmUseLanguage('fr'), false);
  assert.equal(stmUseLanguage('en'), true);
  assert.equal(stmText('point.add'), STM_LOCALES.en.messages['point.add']);

  const filled = stmText('options.language.auto', { language: 'Français' });
  assert.match(filled, /Français/);
  assert.doesNotMatch(filled, /[{}]/);
  assert.equal(stmText('no.such.message'), 'no.such.message');
});

// Chrome shows the extension's name and description before any of its scripts
// have run, so it reads them from _locales instead. Those files are held to
// the same languages, and the name to the one the settings page shows.
test('Chrome’s copy of the name and description covers the same languages', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.equal(manifest.name, '__MSG_extName__');
  assert.equal(manifest.description, '__MSG_extDescription__');
  assert.equal(manifest.default_locale, STM_FALLBACK_LOCALE.replace('-', '_'));

  const folders = readdirSync(new URL('_locales/', root));
  assert.deepEqual(sorted(folders), sorted(Object.keys(STM_LOCALES).map((code) => code.replace('-', '_'))));

  for (const code of Object.keys(STM_LOCALES)) {
    const messages = JSON.parse(read(`_locales/${code.replace('-', '_')}/messages.json`));
    assert.deepEqual(sorted(Object.keys(messages)), ['extDescription', 'extName'], code);
    assert.equal(messages.extName.message, STM_LOCALES[code].messages['extension.name'], code);
    // The limits the Chrome Web Store holds a listing to.
    assert.ok(messages.extName.message.length <= 75, code);
    assert.ok(messages.extDescription.message.trim(), code);
    assert.ok(messages.extDescription.message.length <= 132, code);
  }
});
