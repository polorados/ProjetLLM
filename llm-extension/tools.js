// tools.js : les outils que le LLM peut appeler.
//  - TOOL_DEFS : ce que le LLM « voit » (nom, description, schéma des paramètres)
//  - createToolRunner : ce qui s'exécute VRAIMENT dans l'extension quand il appelle un outil
//
// Principe : le LLM ne fait que DEMANDER. C'est ce code, pas le prompt, qui impose les règles
// (catégories partagées, formats valides, hôtes autorisés, rien d'automatique côté GitHub).

import { searchCatalog, getCatalog, sanitizeEntry, NEEDS } from './catalog.js';
import { getSettings, canShare, BEHAVIOR_KEY, PROPOSALS_KEY } from './settings.js';
import { wrapUntrusted } from './prompt.js';

export const ISSUES_NEW_URL = 'https://github.com/polorados/catalogue-extension/issues/new'; // à adapter si le dépôt change
const MAX_PROPOSALS = 50;
const STALE_DAYS = 365;
const EXTENSION_ID_RE = /^[a-p]{32}$/;

// ---------------------------------------------------------------------------
// Définitions envoyées au LLM
// ---------------------------------------------------------------------------

const noInput = { type: 'object', properties: {}, additionalProperties: false };

export const TOOL_DEFS = [
  {
    name: 'get_user_patterns',
    description: 'Renvoie les statistiques d’usage agrégées de l’utilisateur (uniquement les catégories qu’il a accepté de partager).',
    input_schema: noInput,
  },
  {
    name: 'search_catalog',
    description: 'Cherche des fonctionnalités Chrome et extensions recommandées dans le catalogue, à partir de besoins. Classement : plus de besoins couverts, entrées vérifiées, fonctionnalités natives d’abord.',
    input_schema: {
      type: 'object',
      properties: {
        needs: { type: 'array', items: { type: 'string', enum: NEEDS }, minItems: 1, maxItems: 3 },
        types: { type: 'array', items: { type: 'string', enum: ['chrome_feature', 'extension'] } },
        limit: { type: 'integer', minimum: 1, maximum: 10 },
      },
      required: ['needs'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_installed_extensions',
    description: 'Liste les extensions installées par l’utilisateur (seulement s’il a accepté de les partager).',
    input_schema: noInput,
  },
  {
    name: 'verify_extension',
    description: 'Vérifie une extension à partir de son identifiant Chrome Web Store : format valide, présence dans le catalogue, niveau de permissions, date de dernière vérification.',
    input_schema: {
      type: 'object',
      properties: { extension_id: { type: 'string', description: '32 lettres de a à p' } },
      required: ['extension_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'propose_catalog_entry',
    description: 'Signale aux mainteneurs une extension ou fonctionnalité absente du catalogue (enregistrée localement, jamais affichée comme recommandation). L’url doit être sur support.google.com, developer.chrome.com ou chromewebstore.google.com.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'minuscules, chiffres et tirets' },
        type: { type: 'string', enum: ['chrome_feature', 'extension'] },
        name: { type: 'string' },
        summary: { type: 'string', description: '160 caractères maximum' },
        needs: { type: 'array', items: { type: 'string', enum: NEEDS } },
        url: { type: 'string' },
        extension_id: { type: 'string' },
        permissions_level: { type: 'string', enum: ['low', 'medium', 'high'] },
        shortcut: { type: 'string' },
      },
      required: ['id', 'type', 'name', 'summary', 'needs', 'url'],
      additionalProperties: false,
    },
  },
  {
    name: 'submit_recommendations',
    description: 'Rend le résultat final (termine l’analyse). Au plus 3 recommandations, uniquement des entrées du catalogue.',
    input_schema: {
      type: 'object',
      properties: {
        recommendations: {
          type: 'array',
          maxItems: 3,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'id d’une entrée du catalogue' },
              reason: { type: 'string', description: 'une phrase en français' },
            },
            required: ['id', 'reason'],
            additionalProperties: false,
          },
        },
        notes: { type: 'string', description: 'facultatif : par ex. consigne suspecte détectée dans des données' },
      },
      required: ['recommendations'],
      additionalProperties: false,
    },
  },
];

// ---------------------------------------------------------------------------
// Implémentations par défaut (remplaçables dans les tests via `deps`)
// ---------------------------------------------------------------------------

// CONTRAT avec la partie « collecte/agrégation » : behaviorData.aggregates doit valoir
//   { period_days: 7, metrics: { tab_count: ..., domains: ..., tab_titles: ..., installed_extensions: ... } }
// Les clés de `metrics` sont celles de SHARE_CATEGORIES (settings.js). Seul ce fichier lit ce format.
async function defaultGetPatterns() {
  const stored = (await chrome.storage.local.get(BEHAVIOR_KEY))[BEHAVIOR_KEY];
  return stored?.aggregates ?? { period_days: null, metrics: {} };
}

// Nécessite la permission "management" du manifest
export async function defaultGetInstalled() {
  const all = await chrome.management.getAll();
  return all
    .filter((e) => e.type === 'extension' && e.id !== chrome.runtime.id)
    .slice(0, 100)
    .map((e) => ({ id: e.id, name: String(e.name).slice(0, 80), enabled: e.enabled }));
}

async function loadProposals() {
  const v = (await chrome.storage.local.get(PROPOSALS_KEY))[PROPOSALS_KEY];
  return Array.isArray(v) ? v : [];
}
async function saveProposals(list) {
  await chrome.storage.local.set({ [PROPOSALS_KEY]: list.slice(-MAX_PROPOSALS) });
}

// Lien GitHub « nouvelle issue » pré-rempli. Rien n'est envoyé : l'utilisateur doit ouvrir le lien
// et cliquer lui-même sur « Submit ». Le corps ne contient que l'entrée nettoyée, aucune donnée perso.
export function buildIssueUrl(entry) {
  const body = [
    'Proposition générée par l’extension, à vérifier avant ajout au catalogue.',
    '',
    '```json',
    JSON.stringify(entry, null, 2),
    '```',
    '',
    '- [ ] Vérifié manuellement par un mainteneur',
  ].join('\n');
  const params = new URLSearchParams({ title: `Proposition : ${entry.name}`, body });
  return `${ISSUES_NEW_URL}?${params}`;
}

// ---------------------------------------------------------------------------
// Exécution des outils
// ---------------------------------------------------------------------------

// Renvoie { run(name, input) -> { text, isError }, state }.
// `state` mémorise le résultat final (submit_recommendations) et les propositions de la session.
export function createToolRunner(deps = {}) {
  const d = {
    getSettings, getPatterns: defaultGetPatterns, getInstalled: defaultGetInstalled,
    searchCatalog, getCatalog, loadProposals, saveProposals, now: () => new Date(),
    ...deps,
  };
  const state = { recommendations: null, notes: '', proposals: [] };

  const impls = {
    async get_user_patterns() {
      const settings = await d.getSettings();
      if (!settings.consent) return { error: 'consentement non donné' };
      const raw = await d.getPatterns();
      // Filtre en CODE : une catégorie non cochée n'est jamais transmise, quoi que demande le LLM
      const metrics = {};
      for (const [category, value] of Object.entries(raw?.metrics ?? {})) {
        if (canShare(settings, category)) metrics[category] = value;
      }
      return wrapUntrusted('patterns', { period_days: raw?.period_days ?? null, metrics });
    },

    async search_catalog(input) {
      const needs = Array.isArray(input.needs) ? input.needs.filter((n) => NEEDS.includes(n)) : [];
      if (!needs.length) return { error: `needs invalide. Valeurs possibles : ${NEEDS.join(', ')}` };
      const limit = Math.min(Math.max(Number(input.limit) || 5, 1), 10);
      const types = Array.isArray(input.types) ? input.types : undefined;
      const results = await d.searchCatalog({ needs, types, limit });
      return wrapUntrusted('catalogue', results.map((e) => ({
        id: e.id, type: e.type, name: e.name, summary: e.summary, needs: e.needs, url: e.url,
        shortcut: e.shortcut ?? null, permissions_level: e.permissions_level ?? null,
        verified: e.verified, matched_needs: e.matched_needs,
      })));
    },

    async get_installed_extensions() {
      const settings = await d.getSettings();
      if (!canShare(settings, 'installed_extensions')) return { available: false, reason: 'non partagé par l’utilisateur' };
      return wrapUntrusted('extensions_installees', { extensions: await d.getInstalled() });
    },

    async verify_extension(input) {
      const id = input.extension_id;
      if (typeof id !== 'string' || !EXTENSION_ID_RE.test(id)) return { error: 'extension_id invalide' };
      const catalog = await d.getCatalog();
      const entry = catalog.entries.find((e) => e.extension_id === id);
      const result = { extension_id: id, format_ok: true, in_catalog: Boolean(entry) };
      if (entry) {
        const age = entry.last_verified ? Math.floor((d.now() - new Date(entry.last_verified)) / 86_400_000) : null;
        Object.assign(result, {
          catalog_id: entry.id, name: entry.name, permissions_level: entry.permissions_level,
          last_verified: entry.last_verified, verified: entry.last_verified !== null,
          stale: age === null || age > STALE_DAYS,
        });
      }
      return wrapUntrusted('verification', result);
    },

    async propose_catalog_entry(input) {
      // Tout ce qui vient du LLM (donc potentiellement d'une page web piégée) passe par la même
      // validation stricte que le catalogue distant : hôtes autorisés, formats, longueurs.
      const { entry, reason } = sanitizeEntry({ ...input, last_verified: null });
      if (!entry) return { error: `entrée refusée : ${reason}` };
      const catalog = await d.getCatalog();
      const exists = catalog.entries.some((e) => e.id === entry.id || (entry.extension_id && e.extension_id === entry.extension_id));
      if (exists) return { error: 'déjà présente dans le catalogue' };
      const stored = await d.loadProposals();
      if (stored.some((p) => p.entry.id === entry.id)) return { ok: true, note: 'déjà proposée' };
      const proposal = { entry, proposed_at: d.now().toISOString(), issue_url: buildIssueUrl(entry) };
      await d.saveProposals([...stored, proposal]);
      state.proposals.push(proposal);
      return { ok: true };
    },

    async submit_recommendations(input) {
      const catalog = await d.getCatalog();
      const byId = new Map(catalog.entries.map((e) => [e.id, e]));
      const recommendations = [];
      const rejected = [];
      for (const r of (Array.isArray(input.recommendations) ? input.recommendations : []).slice(0, 3)) {
        const e = byId.get(r?.id);
        if (!e || recommendations.some((x) => x.id === e.id)) { rejected.push(String(r?.id ?? '?')); continue; }
        // Nom, résumé et lien viennent du catalogue local validé ; seul `reason` vient du LLM
        recommendations.push({
          id: e.id, type: e.type, name: e.name, summary: e.summary, url: e.url,
          shortcut: e.shortcut ?? null, extension_id: e.extension_id ?? null,
          permissions_level: e.permissions_level ?? null, verified: e.last_verified !== null,
          reason: typeof r.reason === 'string' ? r.reason.slice(0, 200) : '',
        });
      }
      state.recommendations = recommendations;
      state.notes = typeof input.notes === 'string' ? input.notes.slice(0, 300) : '';
      return rejected.length ? { ok: true, ignored_ids: rejected } : { ok: true };
    },
  };

  async function run(name, input) {
    const impl = impls[name];
    if (!impl) return { text: JSON.stringify({ error: `outil inconnu : ${name}` }), isError: true };
    try {
      const out = await impl(input && typeof input === 'object' ? input : {});
      const isError = Boolean(out && typeof out === 'object' && out.error);
      return { text: typeof out === 'string' ? out : JSON.stringify(out), isError };
    } catch (e) {
      return { text: JSON.stringify({ error: String(e?.message ?? e) }), isError: true };
    }
  }

  return { run, state };
}
