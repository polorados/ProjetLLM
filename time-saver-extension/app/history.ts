let previousConclusion: string | null = null;
let notes = "";

export function saveConclusion(conclusion: string, newNotes = ""): void {
    previousConclusion = conclusion;
    notes = newNotes;
}

export function getPreviousConclusion() {
    return {
        conclusion: previousConclusion,
        notes: notes,
    };
}