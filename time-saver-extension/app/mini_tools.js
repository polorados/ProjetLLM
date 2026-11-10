// définit les outils que le LLM peut appeler

// TOOL_DEFS est un objet pour que le LLM sache quels outils
// sont à sa disposition

import { per_id, per_event, per_url } from './data_aggregator.js';
import { searchCatalog, NEEDS } from './mini_catalog.js';
export const TOOL_DEFS = [
    {
      type: "function",
      name: "per_id",
      description: "Agrège les événements par identifiant. Si events est omis, utilise tous les événements enregistrés.",
      parameters: {
        type: "object",
        properties: {
          events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                time: { type: "integer" },
                name: {
                  type: "string",
                  enum: ["created", "activated", "updated", "closed"],
                },
                id: { type: "integer" },
                url: { type: ["string", "null"] },
                info: { type: ["object", "null"] },
              },
              required: ["time", "name", "id", "url", "info"],
              additionalProperties: false,
            },
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "per_event",
      description: "Agrège les événements par événement. Si events est omis, utilise tous les événements enregistrés.",
      parameters: {
        type: "object",
        properties: {
          events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                time: { type: "integer" },
                name: {
                  type: "string",
                  enum: ["created", "activated", "updated", "closed"],
                },
                id: { type: "integer" },
                url: { type: ["string", "null"] },
                info: { type: ["object", "null"] },
              },
              required: ["time", "name", "id", "url", "info"],
              additionalProperties: false,
            },
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "per_url",
      description: "Agrège les événements par URL. Si events est omis, utilise tous les événements enregistrés.",
      parameters: {
        type: "object",
        properties: {
          events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                time: { type: "integer" },
                name: {
                  type: "string",
                  enum: ["created", "activated", "updated", "closed"],
                },
                id: { type: "integer" },
                url: { type: ["string", "null"] },
                info: { type: ["object", "null"] },
              },
              required: ["time", "name", "id", "url", "info"],
              additionalProperties: false,
            },
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "search_catalog",
      strict: false,
      description: "Cherche des fonctionnalités Chromes et extensions recommandées dans le catalogue, à partir de besoins. Classement : plus de besoins couverts, entrées vérifiées, fonctionnalités natives d'abord.",
      parameters: {
          type: "object",
          properties: {
              needs: { type: "string", enum: NEEDS },
          },
          required: ["needs"],
          additionalProperties: false
      },
    },
    {
      type: "function",
      name: "get_installed_extensions",
      strict: true,
      description: "Liste les extensions installées par l'utilisateur.",
      parameters: {
          type: "object",
          properties: {},
          additionalProperties: false
      }
    },
    {
      type: 'function',
      name: 'submit_recommendations',
      description: 'Rend le résultat final (termine l’analyse). Au plus 3 recommandations, uniquement des entrées du catalogue.',
      strict: false,
      parameters: {
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
export async function getInstalled() {
  const all = await chrome.management.getAll();
  return all
    .filter((e) => e.type === 'extension' && e.id !== chrome.runtime.id)
    .slice(0, 100)
    .map((e) => ({ id: e.id, name: String(e.name).slice(0, 80), enabled: e.enabled }));
}

// Renvoie { run, state}
// 'state' mémorise le résultat final 
export function createToolRunner(){
  const state = { recommendations: null };

  const impls = {
    async per_id({ events } = {}) {
      return await per_id(events);
    },

    async per_event({ events } = {}) {
      return await per_event(events);
    },

    async per_url({ events } = {}) {
      return await per_url(events);
    },
    
    async search_catalog({needs}) {
      return await searchCatalog(needs);
      // return results.map((e) => ({
      //   id: e.id,
      //   type: e.type,
      //   name: e.name,
      //   summary: e.summary,
      //   needs: e.needs,
      //   url: e.url,
      //   shortcut: e.shortcut ?? null,
      //   last_verified: e.last_verified,
      // }));
    },

    async get_installed_extensions() {
      return await getInstalled();
    },

    async submit_recommendations({ recommendations, notes = '' }) {
      state.recommendations = recommendations;
      state.notes = typeof notes === 'string' ? notes.slice(0, 300) : '';
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

export const WEB_SEARCH = {
  enabled: false,
  maxUses: 2,
  allowedDomains: ['chromewebstore.google.com', 'developer.chrome.com', 'support.google.com'],
};

export const FIRST_MESSAGE = "Hello World";
