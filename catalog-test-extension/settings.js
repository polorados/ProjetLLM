// settings.js : lecture, écriture, export et suppression des réglages de l'utilisateur.
// Aucune interface ici : c'est de la logique pure (+ chrome.storage), donc facile à tester.
// Utilisé par la page de réglages (options.js) et, plus tard, par le code qui parle au LLM.

export const SETTINGS_KEY = 'settings';
export const BEHAVIOR_KEY = 'behaviorData'; // réservé pour l'étape « collecte » (pas encore utilisé)

// Les données PERSONNELLES de l'utilisateur. Le catalogue (public) n'en fait pas partie :
// supprimer ses données ne doit pas casser les recommandations.
export const USER_DATA_KEYS = [SETTINGS_KEY, BEHAVIOR_KEY];

// Ce que l'utilisateur peut choisir de partager avec le LLM (identifiant -> libellé affiché)
export const SHARE_CATEGORIES = {
  tab_count: 'Le nombre d’onglets ouverts',
  domains: 'Les noms de domaine des sites visités (sans l’adresse complète)',
  tab_titles: 'Les titres des onglets',
  installed_extensions: 'La liste de mes extensions installées',
};

// Remet n'importe quelle valeur lue dans le stockage au bon format.
// Tout est refusé par défaut : rien n'est partagé tant que l'utilisateur ne l'a pas coché.
export function normalizeSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const share = {};
  for (const key of Object.keys(SHARE_CATEGORIES)) share[key] = r.share?.[key] === true;
  return {
    consent: r.consent === true,
    apiKey: typeof r.apiKey === 'string' ? r.apiKey.trim() : '',
    share,
  };
}

export async function getSettings() {
  const stored = (await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY];
  return normalizeSettings(stored);
}

// Enregistre et renvoie la version nettoyée
export async function saveSettings(settings) {
  const clean = normalizeSettings(settings);
  await chrome.storage.local.set({ [SETTINGS_KEY]: clean });
  return clean;
}

// LA fonction à appeler avant d'envoyer une donnée au LLM : il faut le consentement général
// ET que cette catégorie précise soit cochée.
export function canShare(settings, category) {
  return settings?.consent === true && settings?.share?.[category] === true;
}

// Export lisible par l'utilisateur. La clé API n'est volontairement PAS exportée
// (un fichier téléchargé peut finir n'importe où).
export async function exportUserData() {
  const stored = await chrome.storage.local.get(USER_DATA_KEYS);
  const settings = normalizeSettings(stored[SETTINGS_KEY]);
  return {
    exportedAt: new Date().toISOString(),
    settings: { ...settings, apiKey: settings.apiKey ? '[présente, non exportée]' : '' },
    behaviorData: stored[BEHAVIOR_KEY] ?? null,
  };
}

// Supprime les réglages (clé API comprise) et les données collectées. Le catalogue reste.
export async function deleteUserData() {
  await chrome.storage.local.remove(USER_DATA_KEYS);
}