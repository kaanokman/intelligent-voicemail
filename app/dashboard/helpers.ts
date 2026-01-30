import { DateTime } from "luxon";

type Range = { start: string; end: string };

export function validateRange(start?: string | null, end?: string | null): { range: Range; error?: string } {
    const fallback = {
        start: DateTime.now().minus({ days: 7 }).startOf("day").toISO(),
        end: DateTime.now().endOf("day").toISO(),
    };
    if (!start && !end) {
        return { range: fallback };
        // If one of the two params are missing
    } else if (!start || !end) {
        return { range: fallback, error: "Missing parameters" };
    }
    // If both parameters were passed
    const s = DateTime.fromISO(start, { zone: "local" }).startOf("day");
    const e = DateTime.fromISO(end, { zone: "local" }).endOf("day");
    if (!s.isValid || !e.isValid) {
        return { range: fallback, error: "Invalid date format" };
    }
    if (s > e) {
        return { range: fallback, error: "Start date is after end date" };
    }
    return { range: { start: s.toISO(), end: e.toISO() } };
}