import { track_tabs } from "./app/mini_tracker.js";
import { syncCatalog } from "./app/mini_catalog.ts"
import { testLLM, runPeriodicAnalysis } from "./orchestration/llm.js";
import { connect } from "./orchestration/api.js"

const INTERVAL_TIME_MINUTES = 3;
const TEST_TOOLS = true;


async function main() {
    syncCatalog();
    track_tabs();
    await connect();

    if (TEST_TOOLS) {
        console.log("-------Testing all the tools-------")
        const out = await testLLM();
        console.log("--------", out.text, "---------");
    }

    await runPeriodicAnalysis();
    // every 3 minutes 
    setInterval(runPeriodicAnalysis, INTERVAL_TIME_MINUTES * 1000 * 60);
}

main();
