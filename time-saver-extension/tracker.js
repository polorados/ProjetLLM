// Tracker : met un listener sur chaque événement des API autorisées dans le manifest.
// Chaque événement est affiché dans la console et sauvegardé dans chrome.storage.local.

const counts = {}; // nombre de fois que chaque type d'événement a été reçu

function track(name, args) {
  if (args[0]?.dom) name = `dom.${args[0].dom}`; // événements DOM envoyés par les pages : dom.<catégorie>.<type>
  counts[name] = (counts[name] ?? 0) + 1;
  console.log('tracked :', name, `(${Object.keys(counts).length} types différents)`, counts);
  // une clé unique par événement : pas de risque d'en écraser un autre
  chrome.storage.local.set({ [`${Date.now()}-${Math.random()}`]: { t: Date.now(), name, args } });
}


const manifest = chrome.runtime.getManifest();

// API autorisées dans le manifest + celles qui n'ont pas besoin de permission
const apis = [
  ...(manifest.permissions ?? []),
  "windows",
  "runtime",
  "commands",
  "action",
  "permissions",
  "omnibox",
];

for (const api of new Set(apis)) { 
  if (api === 'storage') continue; // on écrit dans storage à chaque événement : l'écouter ferait une boucle infinie
  const namespace = chrome[api];
  if (!namespace) continue;

  for (const key of Object.keys(namespace)) {
    if (key.startsWith('on') && namespace[key]?.addListener) {
      try {
        namespace[key].addListener((...args) => track(`${api}.${key}`, args));
      } catch (e) {
        console.log('skipped :', `${api}.${key}`, e.message); // ex. webRequest exige un filtre d'URL
      }
    }
  }
}

chrome.idle.setDetectionInterval(60); // "idle" après 60 s sans souris/clavier

// À taper dans la console du service worker : télécharge tous les logs dans Téléchargements/activity-log.json
function exportLogs() {
  chrome.storage.local.get(null, (all) => {
    const logs = Object.values(all).sort((a, b) => a.t - b.t);
    chrome.downloads.download({
      url: 'data:application/json,' + encodeURIComponent(JSON.stringify(logs, null, 2)),
      filename: 'activity-log.json',
      conflictAction: 'overwrite',
    });
  });
}

// ============================================================================
// ÉVÉNEMENTS DOM (ce qui se passe DANS les pages)
// À chaque page chargée, on y injecte une fonction qui écoute les événements DOM
// et les renvoie ici via runtime.sendMessage (déjà tracké par runtime.onMessage).
// ============================================================================
const injectDomTracking = (tabId) =>
  chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      if (window.domTracked) return; // déjà injecté dans cette page : pas de doublons
      window.domTracked = true;
      const send = (category, type, target) => chrome.runtime.sendMessage({ dom: `${category}.${type}`, target, url: location.href });
      const categories = {
        mouse: ['click', 'dblclick', 'contextmenu', 'scroll'],
        keyboard: ['keydown'], // seulement le fait qu'une touche a été pressée, jamais laquelle
        clipboard: ['copy', 'cut', 'paste'],
        visibility: ['visibilitychange', 'focus', 'blur'], // focus/blur de la fenêtre (onglet actif ou non)
        media: ['play', 'pause', 'ended', 'volumechange'],
        forms: ['focusin', 'change', 'submit'], // champ sélectionné / modifié / formulaire envoyé (sans le contenu)
      };
      for (const [category, types] of Object.entries(categories)) {
        // les événements média ne remontent pas jusqu'à window : il faut les capturer (true)
        for (const type of types) window.addEventListener(type, (e) => send(category, type, e.target.tagName), category === 'media');
      }
      send('performance', 'load', Math.round(performance.getEntriesByType('navigation')[0]?.duration)); // temps de chargement (ms)
    },
  }).catch((e) => console.log('DOM injection failed :', e.message)); // ex. pages chrome:// interdites

// page chargée (seulement la page principale, pas les iframes)
chrome.webNavigation.onCompleted.addListener(({ tabId, frameId }) => frameId === 0 && injectDomTracking(tabId));
// extension (re)chargée : on injecte aussi dans les onglets déjà ouverts
chrome.runtime.onInstalled.addListener(() => chrome.tabs.query({}, (tabs) => tabs.forEach((t) => injectDomTracking(t.id))));
