import type { Need, CatalogEntry, InstalledExtension, CatalogData, InstalledExtensionList, ReshapedRecommendations } from "./types";

// catalog.js: sync a remote catalog and look up recommendations for ONE need.
export const CATALOG_URL = 'https://polorados.github.io/catalogue-extension/catalog.json';
const BUNDLED_PATH = 'catalog.bundled.json'; // copy shipped inside the extension
const STORAGE_KEY = 'catalog';
export const ALARM_NAME = 'catalog-sync';
export const NEEDS = ['trop_onglets', 'aller_retour', 'copier_coller', 'ouverture_quotidienne', 'traduction', 'lecture_longue', 'raccourcis_clavier'];

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
export async function getCatalog(): Promise<CatalogData>{
  const stored = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY];

  if (stored) return stored as CatalogData;

  const response = await fetch(chrome.runtime.getURL(BUNDLED_PATH));
  return await response.json() as CatalogData;
}

// Recommendations for ONE need, e.g. searchCatalog('trop_onglets')
export async function searchCatalog(
  need: Need
): Promise<CatalogData> {
  const catalog = await getCatalog();
    return {
        entries: catalog.entries.filter(
            entry => entry.needs.includes(need)
        )
    };
}

// TODO: implem ceci plus tard
export async function getInstalled(): Promise<InstalledExtensionList> {
  const all = await chrome.management.getAll();
  const out = {installedExtensions: all
    .filter((e) => e.type === 'extension' && e.id !== chrome.runtime.id)
    .slice(0, 100)
    .map((e) => ({ id: e.id, name: String(e.name).slice(0, 80), enabled: e.enabled }))
  }
  return out;
}


export async function submitRecommendation(
    submission: CatalogData
): Promise<{ success: boolean }> {
    const recommendations = {
        recommendations: submission.entries.map(
            ({ id, name, needs, summary, url, shortcut }) => ({
                id,
                name,
                needs,
                summary,
                url,
                ...(shortcut !== null && { shortcut })
            })
        )
    };
    console.log("envoi de recommendation !!!")
    await chrome.storage.local.set({ recommendations: recommendations });
    return { success: true };
}