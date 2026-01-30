import { DateTime } from "luxon";

type Range = { start: string; end: string };

function defaultRangeISO(): Range {
    return {
        start: DateTime.now().minus({ days: 7 }).startOf("day").toISO()!,
        end: DateTime.now().endOf("day").toISO()!,
    };
}

export function validateRange(start?: string | null, end?: string | null): { range: Range; error?: string } {
    const fallback = defaultRangeISO();
    // If both params are missing
    if (!start && !end) {
        return { range: fallback };
        // If one of the two params are missing
    } else if (!start || !end) {
        return { range: fallback, error: "Missing parameters" };
    }
    // If both parameters were passed
    const s = DateTime.fromISO(start);
    const e = DateTime.fromISO(end);
    if (!s.isValid || !e.isValid) {
        return { range: fallback, error: "Invalid date range format" };
    }
    if (s > e) {
        return { range: fallback, error: "Invalid date range (start is after end)" };
    }
    return { range: { start: s.toISO(), end: e.toISO() } };
}