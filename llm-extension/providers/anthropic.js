// providers/anthropic.js : adaptateur pour l'API Messages d'Anthropic.
// Interface commune : createSession(...) -> { next(), addToolResults(results) }  (voir llm.js)

import { postJson } from './http.js';

export const API_URL = 'https://api.anthropic.com/v1/messages';
export const MODEL = 'claude-haiku-5-5'; // 'claude-sonnet-5-5' pour un meilleur jugement
const API_VERSION = '2023-06-01';
const MAX_TOKENS = 1500;

export function createSession({ apiKey, system, toolDefs, firstMessage, webSearch }) {
  const tools = [...toolDefs];
  if (webSearch.enabled) {
    tools.push({ type: 'web_search_20250305', name: 'web_search', max_uses: webSearch.maxUses, allowed_domains: webSearch.allowedDomains });
  }
  const messages = [{ role: 'user', content: firstMessage }];

  return {
    // Un aller-retour avec le LLM. Renvoie les outils demandés (toolCalls) et la consommation.
    async next() {
      const res = await postJson(API_URL, {
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true', // exigé pour appeler l'API depuis un navigateur
      }, { model: MODEL, max_tokens: MAX_TOKENS, system, tools, messages });

      messages.push({ role: 'assistant', content: res.content }); // renvoyé tel quel, y compris les blocs de recherche web
      const usage = { input_tokens: res.usage?.input_tokens ?? 0, output_tokens: res.usage?.output_tokens ?? 0 };
      if (res.stop_reason === 'pause_turn') return { toolCalls: [], pause: true, usage }; // tour long mis en pause par le serveur
      const toolCalls = res.stop_reason === 'tool_use'
        ? res.content.filter((b) => b.type === 'tool_use').map((b) => ({ id: b.id, name: b.name, input: b.input }))
        : [];
      return { toolCalls, pause: false, usage };
    },

    addToolResults(results) {
      messages.push({
        role: 'user',
        content: results.map((r) => ({ type: 'tool_result', tool_use_id: r.id, content: r.text, ...(r.isError ? { is_error: true } : {}) })),
      });
    },
  };
}
