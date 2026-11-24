import { Function_Tools } from "./function_tools.ts"
import TOOL_DEFS from "./tools.json" with { type: "json" };

export { TOOL_DEFS };

const functionTools = new Function_Tools();

// // Renvoie { run, state}
// // 'state' mémorise le résultat final 
// export function createToolRunner(){
//   const state = { previous_conclusion: null };

//   const impls = {
//     async per_id({ events } = {}) {
//       return await functionTools.per_id({events});
//     },

//     async per_event({ events } = {}) {
//       return await functionTools.per_event({events});
//     },

//     async per_url({ events } = {}) {
//       return await functionTools.per_url({events});
//     },
    
//     async search_catalog({needs}) {
//       return await functionTools.searchCatalog({needs});
//       // return results.map((e) => ({
//       //   id: e.id,
//       //   type: e.type,
//       //   name: e.name,
//       //   summary: e.summary,
//       //   needs: e.needs,
//       //   url: e.url,
//       //   shortcut: e.shortcut ?? null,
//       //   last_verified: e.last_verified,
//       // }));
//     },

//     async get_installed_extensions() {
//       return await getInstalled();
//     },

//     async submit_conclusion({ conclusion, notes = '' }) {
//       state.conclusion = conclusion;
//       state.notes = typeof notes === 'string' ? notes.slice(0, 300) : '';
//     },

//     async get_previous_conclusion() {
//         return state
//     }
//   };

//   async function run(name, input) {
//     console.log(`[Tool Called] Le LLM appelle l'outil '${name}' avec :`, input);
//     const impl = impls[name];

//     if (!impl) return { text: JSON.stringify({ error: `outil inconnu : ${name}` }), isError: true };

//     try {
//       const out = await impl(input && typeof input === 'object' ? input : {});

//       console.log(`[Tool Result] Ce que '${name}' renvoie au LLM :`, out); // <-- Regardez ceci de très près
//       const isError = Boolean(out && typeof out === 'object' && out.error);
//       return { text: typeof out === 'string' ? out : JSON.stringify(out), isError };
//     } catch (e) {
//       console.error(`[Tool Error] ${name}:`, e);
//       return { text: JSON.stringify({ error: String(e?.message ?? e) }), isError: true };
//     }
//   }

//   return { run, state };
// }

const impls = {
    per_id: ({ events } = {})       => functionTools.per_id({ events }),
    per_event: ({ events } = {})    => functionTools.per_event({ events }),
    per_url: ({ events } = {})      => functionTools.per_url({ events }),
    searchCatalog: ({ need })       => functionTools.searchCatalog({ need }),
    get_installed_extensions : ()   => functionTools.getInstalled()
};

export async function run(name, input) {
    const impl = impls[name];

    if (!impl) throw new Error(`Unknown tool: ${name}`);

    return await impl(input ?? {});
}


export const WEB_SEARCH = {
    type: "web_search",
    filters: {
        allowed_domains: [
            "chromewebstore.google.com",
            "developer.chrome.com",
            "support.google.com"
        ]
    }
};

export const FIRST_MESSAGE = "Hello World";
export const TEST_PROMPT = "Test all the tools available and give the outputs of all of them in your response"

export const SYSTEM_PROMPT = `Tu es le moteur de recommandation d'une extension Chrome. À partir de statistiques d'usage agrégées, tu recommandes au plus 3 fonctionnalités natives de Chrome ou extensions parmi celles du catalogue.

DÉMARCHE
1. Appelle per_id, per_event et per_url, et getPreviousConclusion pour utiliser des conclusion passées .
2. Déduis 1 à 3 besoins, uniquement parmi ceux acceptés par search_catalog.
3. Appelle search_catalog avec les besoins que tu as trouvé. Appelle get_installed_extensions si tu veux éviter de recommander quelque chose qui fait déjà double emploi avec une extension de l'utilisateur.
4. Si le catalogue couvre mal le besoin et que la recherche web est disponible, fais au plus 2 recherches, puis recommande l'extension à l'utilisateur si elle semble pertinente.
5. Termine toujours en appelant saveConclusion : au plus 3 recommandations, et une raison courte en français (une phrase) fondée sur les données observées. S'il n'y a pas de signal clair, ne pas envoyer de reccomendations et mettre les informations qui ont pu être tirée dans saveConclusion.`;