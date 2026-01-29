import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
    try {
        // Check for authenticated user
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error("No authenticated user");
            return NextResponse.json({ error: 'No authenticated user' }, { status: 401 });
        }
        // Extract voicemail ID from request
        const { searchParams } = new URL(req.url);
        const voicemailId = Number(searchParams.get("voicemailId"));
        if (!voicemailId || !(Number.isInteger(voicemailId) && voicemailId > 0)) {
            return NextResponse.json({ error: "Invalid voicemail id" }, { status: 400 });
        }
        // Check if user has access to voicemail
        const { data, error } = await supabase
            .from("voicemails")
            .select("id")
            .eq("user_id", user.id)
            .eq("id", voicemailId)
            .maybeSingle();
        if (error) {
            console.error("Error getting voicemails: ", error.message);
            return NextResponse.json({ error: "Error getting voicemails" }, { status: 400 });
        } else if (!data) {
            console.error("Voicemail not found or user doesn't have access");
            return NextResponse.json({ error: "Voicemail not found or user doesn't have access" }, { status: 404 });
        }
        let transcript, audio;
        // Get transcript from storage
        const { data: blob, error: blobError } = await supabase.storage
            .from("voicemails")
            .download(`${voicemailId}/transcript.txt`);
        if (blobError) {
            console.warn("Error getting transcript: ", blobError.message);
        } else if (!blob) {
            console.warn("Transcript not found");
        } else {
            transcript = await blob.text();
        }
        // Get signed audio URL from storage
        const { data: audioData, error: audioError } = await supabase.storage
            .from("voicemails")
            .createSignedUrl(`${voicemailId}/audio.mp3`, 60 * 5);
        if (audioError) {
            console.warn("Error getting audio: ", audioError.message);
        } else if (!audioData) {
            console.warn("Audio not found");
        } else {
            audio = audioData.signedUrl;
        }
        return NextResponse.json({ result: { transcript, audio } }, { status: 200 });
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("Error getting voicemails: ", error.message);
            return NextResponse.json({ error: "Error getting voicemails" }, { status: 500 });
        } else {
            console.error("Unknown error getting voicemails", error);
            return NextResponse.json({ error: "Unknown error getting voicemails" }, { status: 500 });
        }
    }
}