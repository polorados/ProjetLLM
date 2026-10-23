// popup.js : petit panneau de test pour appeler les fonctions de catalog.js sans passer par la console.

import { getCatalogInfo, syncCatalog, searchCatalog, NEEDS } from './catalog.js';

const out = document.getElementById('out');
const select = document.getElementById('need');
const show = (value) => { out.textContent = JSON.stringify(value, null, 2); };

for (const n of NEEDS) select.add(new Option(n, n));

document.getElementById('info').addEventListener('click', async () => show(await getCatalogInfo()));
document.getElementById('sync').addEventListener('click', async () => show(await syncCatalog({ force: true })));
document.getElementById('search').addEventListener('click', async () => show(await searchCatalog({ needs: [select.value] })));
document.getElementById('settings').addEventListener('click', () => chrome.runtime.openOptionsPage());