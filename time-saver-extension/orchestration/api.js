import OpenAI from "openai";

let client = null;

export async function connect() {
    const { apiKey } = await chrome.storage.local.get("apiKey");

    if (!apiKey) {
        throw new Error("API key not found");
    }

    client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
    });

    return client;
}

export function getClient() {
    if (!client) {
        throw new Error("API client not initialized. Call connect() first.");
    }

    return client;
}