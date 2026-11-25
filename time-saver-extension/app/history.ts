import { Success } from "./types.ts"
let notes_events:string;
let notes_recommendations:string;
let notes_other:string;

export function saveConclusion(events: string, recommendations:string, others:string): Success {
    notes_events = events;
    notes_recommendations = recommendations;
    notes_other = others;

    // console.log("Events:", events) 
    // console.log("Recommendations:", recommendations)
    // console.log("Others:", others)
    return { success:true, details: JSON.stringify({events:events, recommendations: recommendations, others:others}) }
}

export function getPreviousConclusion() {
    return {
        events: notes_events,
        recommendations: notes_recommendations,
        others: notes_other,
    };
}