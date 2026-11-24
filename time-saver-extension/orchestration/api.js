import OpenAI from "openai";

let client = null;
let apiKey;

export async function connect() {
    while (true) {
        const result = await chrome.storage.local.get("apiKey");
        const apiKey = result.apiKey;

        if (apiKey) {
            console.log("API key retrieved");

            client = new OpenAI({
                apiKey,
                dangerouslyAllowBrowser: true
            });

            return client;
        }

        console.log("Waiting for API key...");
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

export function getClient() {
    if (!client) {
        throw new Error("API client not initialized. Call connect() first.");
    }

    return client;
}