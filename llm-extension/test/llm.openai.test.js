// Tests de la boucle LLM avec l'adaptateur OPENAI (API Responses simulée).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakes, resetFakes, fnCall } from '../testkit/helpers.js';

const fake = installFakes();
const { runAnalysis: analyse, WEB_SEARCH } = await import('../llm.js');
const runAnalysis = (opts) => analyse({ provider: 'openai', ...opts });
const { saveSettings } = await import('../settings.js');
WEB_SEARCH.enabled = true;

const KEY = 'sk-test-123';
const enable = () => saveSettings({ consent: true, apiKey: KEY, share: { tab_count: true } });
const deps = {
  getPatterns: async () => ({ period_days: 7, metrics: { tab_count: { avg: 34 }, domains: ['example-secret.com'] } }),
  getInstalled: async () => [],
};
const submit = (recs, id = 's') => fnCall(id, 'submit_recommendations', { recommendations: recs });

beforeEach(() => resetFakes(fake));

test('boucle complète avec OpenAI Responses : requête bien formée et items renvoyés tels quels', async () => {
  await enable();
  fake.apiQueue.push(
    fnCall('c1', 'get_user_patterns', {}),
    fnCall('c2', 'search_catalog', { needs: ['trop_onglets'] }),
    submit([{ id: 'tab-groups', reason: 'Tu as souvent beaucoup d’onglets.' }], 'c3'),
  );
  const r = await runAnalysis({ deps, force: true });
  assert.equal(r.status, 'ok');
  assert.equal(r.recommendations[0].name, 'Groupes'); // nom issu du catalogue
  assert.equal(fake.apiCalls.length, 3);

  const first = fake.apiCalls[0];
  assert.equal(first.url, 'https://api.openai.com/v1/responses');
  assert.equal(first.init.headers.authorization, `Bearer ${KEY}`);
  assert.equal(first.body.store, false);                                    // pas de stockage de la réponse côté OpenAI
  assert.deepEqual(first.body.include, ['reasoning.encrypted_content']);
  assert.equal(typeof first.body.instructions, 'string');
  const fn = first.body.tools.find((t) => t.name === 'search_catalog');
  assert.equal(fn.type, 'function');
  assert.equal(fn.strict, false);
  assert.ok(fn.parameters.properties.needs);
  const web = first.body.tools.find((t) => t.type === 'web_search');
  assert.ok(web.filters.allowed_domains.includes('chromewebstore.google.com'));
  assert.equal(first.body.max_tool_calls, WEB_SEARCH.maxUses);

  // 2e requête : message initial, puis les items du tour 1 (raisonnement + appel) INCHANGÉS, puis le résultat
  const input = fake.apiCalls[1].body.input;
  assert.equal(input[0].role, 'user');
  assert.equal(input[1].type, 'reasoning');
  assert.equal(input[1].encrypted_content, 'enc-c1');
  assert.equal(input[2].type, 'function_call');
  assert.equal(input[3].type, 'function_call_output');
  assert.equal(input[3].call_id, 'c1');
  assert.match(input[3].output, /^<donnees_non_fiables/);
  assert.match(input[3].output, /tab_count/);
  assert.doesNotMatch(input[3].output, /example-secret/);                   // catégorie non partagée absente
});

test('arguments JSON invalides : le LLM reçoit une erreur d’outil et la boucle continue', async () => {
  await enable();
  fake.apiQueue.push(fnCall('c1', 'search_catalog', null, 'pas du json {'), submit([]));
  const r = await runAnalysis({ deps, force: true });
  assert.equal(r.status, 'ok');
  const out = fake.apiCalls[1].body.input.find((i) => i.type === 'function_call_output');
  assert.match(out.output, /needs invalide/);
});

test('une erreur 401 donne un message clair', async () => {
  await enable();
  fake.apiQueue.push({ http: 401, body: { error: { message: 'Incorrect API key provided', type: 'invalid_request_error', code: 'invalid_api_key' } } });
  const r = await runAnalysis({ deps, force: true });
  assert.equal(r.status, 'error');
  assert.match(r.error, /401/);
});

test('une erreur qui cite la clé est masquée avant stockage (ex. quota dépassé)', async () => {
  await enable();
  fake.apiQueue.push({ http: 429, body: { error: { message: `You exceeded your quota for key ${KEY}`, type: 'insufficient_quota', code: 'insufficient_quota' } } });
  const r = await runAnalysis({ deps, force: true });
  assert.equal(r.status, 'error');
  assert.match(r.error, /429/);
  assert.equal(r.error.includes(KEY), false);
  assert.equal(JSON.stringify(fake.store.llmMeta).includes(KEY), false);
});

test('une réponse « incomplete » (tronquée) est une erreur', async () => {
  await enable();
  fake.apiQueue.push({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output: [], usage: {} });
  const r = await runAnalysis({ deps, force: true });
  assert.equal(r.status, 'error');
  assert.match(r.error, /tronquée/);
});

test('une réponse « failed » est une erreur', async () => {
  await enable();
  fake.apiQueue.push({ status: 'failed', error: { message: 'boom' }, output: [], usage: {} });
  const r = await runAnalysis({ deps, force: true });
  assert.match(r.error, /boom/);
});

test('sans recherche web, aucun outil web_search n’est envoyé', async () => {
  await enable();
  WEB_SEARCH.enabled = false;
  try {
    fake.apiQueue.push(submit([]));
    await runAnalysis({ deps, force: true });
    assert.equal(fake.apiCalls[0].body.tools.some((t) => t.type === 'web_search'), false);
    assert.equal('max_tool_calls' in fake.apiCalls[0].body, false);
  } finally {
    WEB_SEARCH.enabled = true;
  }
});
