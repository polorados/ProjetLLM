// catalog.js : téléchargement, validation, cache et recherche du catalogue de recommandations.
// Utilisé par le service worker (et importable depuis le popup).

export const CATALOG_URL = 'https://polorados.github.io/catalogue-extension/catalog.json';

const BUNDLED_PATH = 'catalog.bundled.json';   // copie embarquée dans l'extension
const STORAGE_KEY = 'catalog';                 // dernière version distante valide
const META_KEY = 'catalogMeta';                // etag, date de vérification, dernière erreur
export const ALARM_NAME = 'catalog-sync';

const SYNC_PERIOD_MIN = 24 * 60;               // une vérification par jour
const MIN_INTERVAL_MS = 6 * 3600 * 1000;       // pas de re-téléchargement avant 6 h (sauf force)
const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 500 * 1024;
const MAX_ENTRIES = 1000;

// Doit rester aligné avec scripts/validate.mjs et catalog.schema.json du dépôt du catalogue
export const NEEDS = ['trop_onglets', 'aller_retour', 'copier_coller', 'ouverture_quotidienne', 'traduction', 'lecture_longue', 'raccourcis_clavier'];
const TYPES = ['chrome_feature', 'extension'];
const LEVELS = ['low', 'medium', 'high'];
const ALLOWED_HOSTS = ['support.google.com', 'developer.chrome.com', 'chromewebstore.google.com'];

const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); // check si on est au format date
const isText = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max; // check si on est au format texte (non vide, pas trop long)

// ---------------------------------------------------------------------------
// Validation : le catalogue distant est une donnée NON FIABLE, on ne garde que
// des champs connus, aux formats attendus (jamais de HTML ni de champ inattendu).
// ---------------------------------------------------------------------------

// Renvoie { entry } si l'entrée est valide (nettoyée), sinon { reason }
export function sanitizeEntry(raw) {
  if (!raw || typeof raw !== 'object') return { reason: 'entrée non objet' };

  if (typeof raw.id !== 'string' || raw.id.length > 80 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(raw.id)) return { reason: 'id invalide' };
  if (!TYPES.includes(raw.type)) return { reason: 'type inconnu' };
  if (!isText(raw.name, 80)) return { reason: 'name invalide' };
  if (!isText(raw.summary, 160)) return { reason: 'summary invalide' };

  // Compatibilité ascendante : on ignore les étiquettes inconnues (ajoutées après la sortie de cette
  // version de l'extension), mais on exige qu'il en reste au moins une.
  const needs = Array.isArray(raw.needs) ? [...new Set(raw.needs.filter((n) => NEEDS.includes(n)))] : [];
  if (!needs.length) return { reason: 'aucun besoin connu' };

  try {
    const u = new URL(raw.url);
    if (u.protocol !== 'https:' || !ALLOWED_HOSTS.includes(u.hostname)) return { reason: 'url non autorisée' };
  } catch { return { reason: 'url invalide' }; }

  const entry = {
    id: raw.id,
    type: raw.type,
    name: raw.name,
    summary: raw.summary,
    needs,
    url: raw.url,
    last_verified: isDate(raw.last_verified) ? raw.last_verified : null,
  };
  if (isText(raw.shortcut, 80)) entry.shortcut = raw.shortcut;

  if (raw.type === 'extension') {
    if (typeof raw.extension_id !== 'string' || !/^[a-p]{32}$/.test(raw.extension_id)) return { reason: 'extension_id invalide' };
    if (!LEVELS.includes(raw.permissions_level)) return { reason: 'permissions_level invalide' };
    entry.extension_id = raw.extension_id;
    entry.permissions_level = raw.permissions_level;
  }
  return { entry };
}

// Renvoie { ok: true, catalog, dropped } ou { ok: false, error }
// Les entrées invalides sont écartées (et listées dans `dropped`) ; le fichier est rejeté
// seulement s'il est inutilisable dans son ensemble.
export function validateCatalog(data) {
  if (!data || typeof data !== 'object') return { ok: false, error: 'catalogue non objet' };
  if (data.schema_version !== 1) return { ok: false, error: 'schema_version non supportée' };
  if (!isDate(data.version)) return { ok: false, error: 'version invalide' };
  if (!Array.isArray(data.entries) || data.entries.length > MAX_ENTRIES) return { ok: false, error: 'entries invalide' };

  const entries = [];
  const dropped = [];
  const seen = new Set();
  for (const raw of data.entries) {
    const { entry, reason } = sanitizeEntry(raw);
    if (!entry) { dropped.push({ id: raw?.id ?? '?', reason }); continue; }
    if (seen.has(entry.id)) { dropped.push({ id: entry.id, reason: 'id en double' }); continue; }
    seen.add(entry.id);
    entries.push(entry);
  }
  if (!entries.length) return { ok: false, error: 'aucune entrée valide' };
  return { ok: true, catalog: { schema_version: 1, version: data.version, entries }, dropped };
}

// ---------------------------------------------------------------------------
// Lecture : cache distant ou copie embarquée (on garde la plus récente)
// ---------------------------------------------------------------------------

let bundledPromise = null;
function loadBundled() {
  bundledPromise ??= fetch(chrome.runtime.getURL(BUNDLED_PATH))
    .then((r) => r.json())
    .then((data) => {
      const v = validateCatalog(data);
      if (!v.ok) throw new Error('catalogue embarqué invalide : ' + v.error);
      return v.catalog;
    })
    .catch((e) => {
      console.error('[catalog]', e);
      bundledPromise = null;
      return { schema_version: 1, version: '0000-00-00', entries: [] };
    });
  return bundledPromise;
}

async function loadCached() {
  const stored = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY];
  if (!stored) return null;
  const v = validateCatalog(stored); // on revalide : le stockage peut être corrompu
  return v.ok ? v.catalog : null;
}

// Renvoie toujours un catalogue utilisable, même hors ligne
export async function getCatalog() {
  const [cached, bundled] = await Promise.all([loadCached(), loadBundled()]);
  if (cached && cached.version >= bundled.version) return cached; // après une mise à jour de l'extension, la copie embarquée peut être plus récente
  return bundled;
}

export async function getCatalogInfo() {
  const [catalog, meta] = await Promise.all([getCatalog(), chrome.storage.local.get(META_KEY).then((r) => r[META_KEY] || {})]);
  const cached = await loadCached();
  return {
    version: catalog.version,
    count: catalog.entries.length,
    source: cached && cached.version === catalog.version ? 'remote' : 'bundled',
    checkedAt: meta.checkedAt ?? null,
    lastError: meta.lastError ?? null,
  };
}

// ---------------------------------------------------------------------------
// Synchronisation : ne lance jamais d'exception, renvoie un statut
// ---------------------------------------------------------------------------


// tente de télécharger la derniere version du catalogue distant, de le valider et de le sauvegarder
export async function syncCatalog({ force = false } = {}) {
  let meta = {};
  try {
    meta = (await chrome.storage.local.get(META_KEY))[META_KEY] || {};
    if (!force && meta.checkedAt && Date.now() - meta.checkedAt < MIN_INTERVAL_MS) return { status: 'skipped' };

    const cached = await loadCached();
    const headers = { Accept: 'application/json' };
    if (cached && meta.etag) headers['If-None-Match'] = meta.etag; // évite de retélécharger un fichier inchangé

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(CATALOG_URL, { headers, cache: 'no-store', signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 304) {
      await chrome.storage.local.set({ [META_KEY]: { ...meta, checkedAt: Date.now(), lastError: null } });
      return { status: 'unchanged' };
    }
    if (!res.ok) return await fail(`HTTP ${res.status}`);

    const text = await res.text();
    if (text.length > MAX_BYTES) return await fail('fichier trop volumineux');

    let data;
    try { data = JSON.parse(text); } catch { return await fail('JSON invalide'); }

    const v = validateCatalog(data);
    if (!v.ok) return await fail(v.error);
    if (cached && v.catalog.version < cached.version) return await fail('version plus ancienne que le cache (refusée)');

    await chrome.storage.local.set({
      [STORAGE_KEY]: v.catalog,
      [META_KEY]: { etag: res.headers.get('ETag'), checkedAt: Date.now(), lastError: null, dropped: v.dropped.length },
    });
    if (v.dropped.length) console.warn('[catalog] entrées écartées :', v.dropped);
    return { status: 'updated', version: v.catalog.version, count: v.catalog.entries.length, dropped: v.dropped.length };
  } catch (e) {
    return await fail(e.name === 'AbortError' ? 'délai dépassé' : e.message);
  }

  // On garde le dernier catalogue valide ; on mémorise seulement l'erreur
  async function fail(error) {
    console.warn('[catalog] synchronisation échouée :', error);
    try { await chrome.storage.local.set({ [META_KEY]: { ...meta, lastError: error } }); } catch { /* ignore */ }
    return { status: 'error', error };
  }
}

// programme une alarme périodique pour la synchronisation du catalogue
export function setupCatalogAlarm() {
  chrome.alarms.create(ALARM_NAME, { delayInMinutes: 1, periodInMinutes: SYNC_PERIOD_MIN });
}

// ---------------------------------------------------------------------------
// Recherche : c'est la fonction que l'IA appellera comme « outil » (étape 7)
// ---------------------------------------------------------------------------

// needs : étiquettes recherchées. Classement : plus de besoins couverts d'abord, puis entrées
// vérifiées, puis fonctionnalités natives avant extensions, puis ordre alphabétique (déterministe).
// cherche une entrée dans le catalogue
export async function searchCatalog({ needs = [], types, limit = 5, excludeExtensionIds = [] } = {}) {
  const wanted = new Set((Array.isArray(needs) ? needs : []).filter((n) => NEEDS.includes(n)));
  if (!wanted.size) return [];
  const excluded = new Set(excludeExtensionIds);
  const catalog = await getCatalog();

  return catalog.entries
    .filter((e) => !types || types.includes(e.type))
    .filter((e) => !(e.extension_id && excluded.has(e.extension_id)))
    .map((e) => ({ e, matched: e.needs.filter((n) => wanted.has(n)) }))
    .filter((x) => x.matched.length > 0)
    .sort((a, b) =>
      b.matched.length - a.matched.length
      || Number(b.e.last_verified !== null) - Number(a.e.last_verified !== null)
      || (a.e.type === b.e.type ? 0 : a.e.type === 'chrome_feature' ? -1 : 1)
      || a.e.id.localeCompare(b.e.id))
    .slice(0, Math.max(1, Math.min(limit, 20)))
    .map(({ e, matched }) => ({ ...e, verified: e.last_verified !== null, matched_needs: matched }));
}

//recherche une entrée du catalogue en fonction de son identifiant
export async function getEntry(id) {
  const catalog = await getCatalog();
  return catalog.entries.find((e) => e.id === id) ?? null;
}