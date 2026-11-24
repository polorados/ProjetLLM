import { SYSTEM_PROMPT, FIRST_MESSAGE, WEB_SEARCH, TOOL_DEFS, run, TEST_PROMPT } from './mini_tools.js';
import { toResponseInputItems } from "openai/lib/responses/ResponseInputItems";
import { getClient } from './api.js';
import { getPreviousConclusion } from '../app/history.js';


export async function testLLM() {
    let context = [{ role: "user", content: TEST_PROMPT }];

    while (true) {
        const response = await sendMessage(context);

        const calls = response.output.filter(
            item => item.type === "function_call"
        );

        console.log("Model output:", response.output);
        console.log("Function calls:", calls.length);

        if (calls.length === 0) {
            console.log("Final answer:", response.output_text);
            console.log("Recommandation finales stockées :", getPreviousConclusion());
            return {
                text: response.output_text,
                recommendations: getPreviousConclusion(),
            };
        }

        context.push(...toResponseInputItems(response.output));

        console.log("Entering tool output handling");
        console.log("Calls:", calls);
        console.log("Calls count:", calls?.length);
        const results = [];

        for (const call of calls) {
            console.log("Processing:", call);

            const args = JSON.parse(call.arguments);
            console.log("Arguments:", args);

            const result = await run(call.name, args);
            console.log("Run result:", result);

            const output = result?.text;
            console.log("Output:", output);

            results.push({
                type: "function_call_output",
                call_id: call.call_id,
                output: typeof output === "string"
                    ? output
                    : JSON.stringify(result)
            });
        }

        console.log("Final results:", results);

console.log("All tool results:", results);
        context.push(...results);
    }
}

export async function sendMessage(input) {
    const client = getClient();
    return await client.responses.create({
        model: "gpt-6-luna",
        instructions: SYSTEM_PROMPT,
        input: input,
        tools: [
            WEB_SEARCH,
            ...TOOL_DEFS
        ],
        tool_choice: "auto"
    });
}

// async function sendMessage(apiKey, systemPrompt, toolDefs, firstMessage, webSearch) {
//     const session = PROVIDERS[provider].createSession({
//       apiKey: apiKey, system: systemPrompt, toolDefs: toolDefs, firstMessage: firstMessage, webSearch: webSearch,
//     });
// }

// export async function runAnalysis() {
//   const apiKey = await getApiKey();
//   if (!apiKey) return { status: 'skipped', reason: 'clé API manquante' };

//   createToolRunner();

//   try {
//     sendMessage(apiKey, SYSTEM_PROMPT, TOOL_DEFS, FIRST_MESSAGE, WEB_SEARCH);
//     return { status: 'ok' };
//   } catch (e) {
//     let error = e.name === 'AbortError' ? 'délai dépassé' : String(e.message ?? e);
//     error = error.split(settings.apiKey).join('[clé]'); // sécurité : la clé ne doit jamais finir dans un message stocké
//     console.warn('[llm] analyse échouée :', error);
//     return { status: 'error', error };
//   }
// }