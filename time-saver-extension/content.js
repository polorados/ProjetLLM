// Content script : capture des interactions. Aucun texte saisi, aucun contenu de page n'est enregistré.
(() => {
  if (!/^https?:$/.test(location.protocol)) return;

  const SENSITIVE = ['bank', 'banque', 'paypal', 'impots.gouv', 'ameli', 'doctolib', 'mail.google', 'outlook'];
  if (SENSITIVE.some((s) => location.hostname.includes(s))) return;

  let enabled = false;
  chrome.storage.local.get('consent').then(({ consent }) => { enabled = consent === true; });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.consent) enabled = changes.consent.newValue === true;
  });

  function send(type, details = {}) {
    if (!enabled) return;
    try {
      chrome.runtime.sendMessage({ type: 'EVENT', event: { type, details } }).catch(() => {});
    } catch { /* extension rechargée : on ignore */ }
  }

  // Clics : on garde seulement le type d'élément (jamais son texte)
  document.addEventListener('click', (e) => {
    const el = e.target.closest?.('a, button, input, select, [role="button"]') || e.target;
    const details = { tag: el.tagName.toLowerCase() };
    if (el.tagName === 'A' && el.hostname && el.hostname !== location.hostname) {
      details.targetDomain = el.hostname;
    }
    send('click', details);
  }, true);

  // Raccourcis clavier (Ctrl/Cmd + touche) uniquement, pas la saisie de texte
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.key.length !== 1) return;
    send('shortcut', { combo: `${e.shiftKey ? 'shift+' : ''}ctrl+${e.key.toLowerCase()}` });
  }, true);

  // Copier / coller / couper : on note l'événement, jamais le contenu
  ['copy', 'cut', 'paste'].forEach((name) => document.addEventListener(name, () => send(name), true));

  // Scroll : au plus un événement toutes les 5 secondes
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const now = Date.now();
    if (now - lastScroll < 5000) return;
    lastScroll = now;
    send('scroll');
  }, { passive: true });

  // Temps passé sur la page (visible)
  let visibleSince = document.visibilityState === 'visible' ? Date.now() : null;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && visibleSince) {
      const seconds = Math.round((Date.now() - visibleSince) / 1000);
      visibleSince = null;
      if (seconds >= 2) send('page_visit', { seconds });
    } else if (document.visibilityState === 'visible') {
      visibleSince = Date.now();
    }
  });
})();
