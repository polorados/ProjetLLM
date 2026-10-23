// Tests de syncCatalog : on scénarise les réponses du faux fetch.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

let store = {};
globalThis.chrome = {
  runtime: { getURL: (p) => 'file://' + p },
  storage: {
    local: {
      get: async (key) => (key in store ? { [key]: store[key] } : {}),
      set: async (obj) => { Object.assign(store, obj); },
    },
  },
  alarms: { create() {} },
};

const entry = { id: 'tab-groups', type: 'chrome_feature', name: 'Groupes', summary: 'x', needs: ['trop_onglets'], url: 'https://support.google.com/a', last_verified: '2026-01-01' };
const catalogOf = (version) => ({ schema_version: 1, version, entries: [entry] });

// Réponse que le faux fetch renverra, et dernière requête reçue
let nextResponse;
let lastRequest;
globalThis.fetch = async (url, options) => {
  lastRequest = { url, options };
  return nextResponse;
};

const okResponse = (body, etag = '"abc"') => ({
  ok: true,
  status: 200,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  headers: { get: (h) => (h.toLowerCase() === 'etag' ? etag : null) },
});

const { syncCatalog } = await import('../catalog.js');

beforeEach(() => { store = {}; lastRequest = undefined; });

test('télécharge, valide et sauvegarde un nouveau catalogue', async () => {
  nextResponse = okResponse(catalogOf('2026-02-01'));
  const r = await syncCatalog({ force: true });
  assert.equal(r.status, 'updated');
  assert.equal(r.count, 1);
  assert.equal(store.catalog.version, '2026-02-01');
  assert.equal(store.catalogMeta.etag, '"abc"');
});

test('une erreur HTTP renvoie un statut error sans lancer d’exception', async () => {
  nextResponse = { ok: false, status: 500 };
  const r = await syncCatalog({ force: true });
  assert.deepEqual(r, { status: 'error', error: 'HTTP 500' });
  assert.equal(store.catalog, undefined); // rien n'est sauvegardé
});

test('un JSON invalide est refusé', async () => {
  nextResponse = okResponse('pas du json {');
  const r = await syncCatalog({ force: true });
  assert.equal(r.error, 'JSON invalide');
});

test('une version plus ancienne que le cache est refusée', async () => {
  store.catalog = catalogOf('2026-03-01');
  nextResponse = okResponse(catalogOf('2026-01-01'));
  const r = await syncCatalog({ force: true });
  assert.equal(r.status, 'error');
  assert.match(r.error, /plus ancienne/);
  assert.equal(store.catalog.version, '2026-03-01'); // le cache est conservé
});

test('un 304 renvoie unchanged et envoie If-None-Match', async () => {
  store.catalog = catalogOf('2026-02-01');
  store.catalogMeta = { etag: '"xyz"' };
  nextResponse = { ok: false, status: 304 };
  const r = await syncCatalog({ force: true });
  assert.equal(r.status, 'unchanged');
  assert.equal(lastRequest.options.headers['If-None-Match'], '"xyz"');
});

test('sans force, une vérification récente est ignorée (skipped)', async () => {
  store.catalogMeta = { checkedAt: Date.now() };
  const r = await syncCatalog();
  assert.equal(r.status, 'skipped');
  assert.equal(lastRequest, undefined); // aucun appel réseau
});