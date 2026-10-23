// Niveau 2 : on simule `chrome` et `fetch` AVANT d'importer catalog.js.
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

// Faux catalogue embarqué (renvoyé par le faux fetch)
const bundled = {
  schema_version: 1,
  version: '2026-01-01',
  entries: [
    { id: 'tab-groups', type: 'chrome_feature', name: 'Groupes', summary: 'x', needs: ['trop_onglets'], url: 'https://support.google.com/a', last_verified: '2026-01-01' },
    { id: 'ext-one', type: 'extension', name: 'Ext', summary: 'x', needs: ['trop_onglets', 'aller_retour'], url: 'https://chromewebstore.google.com/detail/x', extension_id: 'a'.repeat(32), permissions_level: 'low', last_verified: null },
  ],
};
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => bundled });

const { searchCatalog, getEntry, getCatalog } = await import('../catalog.js');

beforeEach(() => { store = {}; });

test('getCatalog renvoie la copie embarquée si le cache est vide', async () => {
  const c = await getCatalog();
  assert.equal(c.version, '2026-01-01');
});

test('searchCatalog classe par nombre de besoins couverts', async () => {
  const res = await searchCatalog({ needs: ['trop_onglets', 'aller_retour'] });
  assert.equal(res[0].id, 'ext-one');
});

test('searchCatalog exclut les extensions déjà installées', async () => {
  const res = await searchCatalog({ needs: ['trop_onglets'], excludeExtensionIds: ['a'.repeat(32)] });
  assert.deepEqual(res.map((r) => r.id), ['tab-groups']);
});

test('searchCatalog renvoie [] sans besoin valide', async () => {
  assert.deepEqual(await searchCatalog({ needs: ['bidon'] }), []);
});

test('getEntry renvoie null si inconnu', async () => {
  assert.equal(await getEntry('nope'), null);
});