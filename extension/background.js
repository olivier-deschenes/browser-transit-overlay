importScripts("i18n.js", "networks.js", "settings.js");

async function readEnabled() {
  const stored = await chrome.storage.local.get(STM_ENABLED_KEY);

  return stored[STM_ENABLED_KEY] ?? true;
}

// The badge and the title say what the master switch says, in the language the
// settings ask for, so both are read fresh rather than taken from whichever of
// the two changed.
async function paintAction() {
  const stored = await chrome.storage.local.get([
    STM_ENABLED_KEY,
    STM_SETTINGS_KEY
  ]);
  const enabled = stored[STM_ENABLED_KEY] ?? true;

  stmUseLanguage(stmMergeSettings(stored[STM_SETTINGS_KEY]).language);

  await Promise.all([
    chrome.action.setBadgeText({
      text: enabled ? "" : stmText("toolbar.badgeOff")
    }),
    chrome.action.setBadgeBackgroundColor({ color: "#6b7280" }),
    chrome.action.setTitle({
      title: enabled ? stmText("toolbar.on") : stmText("toolbar.off")
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
  if (area !== "local") return;

  if (changes[STM_ENABLED_KEY] || changes[STM_SETTINGS_KEY]) paintAction();
});

// Content scripts cannot open the options page themselves, so the gear button
// on the map asks for it here.
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== STM_OPEN_OPTIONS_MESSAGE) return;

  chrome.runtime.openOptionsPage();
});

// The worker is torn down between events and the badge does not survive it,
// so it has to be repainted on every wake-up rather than set once at install.
chrome.runtime.onStartup.addListener(paintAction);
chrome.runtime.onInstalled.addListener(paintAction);
