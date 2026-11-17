import { per_id, per_url, per_event } from "./../app/data_aggregator.ts"
import { searchCatalog } from "../app/mini_catalog.ts";
import TOOL_DEFS from "./tools.json" with { type: "json" };

export { TOOL_DEFS };


export async function run(name, input) {
    const impls = {
        async helloWorld({ somethingToSay }) {
            return `Hello, ${somethingToSay}!`;
        },
        async per_id({ events } = {}) {
            return await per_id(events);
        },

        async per_event({ events } = {}) {
            return await per_event(events);
        },

        async per_url({ events } = {}) {
            return await per_url(events);
        },

        async searchCatalog({ needs }) {
            return await searchCatalog(needs);
        },

        async get_installed_extensions() {
            return await getInstalled();
        },
    };

    const impl = impls[name];

    if (!impl) {
        throw new Error(`Unknown tool: ${name}`);
    }

    return await impl(input);
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
