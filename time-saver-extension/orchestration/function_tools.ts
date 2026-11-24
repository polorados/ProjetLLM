import { per_id, per_url, per_event } from "../app/data_aggregator";
import { searchCatalog } from "../app/mini_catalog";
import { type TabEvent, Need } from "../app/types";

export class Function_Tools {
    /** Aggregates events by tab ID. */
    per_id = async (params: { events: TabEvent[] | null }) => ({
        result: await per_id(params.events ?? undefined)
    });

    /** Aggregates events by URL. */
    per_url(params: { events: TabEvent[] | null }) {
        return { result: per_url(params.events ?? undefined) };
    }

    /** Aggregates events by event type. */
    per_event(params: { events: TabEvent[] | null }) {
        return per_event(params.events ?? undefined);
    }

    /** Searches the feature catalog. */
    searchCatalog(params: { need: Need }) {
        return { result: searchCatalog(params.need) };
    }
}
