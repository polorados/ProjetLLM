// Faux environnement partagé par les tests : faux chrome + faux fetch (catalogue embarqué ET API du LLM).
// À appeler AVANT d'importer les modules de l'extension.

export const bundled = {
  schema_version: 1,
  version: '2026-01-01',
  entries: [
    { id: 'tab-groups', type: 'chrome_feature', name: 'Groupes', summary: 'Regroupe les onglets', needs: ['trop_onglets'], url: 'https://support.google.com/a', last_verified: '2026-01-01' },
    { id: 'ext-one', type: 'extension', name: 'Ext', summary: 'Gère les onglets', needs: ['trop_onglets', 'aller_retour'], url: 'https://chromewebstore.google.com/detail/x', extension_id: 'a'.repeat(32), permissions_level: 'low', last_verified: null },
  ],
};

export const jsonResponse = (body, status = 200) => ({
  ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body), headers: { get: () => null },
});

// Réponse OpenAI (Responses API) « le LLM demande d'appeler un outil » : un item de raisonnement + un function_call
export const fnCall = (callId, name, args, rawArguments) => ({
  status: 'completed',
  output: [
    { type: 'reasoning', id: 'rs_' + callId, summary: [], encrypted_content: 'enc-' + callId },
    { type: 'function_call', id: 'fc_' + callId, call_id: callId, name, arguments: rawArguments ?? JSON.stringify(args) },
  ],
  usage: { input_tokens: 10, output_tokens: 5 },
});

// Réponse Anthropic « le LLM demande d'appeler un outil »
export const toolUse = (id, name, input) => ({
  stop_reason: 'tool_use', content: [{ type: 'tool_use', id, name, input }], usage: { input_tokens: 10, output_tokens: 5 },
});

export function installFakes() {
  const fake = { store: {}, apiCalls: [], apiQueue: [] };
  globalThis.chrome = {
    runtime: { getURL: (p) => 'file://' + p, id: 'p'.repeat(32) },
    storage: {
      local: {
        get: async (keys) => {
          const list = Array.isArray(keys) ? keys : [keys];
          return Object.fromEntries(list.filter((k) => k in fake.store).map((k) => [k, fake.store[k]]));
        },
        set: async (obj) => { Object.assign(fake.store, obj); },
        remove: async (keys) => { for (const k of [].concat(keys)) delete fake.store[k]; },
      },
    },
    alarms: { create() {} },
    management: { getAll: async () => [] },
  };
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('https://api.anthropic.com') || String(url).startsWith('https://api.openai.com')) {
      fake.apiCalls.push({ url, init, body: JSON.parse(init.body) }); // instantané : la boucle modifie `messages` ensuite
      const next = fake.apiQueue.shift();
      if (!next) throw new Error('plus de réponse scriptée');
      // Pour simuler une erreur HTTP : { http: 401, body: {...} } (le champ `status` appartient aux réponses OpenAI)
      return jsonResponse(next.body ?? next, next.http ?? 200);
    }
    return jsonResponse(bundled); // catalogue embarqué
  };
  return fake;
}

export function resetFakes(fake) {
  fake.store = {};
  fake.apiCalls.length = 0;
  fake.apiQueue.length = 0;
}
