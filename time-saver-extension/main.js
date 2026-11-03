import { load_events, per_id, per_event, per_url } from "./data_aggregator.js";
import { save, track_tabs } from "./mini_tracker.js";

async function main() {
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
}

main();
