import { SYSTEM_PROMPT } from './app/mini_prompt.js';
import { WEB_SEARCH, FIRST_MESSAGE, TOOL_DEFS } from './app/mini_tools.js';
import OpenAI from "openai";

let client;

export async function testLLM() {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return "failed";
    }

    client = new OpenAI({
        apiKey: apiKey.apiKey,
        dangerouslyAllowBrowser: true
    });

    const response = await client.responses.create({
        model: "gpt-6-astra",
        input: "Write a one-sentence bedtime story about a unicorn."
    });

    return response.output_text;
}

export async function getApiKey() {
    const apiKey = await chrome.storage.local.get(['apiKey']);
    return apiKey;
}

async function sendMessage(apiKey, systemPrompt, toolDefs, firstMessage, webSearch) {
    const session = PROVIDERS[provider].createSession({
      apiKey: apiKey, system: systemPrompt, toolDefs: toolDefs, firstMessage: firstMessage, webSearch: webSearch,
    });
}

export async function runAnalysis() {
  const apiKey = await getApiKey();
  if (!apiKey) return { status: 'skipped', reason: 'clé API manquante' };

  createToolRunner();

  try {
    sendMessage(apiKey, SYSTEM_PROMPT, TOOL_DEFS, FIRST_MESSAGE, WEB_SEARCH);
    return { status: 'ok' };
  } catch (e) {
    let error = e.name === 'AbortError' ? 'délai dépassé' : String(e.message ?? e);
    error = error.split(settings.apiKey).join('[clé]'); // sécurité : la clé ne doit jamais finir dans un message stocké
    console.warn('[llm] analyse échouée :', error);
    return { status: 'error', error };
  }
}