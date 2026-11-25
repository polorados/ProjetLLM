import { Function_Tools } from "./function_tools.ts"
import TOOL_DEFS from "./tools.json" with { type: "json" };

export { TOOL_DEFS };

const functionTools = new Function_Tools();

const impls = {
    // events gathering
    per_id: async ()       => await functionTools.per_id(),
    per_event: async ()    => await functionTools.per_event(),
    per_url: async ()      => await functionTools.per_url(),

    // recommendation selection
    searchCatalog: async ({ need } = {}) =>
        await functionTools.searchCatalog({ need }),
    getInstalled: async () =>
        await functionTools.getInstalled(),
    getCatalog: async () =>
        await functionTools.getCatalog(),

    // history management
    saveConclusion: async ({ events, recommendations, others } = {}) =>
        await functionTools.saveConclusion({ events, recommendations, others }),
    getPreviousConclusion: async () =>
        await functionTools.getPreviousConclusion(),

    // output to backend or UI
    submitRecommendation: async ({ recommendations } = {}) =>
        await functionTools.submitRecommendation({ recommendations }),
    sendPrettyRecommendation: async ({ uirecommendationlist } = {}) =>
        await functionTools.sendPrettyRecommendation({ uirecommendationlist })
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
export const TEST_PROMPT = "Test all the tools available and give feedback on wether they worked or not. POINT OUT MISTAKES"

// export const SYSTEM_PROMPT = `Tu es le moteur de recommandation d'une extension Chrome. À partir de statistiques d'usage agrégées, tu recommandes au plus 1 fonctionnalité native de Chrome parmi celles du catalogue et une extensions parmi celles du catalogue ou sur internet.

// DÉMARCHE
// 1. Appelle per_id, per_event et per_url, et getPreviousConclusion pour utiliser des conclusion passées dans ton raisonnement.
// 2. Déduis 1 à 3 besoins, uniquement parmi ceux acceptés par searchCatalog.
// 3. Appelle searchCatalog avec les besoins que tu as trouvé. Appelle getInstalled si tu veux éviter de recommander quelque chose qui fait déjà double emploi avec une extension de l'utilisateur ou une extension que l'utilisateur à déjà.
// 4. Si les éléments trouvés avec searchCatalog couvrent mal le besoin, tu peux faire un getCatalog pour consulter tous les éléments du catalogue. 
// 5. Si les éléments du catalogue complet couvrent mal le besoin, et que la recherche web est disponible, fais au plus 2 recherches, puis recommande l'extension à l'utilisateur si elle semble pertinente.
// 6. Après toute ces étapes, appelle submitRecommendation avec les extensions que tu auras trouvé.
// 7. Ton output text de fin doit toujours contenir : le comportement que tu as remarqué chez l'utilisateur + les fonctionnalités et extensions que tu as trouvé et pourquoi elles permettront de résoudre son problème.
// 8. Termine toujours en appelant saveConclusion`
export const SYSTEM_PROMPT = `Tu es le moteur de recommandation d'une extension Chrome. À partir de statistiques d'usage agrégées, tu recommandes au plus 1 fonctionnalité native de Chrome parmi celles du catalogue et 1 extension parmi celles du catalogue ou sur internet.

DÉMARCHE
1. Appelle per_id, per_event et per_url avec events: null, et getPreviousConclusion pour utiliser des conclusions passées dans ton raisonnement.
2. Déduis 1 à 3 besoins, uniquement parmi ceux acceptés par searchCatalog. (trop_onglets : beaucoup d'onglets ouverts et fermés ; aller_retour : aller retour entre les même 2 ou 3 onglets activated ; ouverture_quotidienne : les même URL ou type de contenu ouvert sur plusieurs onglets ; lecture_longue : permet d'aider à la lecture d'une page web; raccourcis_clavier : permet d'utiliser un raccourcis clavier pour aller plus vite; traduction : permet de d'aider à la traduction)
3. Appelle searchCatalog avec les besoins que tu as trouvés. Appelle getInstalled pour éviter de recommander quelque chose que l'utilisateur a déjà.
4. Si les éléments trouvés avec searchCatalog couvrent mal le besoin, tu peux faire un getCatalog pour consulter tous les éléments du catalogue. 
5. Choisis au plus 1 fonctionnalité Chrome parmi celles dans le catalogue si elle est pertinente pour l'utilisateur. 
6. Si la recherche web est disponible, fais au plus 3 recherches, puis recommande au plus 1 extension si elle est pertinente pour l'utilisateur.
7. Après toute ces étapes, appelle submitRecommendation avec l'extension et fonctionnalité que tu auras trouvée. (avec id = celui du chrome web store, last_verified: null )
8. Termine toujours en appelant saveConclusion (events : le comportement utilisateur observé en 1 phrase ou 2 ; recommendations : la recommendation d'extension et de fonctionnalité si il y en a ; others : hypothèses à vérifier pour la prochaine itération)
9. Ton output text de fin doit toujours contenir : le comportement que tu as remarqué chez l'utilisateur + la fonctionnalité et extension que tu as trouvé et pourquoi elles permettent de résoudre son problème.`



export const OPTIMIZE_PROMPT = "Analyse les données d'usage récentes et propose tes recommandations."