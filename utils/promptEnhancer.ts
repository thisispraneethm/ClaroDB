
const STOP_WORDS: Set<string> = new Set([
    "a", "an", "the", "is", "are", "was", "were", "of", "for", "in", "on", "at", "by",
    "with", "from", "to", "and", "or", "but", "not", "no", "yes", "what", "who", "when",
    "where", "why", "how", "show", "me", "list", "give", "tell", "average", "avg",
    "total", "sum", "count", "max", "min", "group", "order", "by", "asc", "desc"
]);

function levenshteinDistance(s1: string, s2: string): number {
    if (s1.length > s2.length) {
        [s1, s2] = [s2, s1];
    }
    const distances = Array.from({ length: s1.length + 1 }, (_, i) => i);
    for (let j = 0; j < s2.length; j++) {
        let prev = distances[0];
        distances[0]++;
        for (let i = 0; i < s1.length; i++) {
            const temp = distances[i + 1];
            distances[i + 1] = Math.min(
                prev + (s1[i] === s2[j] ? 0 : 1),
                distances[i] + 1,
                distances[i + 1] + 1
            );
            prev = temp;
        }
    }
    return distances[s1.length];
}

function getCloseMatches(word: string, possibilities: string[], cutoff: number = 0.7): string[] {
    const results: { word: string, score: number }[] = [];
    for (const p of possibilities) {
        const score = 1 - (levenshteinDistance(word, p) / Math.max(word.length, p.length));
        if (score >= cutoff) {
            results.push({ word: p, score });
        }
    }
    results.sort((a, b) => b.score - a.score);
    return results.map(r => r.word);
}


export function enhancePromptWithSchemaAwareness(prompt: string, allColumns: string[]): Record<string, string> {
    const corrections: Record<string, string> = {};
    const tokens = prompt.toLowerCase().replace(/[,?']/g, "").split(/\s+/);

    for (const token of tokens) {
        if (STOP_WORDS.has(token) || token.length < 3) {
            continue;
        }

        const matches = getCloseMatches(token, allColumns.map(c => c.toLowerCase()), 0.7);
        
        if (matches.length > 0) {
            const originalColumnName = allColumns.find(c => c.toLowerCase() === matches[0]);
            if (originalColumnName && !Object.values(corrections).includes(originalColumnName)) {
                corrections[token] = originalColumnName;
            }
        }
    }
    return corrections;
}
