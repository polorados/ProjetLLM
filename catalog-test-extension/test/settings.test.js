// Tests de settings.js avec un faux chrome.storage.local (get accepte une clé ou une liste de clés).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

let store = {};
globalThis.chrome = {
  storage: {
    local: {
      get: async (keys) => {
        const list = Array.isArray(keys) ? keys : [keys];
        return Object.fromEntries(list.filter((k) => k in store).map((k) => [k, store[k]]));
      },
      set: async (obj) => { Object.assign(store, obj); },
      remove: async (keys) => { for (const k of [].concat(keys)) delete store[k]; },
    },
  },
};

const { getSettings, saveSettings, canShare, exportUserData, deleteUserData, SHARE_CATEGORIES } = await import('../settings.js');

beforeEach(() => { store = {}; });

test('par défaut : pas de consentement, pas de clé, rien de partagé', async () => {
  const s = await getSettings();
  assert.equal(s.consent, false);
  assert.equal(s.apiKey, '');
  assert.deepEqual(Object.keys(s.share), Object.keys(SHARE_CATEGORIES));
  assert.ok(Object.values(s.share).every((v) => v === false));
});

test('saveSettings nettoie les valeurs (consent strict, clé trimée, catégories inconnues ignorées)', async () => {
  const saved = await saveSettings({ consent: 'oui', apiKey: '  cle-123  ', share: { domains: true, bidon: true } });
  assert.equal(saved.consent, false); // 'oui' n'est pas `true`
  assert.equal(saved.apiKey, 'cle-123');
  assert.equal(saved.share.domains, true);
  assert.equal('bidon' in saved.share, false);
  assert.deepEqual(store.settings, saved); // et c'est bien ce qui est stocké
});

test('canShare exige le consentement ET la catégorie cochée', () => {
  assert.equal(canShare({ consent: false, share: { domains: true } }, 'domains'), false);
  assert.equal(canShare({ consent: true, share: { domains: false } }, 'domains'), false);
  assert.equal(canShare({ consent: true, share: { domains: true } }, 'domains'), true);
  assert.equal(canShare({ consent: true, share: { domains: true } }, 'inconnue'), false);
});

test('l’export ne contient jamais la clé API', async () => {
  await saveSettings({ consent: true, apiKey: 'super-secret-key', share: {} });
  const data = await exportUserData();
  assert.equal(JSON.stringify(data).includes('super-secret-key'), false);
  assert.equal(data.settings.consent, true);
});

test('deleteUserData efface réglages et données collectées, mais garde le catalogue', async () => {
  store = {
    settings: { consent: true, apiKey: 'k', share: {} },
    behaviorData: [{ x: 1 }],
    catalog: { version: '2026-01-01' },
  };
  await deleteUserData();
  assert.equal('settings' in store, false);
  assert.equal('behaviorData' in store, false);
  assert.equal('catalog' in store, true);
});