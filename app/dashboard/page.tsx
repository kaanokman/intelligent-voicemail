import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import Voicemails from "@/components/Voicemails";
import { Spinner } from "react-bootstrap";
import { DateTime } from "luxon";

type Range = { start: string; end: string };
type RangeISO = { start: string; end: string };

function defaultRangeISO(): RangeISO {
    return {
        start: DateTime.now().minus({ days: 7 }).startOf("day").toISO()!,
        end: DateTime.now().endOf("day").toISO()!,
    };
}

function validateRangeISO(start?: string, end?: string): { range: RangeISO; error?: string } {
    const fallback = defaultRangeISO();
    // If both params are missing
    if (!start && !end) {
        return { range: { start: fallback.start, end: fallback.end } };
        // If one of the two params are missing
    } else if (!start || !end) {
        return { range: { start: fallback.start, end: fallback.end }, error: "Missing parameters" };
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

async function getVoicemails(range: Range) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login");

    const { data, error } = await supabase
        .from("voicemails")
        .select("id, phone_number, patient, transcript_url, audio_url, reason, description, urgency, timestamp, label")
        .eq("user_id", user.id)
        .gte("timestamp", range.start)
        .lte("timestamp", range.end)
        .order("timestamp", { ascending: true });
    if (error) {
        console.error("Error loading voicemails: ", error.message);
        return { data: [], error: 'Error loading voicemails' };
    }
    return { data: data ?? [] };
}

export default async function Dashboard({ searchParams }: { searchParams?: Promise<{ start?: string; end?: string }> }) {
    return (
        <Suspense fallback={
            <div className='w-100 h-100 flex items-center justify-center'>
                <Spinner />
            </div>
        }>
            <VoicemailsPage params={searchParams} />
        </Suspense>
    );
}

async function VoicemailsPage({ params }: { params?: Promise<{ start?: string; end?: string }> }) {
    const searchParams = await params;

    // Check if params are valid if they exist
    const validation = validateRangeISO(searchParams?.start, searchParams?.end);

    let start, end, result;

    if (validation.error) {
        start = validation.range.start;
        end = validation.range.end;
        result = { data: [], error: validation.error };
    } else {
        // Get start and end time from URL
        start = searchParams?.start ?? DateTime.now().minus({ days: 7 }).startOf("day").toISO();
        end = searchParams?.end ?? DateTime.now().endOf("day").toISO();
        // Get voicemails from DB in time range
        result = await getVoicemails({ start, end });
    }

    return <Voicemails voicemails={result.data} error={result.error} range={{ start, end }} />;
}
