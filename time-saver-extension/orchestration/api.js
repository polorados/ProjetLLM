import OpenAI from "openai";

let client = null;
let apiKey;

export async function connect() {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    while (!apiKey) {
        await sleep(1000);
        console.log("trying to get the api key")
        apiKey = await chrome.storage.local.get("apiKey");
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