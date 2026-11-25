import { per_id, per_url, per_event } from "../app/data_aggregator";
import { searchCatalog, getInstalled, getCatalog, submitRecommendation, sendPrettyRecommendation } from "../app/mini_catalog";
import type {
    TabEvent,
    Need,
    PerIdResult,
    PerUrlResult,
    PerEventResult,
    Conclusion,
    CatalogData,
    InstalledExtensionList,
    ReshapedRecommendations,
    UIRecommendationList,
    Success,
} from "../app/types";
import { saveConclusion, getPreviousConclusion } from "./../app/history.ts"

export class Function_Tools {
     /** Aggregates events by tab ID. */
    per_id = async (): Promise<{ result: PerIdResult }> => ({
        result: await per_id()
    });
    /** Aggregates events by URL. */
    per_url = async (): Promise<{ result: PerUrlResult }> => ({
        result: await per_url()
    });
    /** Aggregates events by event type. */
    per_event = async (): Promise<{ result: PerEventResult }> => ({
        result: await per_event()
    });


    /** Searches the feature catalog. */
    searchCatalog = async (
        params: { need: Need }
    ): Promise<{ result: CatalogData }> => ({
        result: await searchCatalog(params.need)
    });
    /** Gets installed Chrome extensions. */
    getInstalled = async (): Promise<{ result: InstalledExtensionList }> => ({
        result: await getInstalled()
    });
    /** Gets the full catalog. */
    getCatalog = async (): Promise<{ result: CatalogData }> => ({
        result: await getCatalog()
    });


    /** Saves the conclusion drawn from events. */
    saveConclusion = async (
        params: { events: string; recommendations: string; others: string }
    ): Promise<{ result: Success }> => ({
        result: await saveConclusion(
            params.events,
            params.recommendations,
            params.others
        )
    });
    /** Gets the previous conclusion. */
    getPreviousConclusion = async (): Promise<{ result: Conclusion }> => ({
        result: await getPreviousConclusion()
    });


    /** Submits recommendations to the backend logic. */
    submitRecommendation = async (
        params: { recommendations: CatalogData }
    ): Promise<{ result: Success }> => ({
        result: await submitRecommendation(params.recommendations)
    });
    /** Sends recommendations formatted for the UI. */
    sendPrettyRecommendation = async (
        params: { uirecommendationlist: UIRecommendationList }
    ): Promise<{ result: Success }> => ({
        result: await sendPrettyRecommendation(params.uirecommendationlist)
    });
}
