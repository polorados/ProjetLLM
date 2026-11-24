import { Function_Tools } from "./function_tools.ts"
import TOOL_DEFS from "./tools.json" with { type: "json" };

export { TOOL_DEFS };

const functionTools = new Function_Tools();

const impls = {
    per_id: ({ events } = {})       => functionTools.per_id({ events }),
    per_event: ({ events } = {})    => functionTools.per_event({ events }),
    per_url: ({ events } = {})      => functionTools.per_url({ events }),
    searchCatalog: ({ need } = {})  => functionTools.searchCatalog({ need }),
    getInstalled : ()               => functionTools.getInstalled(),
    saveConclusion: ({ conclusion, newNote } = {}) => functionTools.saveConclusion({ conclusion, newNote }),
    getPreviousConclusion: ()       => functionTools.getPreviousConclusion(),
    submitRecommendation: ({ recommendations})     => functionTools.submitRecommendation({ recommendations }),
    getCatalog: ()                  => functionTools.getCatalog()
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
3. Appelle searchCatalog avec les besoins que tu as trouvé. Appelle getInstalled si tu veux éviter de recommander quelque chose qui fait déjà double emploi avec une extension de l'utilisateur.
4. Si le catalogue couvre mal le besoin et que la recherche web est disponible, fais au plus 2 recherches, puis recommande l'extension à l'utilisateur si elle semble pertinente.
5. Termine toujours en appelant saveConclusion`

export const OPTIMIZE_PROMPT = "Tu es une IA qui recommende des extensions, raccourcis et life hack sur google chrome"