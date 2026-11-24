import { per_id, per_url, per_event } from "../app/data_aggregator";
import { searchCatalog, getInstalled } from "../app/mini_catalog";
import type {
    TabEvent,
    Need,
    PerIdResult,
    PerUrlResult,
    PerEventResult,
    Conclusion,
    CatalogData,
    InstalledExtensionList
} from "../app/types";
import { saveConclusion, getPreviousConclusion } from "./../app/history.ts"

export class Function_Tools {
    /** Aggregates events by tab ID. */
    per_id = async (
        params: { events: TabEvent[] | null }
    ): Promise<{ result: PerIdResult }> => ({
        result: await per_id(params.events ?? undefined)
    });

    /** Aggregates events by URL. */
    per_url(
        params: { events: TabEvent[] | null }
    ): Promise<{ result: PerUrlResult }> {
        return per_url(params.events ?? undefined)
            .then(result => ({ result }));
    }

    /** Aggregates events by event type. */
    per_event(
        params: { events: TabEvent[] | null }
    ): Promise<PerEventResult> {
        return per_event(params.events ?? undefined);
    }

    /** Searches the feature catalog. */
    searchCatalog(
        params: { need: Need }
    ): Promise<CatalogData> {
        return searchCatalog(params.need)
    }

    /** get the list of installed extension on the chrome browser */
    getInstalled(): Promise<InstalledExtensionList> {
        return getInstalled()
    }

    /** save the conclusion made from events 
     * (to keep some history) */
    saveConclusion(
        params: { events: string; recommendations: string, others: string }
    ): { success: boolean } {
        return saveConclusion(params.events, params.recommendations, params.others);
    }

    /** get the previous conclusion drawn during the previous reflexion */
    getPreviousConclusion(): Conclusion {
        return getPreviousConclusion()
    }
}
