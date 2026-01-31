import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import Voicemails from "@/components/Voicemails";
import { Spinner } from "react-bootstrap";
import { validateRange } from "./helpers";

type Range = { start: string; end: string };

async function getVoicemails(range: Range) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login");

    const { data, error } = await supabase
        .from("voicemails")
        .select("id, phone_number, patient, reason, assignee, suggestion, urgency, timestamp, label")
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
    // Check if params are valid if they exist
    const searchParams = await params;
    const { range, error } = validateRange(searchParams?.start, searchParams?.end);

    const start = range.start;
    const end = range.end;

    const result = error ? { data: [], error } : await getVoicemails({ start, end });

    return <Voicemails voicemails={result.data} error={result.error} range={{ start, end }} />;
}
