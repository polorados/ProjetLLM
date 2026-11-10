import { load_events, per_id, per_event, per_url } from "./data_aggregator.js";
import { save, track_tabs } from "./app/mini_tracker.js";
import { searchCatalog, syncCatalog } from "./app/mini_catalog.js"
import { testLLM } from "./llm.js";


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

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    let res = "failed";

    while (res == "failed") {
        await sleep(2000);
        res = await testLLM();
        console.log("LLM response : ", res);
    }
}

main();
