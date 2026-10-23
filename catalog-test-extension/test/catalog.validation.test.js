// Niveau 1 : fonctions pures, aucun faux `chrome` nécessaire.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeEntry, validateCatalog } from '../catalog.js';

const validFeature = {
  id: 'tab-groups',
  type: 'chrome_feature',
  name: 'Groupes d’onglets',
  summary: 'Regroupe tes onglets par thème.',
  needs: ['trop_onglets'],
  url: 'https://support.google.com/chrome/answer/2391819',
  last_verified: '2026-01-15',
};

test('une entrée valide est acceptée', () => {
  const { entry, reason } = sanitizeEntry(validFeature);
  assert.equal(reason, undefined);
  assert.equal(entry.id, 'tab-groups');
});

test('un champ inattendu est supprimé', () => {
  const { entry } = sanitizeEntry({ ...validFeature, html: '<script>alert(1)</script>' });
  assert.equal('html' in entry, false);
});

test('une url hors liste blanche est refusée', () => {
  const { reason } = sanitizeEntry({ ...validFeature, url: 'https://evil.com/x' });
  assert.equal(reason, 'url non autorisée');
});

test('une url http (non https) est refusée', () => {
  const { reason } = sanitizeEntry({ ...validFeature, url: 'http://support.google.com/x' });
  assert.equal(reason, 'url non autorisée');
});

test('les besoins inconnus sont ignorés, mais il en faut au moins un connu', () => {
  assert.deepEqual(sanitizeEntry({ ...validFeature, needs: ['trop_onglets', 'inconnu'] }).entry.needs, ['trop_onglets']);
  assert.equal(sanitizeEntry({ ...validFeature, needs: ['inconnu'] }).reason, 'aucun besoin connu');
});

test('une extension exige extension_id et permissions_level', () => {
  const ext = { ...validFeature, type: 'extension' };
  assert.equal(sanitizeEntry(ext).reason, 'extension_id invalide');
  const ok = sanitizeEntry({ ...ext, extension_id: 'a'.repeat(32), permissions_level: 'low' });
  assert.ok(ok.entry);
});

test('validateCatalog écarte les entrées invalides et les doublons', () => {
  const res = validateCatalog({
    schema_version: 1,
    version: '2026-01-15',
    entries: [validFeature, validFeature, { id: 'Mauvais ID' }],
  });
  assert.equal(res.ok, true);
  assert.equal(res.catalog.entries.length, 1);
  assert.equal(res.dropped.length, 2);
});

test('validateCatalog rejette un mauvais schema_version', () => {
  assert.equal(validateCatalog({ schema_version: 2, version: '2026-01-15', entries: [] }).ok, false);
});