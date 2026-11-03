// Tests de la boucle LLM avec l'adaptateur ANTHROPIC et une API simulée (aucun appel réseau réel, aucune clé réelle).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakes, resetFakes, toolUse } from '../testkit/helpers.js';

const fake = installFakes();
const { runAnalysis: analyse, WEB_SEARCH } = await import('../llm.js');
const runAnalysis = (opts) => analyse({ provider: 'anthropic', ...opts });
WEB_SEARCH.enabled = true; // désactivée par défaut dans l'extension ; ici on teste aussi son branchement
const { saveSettings } = await import('../settings.js');

const KEY = 'sk-test-123';
const enable = () => saveSettings({ consent: true, apiKey: KEY, share: { tab_count: true } });
const deps = {
  getPatterns: async () => ({ period_days: 7, metrics: { tab_count: { avg: 34 }, domains: ['example-secret.com'] } }),
  getInstalled: async () => [],
};
const submit = (recs, id = 's') => toolUse(id, 'submit_recommendations', { recommendations: recs });

beforeEach(() => resetFakes(fake));

test('boucle complète : patterns → catalogue → recommandations', async () => {
  await enable();
  fake.apiQueue.push(
    toolUse('t1', 'get_user_patterns', {}),
    toolUse('t2', 'search_catalog', { needs: ['trop_onglets'] }),
    submit([{ id: 'tab-groups', reason: 'Tu as souvent beaucoup d’onglets.' }], 't3'),
  );
  const r = await runAnalysis({ deps, force: true });
  assert.equal(r.status, 'ok');
  assert.equal(r.recommendations.length, 1);
  assert.equal(r.recommendations[0].name, 'Groupes'); // nom issu du catalogue
  assert.equal(fake.apiCalls.length, 3);
  assert.equal(fake.store.lastRecommendations.recommendations.length, 1);

  const first = fake.apiCalls[0];
  assert.equal(first.init.headers['x-api-key'], KEY);
  assert.deepEqual(first.body.tools.find((t) => t.name === 'web_search').allowed_domains.includes('chromewebstore.google.com'), true);

  // Ce que le LLM a reçu pour get_user_patterns : encadré, et SANS la catégorie non partagée
  const toolResult = fake.apiCalls[1].body.messages.at(-1).content[0];
  assert.equal(toolResult.tool_use_id, 't1');
  assert.match(toolResult.content, /^<donnees_non_fiables/);
  assert.match(toolResult.content, /tab_count/);
  assert.doesNotMatch(toolResult.content, /example-secret/);
});

test('rien n’est envoyé sans consentement', async () => {
  await saveSettings({ consent: false, apiKey: KEY, share: { tab_count: true } });
  const r = await runAnalysis({ deps, force: true });
  assert.equal(r.status, 'skipped');
  assert.equal(fake.apiCalls.length, 0);
});

test('une erreur 401 renvoie un statut error et ne stocke jamais la clé', async () => {
  await enable();
  fake.apiQueue.push({ http: 401, body: { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key ' + KEY } } });
  const r = await runAnalysis({ deps, force: true });
  assert.equal(r.status, 'error');
  assert.match(r.error, /401/);
  assert.equal(JSON.stringify(fake.store.llmMeta).includes(KEY), false);
});

test('pause_turn : on renvoie le tour tel quel et le serveur reprend', async () => {
  await enable();
  fake.apiQueue.push(
    { stop_reason: 'pause_turn', content: [{ type: 'server_tool_use', id: 'srv1', name: 'web_search', input: { query: 'x' } }], usage: {} },
    submit([]),
  );
  const r = await runAnalysis({ deps, force: true });
  assert.equal(r.status, 'ok');
  assert.equal(fake.apiCalls.length, 2);
  assert.equal(fake.apiCalls[1].body.messages.at(-1).role, 'assistant'); // pas de nouveau message utilisateur
});

test('un id inventé par le LLM est ignoré', async () => {
  await enable();
  fake.apiQueue.push(submit([{ id: 'inventé', reason: 'x' }]));
  const r = await runAnalysis({ deps, force: true });
  assert.deepEqual(r.recommendations, []);
});

test('une extension déjà installée est retirée localement', async () => {
  await enable();
  fake.apiQueue.push(submit([{ id: 'ext-one', reason: 'x' }]));
  const r = await runAnalysis({ deps: { ...deps, getInstalled: async () => [{ id: 'a'.repeat(32) }] }, force: true });
  assert.deepEqual(r.recommendations, []);
});

test('si le modèle s’arrête sans rendre de recommandations : erreur', async () => {
  await enable();
  fake.apiQueue.push({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Bonjour' }], usage: {} });
  const r = await runAnalysis({ deps, force: true });
  assert.equal(r.status, 'error');
});

test('sans force, une analyse récente n’est pas relancée', async () => {
  await enable();
  fake.apiQueue.push(submit([]));
  assert.equal((await runAnalysis({ deps })).status, 'ok');
  const again = await runAnalysis({ deps });
  assert.equal(again.status, 'skipped');
  assert.equal(fake.apiCalls.length, 1);
});
