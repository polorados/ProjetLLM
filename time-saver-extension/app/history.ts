let notes_events:string;
let notes_recommendations:string;
let notes_other:string;

export function saveConclusion(events: string, recommendations:string, others:string): { success: boolean } {
    notes_events = events;
    notes_recommendations = recommendations;
    notes_other = others;
    return { success : true }
}

export function getPreviousConclusion() {
    return {
        events: notes_events,
        recommendations: notes_recommendations,
        others: notes_other,
    };
}