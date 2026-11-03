// providers/openai.js : adaptateur pour l'API Responses d'OpenAI.
// (Chat Completions ne permet pas de filtrer les domaines de la recherche web : on utilise Responses.)

import { postJson } from './http.js';

export const API_URL = 'https://api.openai.com/v1/responses';
export const MODEL = 'gpt-5.4-mini'; // à adapter aux modèles auxquels TA clé a accès (ex. 'gpt-5.4-nano' : moins cher)
// true pour les modèles « à raisonnement » (famille gpt-5, o3, o4-mini…). Mettre false pour un modèle
// sans raisonnement (ex. gpt-4.1-mini) : il refuse les paramètres `reasoning` et `include` ci-dessous.
const REASONING = true;
const MAX_OUTPUT_TOKENS = 4000; // inclut les tokens de raisonnement : ne pas descendre trop bas

// Même contenu que chez Anthropic (input_schema), mais enveloppé à la façon Responses.
// strict:false explicite : sinon des schémas à paramètres facultatifs pourraient être refusés.
const toFunctionTool = (def) => ({ type: 'function', name: def.name, description: def.description, parameters: def.input_schema, strict: false });

function parseArgs(text) {
  try { const v = JSON.parse(text); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}

export function createSession({ apiKey, system, toolDefs, firstMessage, webSearch }) {
  const tools = toolDefs.map(toFunctionTool);
  if (webSearch.enabled) tools.push({ type: 'web_search', filters: { allowed_domains: webSearch.allowedDomains } });
  const input = [{ role: 'user', content: firstMessage }];

  return {
    async next() {
      const body = { model: MODEL, instructions: system, input, tools, store: false, max_output_tokens: MAX_OUTPUT_TOKENS };
      if (REASONING) {
        body.reasoning = { effort: 'low' };
        body.include = ['reasoning.encrypted_content']; // nécessaire pour enchaîner les outils avec store:false
      }
      if (webSearch.enabled) body.max_tool_calls = webSearch.maxUses; // plafond sur les appels d'outils intégrés (recherche web)

      const res = await postJson(API_URL, { authorization: `Bearer ${apiKey}` }, body);

      // HTTP 200 ne veut pas dire « réponse utilisable » : on vérifie l'état
      if (res.status === 'failed') throw new Error(`réponse en échec : ${String(res.error?.message ?? 'inconnue').slice(0, 200)}`);
      if (res.status === 'incomplete') throw new Error(`réponse tronquée (${res.incomplete_details?.reason ?? 'raison inconnue'})`);

      const output = Array.isArray(res.output) ? res.output : [];
      input.push(...output); // à renvoyer TELS QUELS (raisonnement, appels d'outils, recherche web) au tour suivant
      const toolCalls = output
        .filter((item) => item.type === 'function_call')
        .map((item) => ({ id: item.call_id, name: item.name, input: parseArgs(item.arguments) }));
      return { toolCalls, pause: false, usage: { input_tokens: res.usage?.input_tokens ?? 0, output_tokens: res.usage?.output_tokens ?? 0 } };
    },

    addToolResults(results) {
      for (const r of results) input.push({ type: 'function_call_output', call_id: r.id, output: r.text });
    },
  };
}
