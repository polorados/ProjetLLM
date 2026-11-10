// catalog.js: sync a remote catalog and look up recommendations for ONE need.
export const CATALOG_URL = 'https://polorados.github.io/catalogue-extension/catalog.json';
const BUNDLED_PATH = 'catalog.bundled.json'; // copy shipped inside the extension
const STORAGE_KEY = 'catalog';
export const ALARM_NAME = 'catalog-sync';

// Download the remote catalog and store it. Never throws.
export async function syncCatalog() {
    const res = await fetch(CATALOG_URL);
    const data = await res.json();
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

// Run the sync once a day (call from the service worker; handle ALARM_NAME with syncCatalog)
export function setupCatalogAlarm() {
  chrome.alarms.create(ALARM_NAME, { delayInMinutes: 1, periodInMinutes: 24 * 60 });
}

// Synced catalog if there is one, otherwise the bundled copy
async function getCatalog() {
  const stored = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY];
  if (stored) return stored;
  return fetch(chrome.runtime.getURL(BUNDLED_PATH)).then((r) => r.json());
}

// Recommendations for ONE need, e.g. searchCatalog('trop_onglets')
export async function searchCatalog(need) {
  const catalog = await getCatalog();
  return catalog.entries.filter((e) => e.needs.includes(need));
}