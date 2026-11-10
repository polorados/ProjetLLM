import { load_events, per_id, per_event, per_url } from "./data_aggregator.js";
import { save, track_tabs } from "./app/mini_tracker.js";
import { searchCatalog, syncCatalog } from "./app/mini_catalog.js"
import { testLLM } from "./llm.js";
import { createToolRunner } from "./app/mini_tools.js";


async function decide(events) { 
    const ids = await per_id(events)
    let recommendations;
    if (Object.keys(ids).length >= 0) {
        recommendations = await searchCatalog("trop_onglets");
    }
    recommendations = await save_recommendations(recommendations);
    await chrome.storage.local.set({ recommendations: recommendations });
    return recommendations;
}

async function save_recommendations(recommendations) {
    return Object.fromEntries(
        recommendations.map(({ id, name, needs, summary, url, shortcut }) => [
            id,
            { name, needs, summary, url, shortcut }
        ])
    );
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

async function main() {

    syncCatalog();

    track_tabs();

    console.log("trackers are on");
    const events = await load_events();

    console.log("events are fetched");
    const [ids, evts, urls] = await Promise.all([
        per_id(events),
        per_event(events),
        per_url(events),
    ]);

    console.log({ ids, evts, urls });
    const recommendations = await decide(events)
    console.log("has decided this : ", recommendations)

    await runTests();
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    let res = "failed";

    while (res == "failed") {
        await sleep(2000);
        res = await testLLM();
        console.log("LLM response : ", res);
    }
}

main();
