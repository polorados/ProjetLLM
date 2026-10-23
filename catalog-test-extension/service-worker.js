// service-worker.js : le "cerveau" de l'extension, il tourne en arrière-plan.
// Chrome le réveille quand un événement arrive, puis l'endort après ~30 s d'inactivité.

import * as catalog from './catalog.js';

// Pratique pour tester : permet d'écrire `await catalog.searchCatalog(...)` dans la console
// du service worker. À retirer quand tu n'en auras plus besoin.
self.catalog = catalog;

// À l'installation (ou mise à jour) de l'extension : on programme l'alarme et on synchronise tout de suite
chrome.runtime.onInstalled.addListener(() => {
  catalog.setupCatalogAlarm();
  catalog.syncCatalog({ force: true }).then((r) => console.log('[sw] sync à l\'installation :', r));
});

// Au démarrage de Chrome : on reprogramme l'alarme par sécurité
chrome.runtime.onStartup.addListener(() => {
  catalog.setupCatalogAlarm();
});

// Quand l'alarme sonne (une fois par jour), on tente une synchronisation
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === catalog.ALARM_NAME) {
    catalog.syncCatalog().then((r) => console.log('[sw] sync planifiée :', r));
  }
});