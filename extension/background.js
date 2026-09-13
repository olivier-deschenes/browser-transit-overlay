importScripts("settings.js");

async function readEnabled() {
  const stored = await chrome.storage.local.get(STM_ENABLED_KEY);

  return stored[STM_ENABLED_KEY] ?? true;
}

async function paintAction(enabled) {
  await Promise.all([
    chrome.action.setBadgeText({ text: enabled ? "" : "OFF" }),
    chrome.action.setBadgeBackgroundColor({ color: "#6b7280" }),
    chrome.action.setTitle({
      title: enabled
        ? "Métro STM et REM — activé (cliquer pour désactiver)"
        : "Métro STM et REM — désactivé (cliquer pour activer)"
    })
  ]);
}

// No default_popup on the action, so a click lands here instead of opening a
// panel. Storage is what the content scripts watch; the badge only mirrors it,
// and it is repainted from the listener below rather than from here, because
// the settings page can flip the same switch without going through a click.
chrome.action.onClicked.addListener(async () => {
  const enabled = !(await readEnabled());

  await chrome.storage.local.set({ [STM_ENABLED_KEY]: enabled });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[STM_ENABLED_KEY]) return;

  paintAction(changes[STM_ENABLED_KEY].newValue ?? true);
});

// Content scripts cannot open the options page themselves, so the gear button
// on the map asks for it here.
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== STM_OPEN_OPTIONS_MESSAGE) return;

  chrome.runtime.openOptionsPage();
});

// The worker is torn down between events and the badge does not survive it,
// so it has to be repainted on every wake-up rather than set once at install.
chrome.runtime.onStartup.addListener(async () =>
  paintAction(await readEnabled())
);
chrome.runtime.onInstalled.addListener(async () =>
  paintAction(await readEnabled())
);
