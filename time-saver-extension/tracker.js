// Tracker minimal : écoute toutes les sources d'activité Chrome disponibles
// et imprime "tracked : ..." pour chacune. Aucune persistance, juste des logs.

const track = (what) => console.log('tracked :', what);

// --- Onglets ---
chrome.tabs.onCreated.addListener((tab) => track(`tab created ${tab.id} ${tab.pendingUrl || tab.url || ''}`)); // nouvel onglet ouvert
chrome.tabs.onUpdated.addListener((id, info) => track(`tab updated ${id} ${JSON.stringify(info)}`)); // onglet modifié ; info = ce qui a changé : url, title, status "loading/complete", favIconUrl, pinned, muted, et audible:true/false = l'onglet émet (ou non) du son en ce moment
chrome.tabs.onActivated.addListener(({ tabId }) => track(`tab activated ${tabId}`)); // onglet passé au premier plan (sélectionné)
chrome.tabs.onMoved.addListener((id) => track(`tab moved ${id}`)); // onglet glissé à une autre position dans la fenêtre
chrome.tabs.onAttached.addListener((id) => track(`tab attached ${id}`)); // onglet rattaché à une fenêtre (fin d'un glisser entre fenêtres)
chrome.tabs.onDetached.addListener((id) => track(`tab detached ${id}`)); // onglet détaché de sa fenêtre (début d'un glisser entre fenêtres)
chrome.tabs.onHighlighted.addListener((info) => track(`tab highlighted ${info.tabIds}`)); // ensemble des onglets sélectionnés (sélection multiple Ctrl/Shift+clic)
chrome.tabs.onReplaced.addListener((a, b) => track(`tab replaced ${b} -> ${a}`)); // l'onglet b a été remplacé par a (ex. pré-rendu swappé par Chrome)
chrome.tabs.onRemoved.addListener((id) => track(`tab removed ${id}`)); // onglet fermé

// --- Fenêtres ---
chrome.windows.onCreated.addListener((w) => track(`window created ${w.id}`)); // nouvelle fenêtre du navigateur
chrome.windows.onRemoved.addListener((id) => track(`window removed ${id}`)); // fenêtre fermée
chrome.windows.onFocusChanged.addListener((id) => track(`window focus ${id}`)); // changement de fenêtre active ; id = -1 signifie qu'AUCUNE fenêtre Chrome n'a le focus (tu es passé sur une autre application), sinon c'est l'id de la fenêtre au premier plan

// --- Fenêtre : dimensions/position ---
if (chrome.windows.onBoundsChanged) {
  chrome.windows.onBoundsChanged.addListener((w) => track(`window bounds ${w.id}`)); // fenêtre redimensionnée ou déplacée
}

// --- Navigation ---
const searchTermOf = (url) => {
  try {
    const p = new URL(url).searchParams;
    for (const k of ['q', 'query', 'p', 'search_query', 'text']) if (p.has(k)) return p.get(k); // mots-clés d'une recherche présents dans l'URL
  } catch { /* ignore */ }
  return null;
};
chrome.webNavigation.onBeforeNavigate.addListener((d) => track(`nav before ${d.url}`)); // une navigation va commencer (avant chargement)
chrome.webNavigation.onCommitted.addListener((d) => {
  track(`nav committed ${d.transitionType} ${d.url}`); // navigation confirmée ; transitionType = comment on est arrivé : "typed" (URL tapée), "link" (clic), "reload", "auto_bookmark", "form_submit"...
  const term = searchTermOf(d.url);
  if (term) track(`search ${JSON.stringify(term)}`); // terme recherché, extrait de l'URL
});
chrome.webNavigation.onDOMContentLoaded.addListener((d) => track(`nav dom-ready ${d.url}`)); // le HTML de la page est analysé (DOM prêt)
chrome.webNavigation.onCompleted.addListener((d) => track(`nav completed ${d.url}`)); // page entièrement chargée
chrome.webNavigation.onErrorOccurred.addListener((d) => track(`nav error ${d.url}`)); // la navigation a échoué (erreur réseau, page annulée...)
chrome.webNavigation.onHistoryStateUpdated.addListener((d) => track(`nav spa-state ${d.url}`)); // changement d'URL sans rechargement (site à page unique, ex. history.pushState)
chrome.webNavigation.onReferenceFragmentUpdated.addListener((d) => track(`nav fragment ${d.url}`)); // changement de l'ancre #... dans l'URL
chrome.webNavigation.onCreatedNavigationTarget.addListener((d) => track(`nav new-target ${d.url}`)); // un lien/clic a ouvert une nouvelle cible (nouvel onglet ou fenêtre)

// --- Historique ---
chrome.history.onVisited.addListener((it) => track(`history visit ${it.url}`)); // une page vient d'être ajoutée à l'historique
chrome.history.onVisitRemoved.addListener((r) => track(`history removed ${r.allHistory ? 'all' : r.urls}`)); // suppression d'historique ; "all" = tout l'historique effacé, sinon la liste d'URL retirées

// --- Téléchargements ---
chrome.downloads.onCreated.addListener((d) => track(`download created ${d.url}`)); // un téléchargement démarre
chrome.downloads.onChanged.addListener((d) => track(`download changed ${d.id} ${JSON.stringify(d.state || {})}`)); // évolution d'un téléchargement ; state passe de "in_progress" à "complete" ou "interrupted"
chrome.downloads.onErased.addListener((id) => track(`download erased ${id}`)); // entrée retirée de la liste des téléchargements

// --- Sessions (onglets/fenêtres récemment fermés) ---
chrome.sessions.onChanged.addListener(() => track('sessions changed')); // la liste des onglets/fenêtres récemment fermés (ou synchronisés) a changé

// --- Inactivité : actif / absent / verrouillé ---
chrome.idle.setDetectionInterval(60); // seuil d'inactivité : 60 s sans souris/clavier => "idle"
chrome.idle.onStateChanged.addListener((state) => track(`idle ${state}`)); // état de l'utilisateur : "active", "idle" (absent), "locked" (écran verrouillé)

// --- Favoris ---
chrome.bookmarks.onCreated.addListener((id, b) => track(`bookmark created ${b.title} ${b.url || ''}`)); // favori ajouté (url vide = dossier)
chrome.bookmarks.onRemoved.addListener((id) => track(`bookmark removed ${id}`)); // favori supprimé
chrome.bookmarks.onChanged.addListener((id, c) => track(`bookmark changed ${JSON.stringify(c)}`)); // favori renommé ou son URL modifiée
chrome.bookmarks.onMoved.addListener((id) => track(`bookmark moved ${id}`)); // favori déplacé dans un autre dossier

// --- Liste de lecture ---
if (chrome.readingList) {
  chrome.readingList.onEntryAdded.addListener((e) => track(`readinglist added ${e.url}`)); // page ajoutée à la liste de lecture
  chrome.readingList.onEntryRemoved.addListener((e) => track(`readinglist removed ${e.url}`)); // page retirée de la liste de lecture
  chrome.readingList.onEntryUpdated.addListener((e) => track(`readinglist updated ${e.url}`)); // entrée modifiée (ex. marquée lue/non lue)
}

// --- Groupes d'onglets ---
if (chrome.tabGroups) {
  chrome.tabGroups.onCreated.addListener((g) => track(`group created ${g.id}`)); // nouveau groupe d'onglets créé
  chrome.tabGroups.onUpdated.addListener((g) => track(`group updated ${g.id} ${g.title || ''}`)); // groupe renommé, recoloré ou (dé)plié
  chrome.tabGroups.onMoved.addListener((g) => track(`group moved ${g.id}`)); // groupe déplacé dans la barre d'onglets
  chrome.tabGroups.onRemoved.addListener((g) => track(`group removed ${g.id}`)); // groupe dissous
}

// --- Autres extensions installées/activées ---
chrome.management.onInstalled.addListener((e) => track(`ext installed ${e.name}`)); // une autre extension vient d'être installée
chrome.management.onUninstalled.addListener((id) => track(`ext uninstalled ${id}`)); // une extension a été désinstallée
chrome.management.onEnabled.addListener((e) => track(`ext enabled ${e.name}`)); // une extension a été activée
chrome.management.onDisabled.addListener((e) => track(`ext disabled ${e.name}`)); // une extension a été désactivée

// --- Stockage ---
chrome.storage.onChanged.addListener((changes, area) => track(`storage ${area} ${Object.keys(changes)}`)); // une valeur stockée a changé ; area = "local", "sync" ou "session", suivi des clés modifiées

// --- Cycle de vie du service worker ---
chrome.runtime.onInstalled.addListener((d) => track(`installed ${d.reason}`)); // extension installée ou mise à jour ; reason = "install" / "update"
chrome.runtime.onStartup.addListener(() => track('startup')); // Chrome vient de démarrer et charge l'extension
chrome.runtime.onSuspend.addListener(() => track('suspend')); // le service worker va s'endormir (inactif)

track('tracker loaded'); // le script est chargé et prêt
