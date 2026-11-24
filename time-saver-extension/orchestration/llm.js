import { SYSTEM_PROMPT, OPTIMIZE_PROMPT, WEB_SEARCH, TOOL_DEFS, run, TEST_PROMPT } from './mini_tools.js';
import { toResponseInputItems } from "openai/lib/responses/ResponseInputItems";
import { getClient } from './api.js';
import { getPreviousConclusion } from '../app/history.js';


export async function testLLM() {
    return await runLLMCycle(TEST_PROMPT);
}

async function applyTools(calls) {
    let results = []
    for (const call of calls) {
        const args = JSON.parse(call.arguments);
        const result = await run(call.name, args);
        const output = result?.text;
        results.push({
            type: "function_call_output",
            call_id: call.call_id,
            output: typeof output === "string"
                ? output
                : JSON.stringify(result)
        });
    }
    return results
}

export async function runLLMCycle(prompt) {
    let context = [{ role: "user", content: prompt }];

    while (true) {
        const response = await sendMessage(context);

        const calls = response.output.filter(
            item => item.type === "function_call"
        );

        if (calls.length === 0) {
            return {
                text: response.output_text,
                recommendations: getPreviousConclusion(),
            };
        }
        const results = await applyTools(calls);
        // the LLM response
        context.push(...toResponseInputItems(response.output));
        // the tools results
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

export async function runPeriodicAnalysis() {
    console.log("\n--- [Déclenchement périodique] Analyse par le LLM ---");
    const startTime = Date.now();

    const res = await runLLMCycle(OPTIMIZE_PROMPT);
    console.log(`Analyse terminée en ${(Date.now() - startTime) / 1000}s`);
    console.log("LLM response : ", res);
}