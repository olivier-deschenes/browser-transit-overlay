import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

function background({ failFirstRead = false } = {}) {
  const stored = { enabled: true };
  const listeners = {};
  const event = (name) => ({ addListener: (listener) => { listeners[name] = listener; } });
  const context = vm.createContext({
    chrome: {
      action: { onClicked: event('click') },
      runtime: {
        onInstalled: event('installed'),
        onMessage: event('message'),
        onStartup: event('startup'),
      },
      storage: {
        local: {
          async get() {
            if (failFirstRead) {
              failFirstRead = false;
              throw new Error('Storage unavailable');
            }
            // A Chrome storage read resolves asynchronously with the state
            // it observed, even when another click has since been received.
            const snapshot = { ...stored };
            await Promise.resolve();
            return snapshot;
          },
          async set(values) {
            await Promise.resolve();
            Object.assign(stored, values);
          },
        },
        onChanged: event('changed'),
      },
    },
    importScripts(...names) {
      for (const name of names) {
        vm.runInContext(readFileSync(new URL(`../extension/${name}`, import.meta.url), 'utf8'), context);
      }
    },
  });
  vm.runInContext(readFileSync(new URL('../extension/background.js', import.meta.url), 'utf8'), context);
  return { click: listeners.click, stored };
}

test('overlapping toolbar clicks each toggle the enabled state', async () => {
  const { click, stored } = background();
  await Promise.all([click(), click()]);
  assert.equal(stored.enabled, true);
  await Promise.all([click(), click(), click()]);
  assert.equal(stored.enabled, false);
});

test('a failed toolbar toggle does not block later clicks', async () => {
  const { click, stored } = background({ failFirstRead: true });
  await assert.rejects(click(), /Storage unavailable/);
  await click();
  assert.equal(stored.enabled, false);
});
