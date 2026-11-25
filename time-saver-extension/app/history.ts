import { Success, Conclusion } from "./types.ts"

export async function saveConclusion(events: string, recommendations:string, others:string): Promise<Success> {
    chrome.storage.local.set({ history: {events:events, recommendations: recommendations, others: others}})
    // console.log("Events:", events) 
    // console.log("Recommendations:", recommendations)
    // console.log("Others:", others)
    return { success:true, details: JSON.stringify({events:events, recommendations: recommendations, others:others}) }
}

export async function getPreviousConclusion(): Promise<Conclusion> {
    const { history } = await chrome.storage.local.get("history")
    return history as Conclusion ?? {
        events: "",
        recommendations: "",
        others: ""
    };
}