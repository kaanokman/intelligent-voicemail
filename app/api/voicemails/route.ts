import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { VoicemailType, VoicemailFormData } from "@/types/components";
import { createClient as createDeepgramClient } from "@deepgram/sdk";

type Range = { start: string; end: string };

export async function GET(range: Range) {
    try {
        // Check for authenticated user
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error("No authenticated user");
            return NextResponse.json({ error: 'No authenticated user' }, { status: 401 });
        }
        // Make request to supabase
        const { data, error } = await supabase
            .from("voicemails")
            .select("id, phone_number, patient, transcript_url, audio_url, reason, description, urgency, timestamp, label")
            .eq("user_id", user.id)
            .gte("timestamp", range.start)
            .lte("timestamp", range.end)
            .order("timestamp", { ascending: true });
        if (error) {
            console.error("Error getting voicemails: ", error.message);
            return NextResponse.json({ data: [], error: "Error getting voicemails" }, { status: 400 });
        }
        return NextResponse.json({ result: data }, { status: 201 });
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

// export async function POST(req: Request) {
//     try {
//         // Check for authenticated user
//         const supabase = await createClient();
//         const { data: { user } } = await supabase.auth.getUser();
//         if (!user) {
//             console.error("No authenticated user");
//             return NextResponse.json({ error: 'No authenticated user' }, { status: 401 });
//         }
//         const body = await req.json();
//         const voicemail = body as VoicemailType;
//         // Make request to supabase
//         const { error } = await supabase.from("voicemails").insert({
//             ...voicemail,
//             user_id: user.id
//         });
//         if (error) {
//             console.error("Error creating voicemail: ", error.message);
//             return NextResponse.json({ error: "Error creating voicemail" }, { status: 400 });
//         }
//         return NextResponse.json({ message: "Voicemail created" }, { status: 201 });
//     } catch (error: unknown) {
//         if (error instanceof Error) {
//             console.error("Error creating voicemail: ", error.message);
//             return NextResponse.json({ error: "Error creating voicemail" }, { status: 500 });
//         } else {
//             console.error("Unknown error creating voicemail", error);
//             return NextResponse.json({ error: "Unknown error creating voicemail" }, { status: 500 });
//         }
//     }
// }

export async function POST(req: Request) {
    try {
        // Check for authenticated user
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error("No authenticated user");
            return NextResponse.json({ error: 'No authenticated user' }, { status: 401 });
        }
        const body = await req.json();
        const { phone_number, audio } = body as VoicemailFormData;

        console.log(audio)

        const arrayBuffer = await audio[0].arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const deepgramClient = createDeepgramClient();
        const { result, error } = await deepgramClient.listen.prerecorded.transcribeFile(
            buffer,
            {
                mimetype: "audio/mpeg",
                model: "nova-3",
                punctuate: true,
                utterances: true
            },
        );



        // const transcription = await deepgram.transcription.preRecorded({
        //     buffer: audioBuffer,
        //     mimetype: "audio/mp3"
        // }, {
        //     model: "nova-2",
        //     punctuate: true,
        //     utterances: true
        // });

        // // Create voicemail object with transcription and URL
        // const voicemail = {
        //     phone_number,
        //     transcript_url: transcription.results.url,
        //     audio_url: `${process.env.NEXT_PUBLIC_SUPABASE_BUCKET_URL}/voicemails/${audioData.path}`,
        //     user_id: user.id
        // };
        console.log(result?.results?.channels?.[0]?.alternatives?.[0]?.transcript);

        // // Upload audio to Supabase storage
        // const audioBuffer = await audio[0].arrayBuffer();
        // const { data: audioData, error: audioError } = await supabase.storage
        //     .from("voicemails")
        //     .upload(`audio_${Date.now()}.mp3`, audioBuffer, { cacheControl: "no-cache" });
        // if (audioError) {
        //     console.error("Error uploading audio: ", audioError.message);
        //     return NextResponse.json({ error: "Error uploading audio" }, { status: 400 });
        // }

        return NextResponse.json({ error: "Error creating voicemail" }, { status: 400 });






        // // Make request to supabase
        // const { error } = await supabase.from("voicemails").insert({
        //     ...voicemail,
        //     user_id: user.id
        // });
        // if (error) {
        //     console.error("Error creating voicemail: ", error.message);
        //     return NextResponse.json({ error: "Error creating voicemail" }, { status: 400 });
        // }
        // return NextResponse.json({ message: "Voicemail created" }, { status: 201 });
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("Error creating voicemail: ", error.message);
            return NextResponse.json({ error: "Error creating voicemail" }, { status: 500 });
        } else {
            console.error("Unknown error creating voicemail", error);
            return NextResponse.json({ error: "Unknown error creating voicemail" }, { status: 500 });
        }
    }
}

export async function PUT(req: Request) {
    try {
        // Check for authenticated user
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const body = await req.json();
        if (!user) {
            console.error("No authenticated user");
            return NextResponse.json({ error: 'No authenticated user' }, { status: 401 });
        }
        const { id, ...updateData } = body;
        if (!id) {
            console.error("Missing voicemail ID");
            return NextResponse.json({ error: 'Missing voicemail ID' }, { status: 400 });
        }
        // Ensure the user can only update their own item
        const { data, error } = await supabase
            .from("voicemails")
            .update(updateData)
            .eq("user_id", user.id)
            .eq("id", id);
        if (error) {
            console.error("Error updating voicemail", error.message);
            return NextResponse.json({ error: "Error updating voicemail" }, { status: 400 });
        }
        return NextResponse.json({ message: "Vociemail updated", data }, { status: 200 });
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("Error updating voicemail: ", error.message);
            return NextResponse.json({ error: "Error updating voicemail" }, { status: 500 });
        } else {
            console.error("Unknown error updating voicemail", error);
            return NextResponse.json({ error: "Unknown error updating voicemail" }, { status: 500 });
        }
    }
}

export async function DELETE(req: Request) {
    try {
        // Check for authenticated user
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const body = await req.json();
        if (!user) {
            console.error("No authenticated user");
            return NextResponse.json({ error: 'No authenticated user' }, { status: 401 });
        }
        const { id } = body;
        if (!id) {
            console.error("Missing voicemail ID");
            return NextResponse.json({ error: 'Missing voicemail ID' }, { status: 400 });
        }
        // Ensure the user can only delete their own item
        const { data, error } = await supabase
            .from("voicemails")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);
        if (error) {
            console.error("Error deleting voicemail", error.message);
            return NextResponse.json({ error: "Error deleting voicemail" }, { status: 400 });
        }
        return NextResponse.json({ message: "Voicemail deleted", data }, { status: 200 });
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("Error deleting voicemail: ", error.message);
            return NextResponse.json({ error: "Error deleting voicemail" }, { status: 500 });
        } else {
            console.error("Unknown error deleting voicemail", error);
            return NextResponse.json({ error: "Unknown error deleting voicemail" }, { status: 500 });
        }
    }
}