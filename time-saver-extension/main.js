import { load_events, per_id, per_event, per_url } from "./app/data_aggregator.ts";
import { save, track_tabs } from "./app/mini_tracker.js";
import { searchCatalog, syncCatalog, submitRecommendation } from "./app/mini_catalog.ts"
import { testLLM, runLLMCycle, runPeriodicAnalysis } from "./orchestration/llm.js";
import { connect } from "./orchestration/api.js"


// TODO: fix the load of events to avoid having to load
// them all each time and remove them from local storage when gotten
async function decide(events) { 
    const ids = await per_id(events)
    let recommendations;
    if (Object.keys(ids).length >= 0) {
        recommendations = await searchCatalog("trop_onglets");
    }
    recommendations = submitRecommendation(recommendations);
    await chrome.storage.local.set({ recommendations: recommendations });
    return recommendations;
}

async function runTests() {
    console.log("--- DÉBUT DU TEST DU TOOL RUNNER ---");
    const { run, state } = createToolRunner();

    console.log("Test de search_catalog...");
    const catalogResult = await run('search_catalog', { needs: 'trop_onglets' });
    console.log("Résultat :", catalogResult);

    console.log("Test de get_installed_extensions...");
    const installedResult = await run('get_installed_extensions', {});
    console.log("Résultat :", installedResult);

    console.log("Test de submit_recommendations...");
    await run('submit_recommendations', { 
        recommendations: [{ id: "test_123", reason: "Raison de test" }],
        notes: "Test réussi"
    });
    
    console.log("--- ÉTAT FINAL DU RUNNER ---");
    console.log(state);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const INTERVAL_TIME_MINUTES = 3;
const TEST_FUNCTIONS = false;
const TEST_TOOLS = true;


async function main() {
    // await chrome.storage.local.clear();

    syncCatalog();
    track_tabs();
    await connect();

    if (TEST_FUNCTIONS) {await runTests();}
    if (TEST_TOOLS) {
        console.log("-------Testing all the tools-------")
        const out = await testLLM();
        console.log("--------", out.text, "---------");
    }

    // testing
    // let res = "failed";
    // while (res == "failed") {
    //     await sleep(2000);
    //     res = await testLLM();
    //     console.log("LLM response : ", res);
    // }

    await runPeriodicAnalysis();
    // every 3 minutes 
    setInterval(runPeriodicAnalysis, INTERVAL_TIME_MINUTES * 1000 * 60);
}

main();
