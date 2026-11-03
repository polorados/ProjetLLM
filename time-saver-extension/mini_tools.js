// définit les outils que le LLM peut appeler

// TOOL_DEFS est un objet pour que le LLM sache quels outils
// sont à sa disposition
export const TOOL_DEFS = [
    {
        type: "function",
        name: "get_user_patterns",
        strict: true,
        description: "Renvoie les statistiques d'usage agrégées de l'utilisateur.",
        parameters: {
            type: "object",
            properties: {},
            additionalProperties: false
        }
    },
    {
        type: "function",
        name: "search_catalog",
        strict: true,
        description: "Cherche des fonctionnalités Chromes et extensions recommandées dans le catalogue, à partir de besoins. Classement : plus de besoins couverts, entrées vérifiées, fonctionnalités natives d'abord."
        parameters: {
            type: "object",
            properties: {},
            additionalProperties: false
        }
    }
];