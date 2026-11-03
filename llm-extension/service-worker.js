// service-worker.js : le "cerveau" de l'extension, il tourne en arrière-plan.
// Chrome le réveille quand un événement arrive, puis l'endort après ~30 s d'inactivité.

import * as catalog from './catalog.js';
import * as llm from './llm.js';

// Pratique pour tester : permet d'écrire `await catalog.searchCatalog(...)` dans la console
// du service worker. À retirer quand tu n'en auras plus besoin.
self.catalog = catalog;
self.llm = llm;

function setupAlarms() {
  catalog.setupCatalogAlarm();
  llm.setupAnalysisAlarm();
}

// À l'installation (ou mise à jour) : on programme les alarmes et on synchronise le catalogue tout de suite
chrome.runtime.onInstalled.addListener(() => {
  setupAlarms();
  catalog.syncCatalog({ force: true }).then((r) => console.log('[sw] sync à l\'installation :', r));
});

// Au démarrage de Chrome : on reprogramme les alarmes par sécurité
chrome.runtime.onStartup.addListener(setupAlarms);

// Quand une alarme sonne
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === catalog.ALARM_NAME) {
    catalog.syncCatalog().then((r) => console.log('[sw] sync planifiée :', r));
  } else if (alarm.name === llm.ANALYSIS_ALARM) {
    llm.runAnalysis().then((r) => console.log('[sw] analyse planifiée :', r.status, r.reason ?? r.error ?? ''));
  }
});

// Le popup ne lance pas l'analyse lui-même (il se ferme dès qu'on clique ailleurs, ce qui couperait
// la boucle) : il envoie un message, et c'est le service worker qui travaille.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // On n'accepte que les messages venant de NOS pages (popup, options), pas d'un autre contexte
  if (!sender.url?.startsWith(chrome.runtime.getURL(''))) return;
  if (msg?.type === 'run-analysis') {
    llm.runAnalysis({ force: true }).then(sendResponse);
    return true; // réponse asynchrone
  }
});
