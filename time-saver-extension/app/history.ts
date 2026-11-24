let previousConclusion: string | null = null;
let notes = "";

export function saveConclusion(conclusion: string, newNotes = ""): { success: boolean } {
    previousConclusion = conclusion;
    notes = newNotes;
    return { success : true }
}

export function getPreviousConclusion() {
    return {
        conclusion: previousConclusion,
        notes: notes,
    };
}