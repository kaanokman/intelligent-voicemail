import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { createClient as createDeepgramClient } from "@deepgram/sdk";

const voicemailSchema = z.object({
    patient: z.string().nullable().describe("The name of the patient"),
    reason: z.string().nullable().describe("The reason for the voicemail"),
    description: z.string().nullable().describe("A description of the voicemail content"),
    urgency: z.enum(["low", "medium", "high"]).nullable().describe("The urgency level of the voicemail"),
});

export async function POST(req: Request) {
    try {
        // Check for authenticated user
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error("No authenticated user");
            return NextResponse.json({ error: 'No authenticated user' }, { status: 401 });
        }

        // Extract audio from form
        const form = await req.formData();
        const audio = form.get("audio");
        const phone_number = form.get("phone_number") as string;

        if (!(audio instanceof File) || audio.size === 0 || !phone_number) {
            return new Response("Missing audio or phone number", { status: 400 });
        }
        const audioBuffer = Buffer.from(await audio.arrayBuffer());
        const mimetype = audio.type;

        // Make request to Deepgram to transcribe audio
        const deepgramClient = createDeepgramClient();
        const { result, error } = await deepgramClient.listen.prerecorded.transcribeFile(
            audioBuffer,
            {
                mimetype,
                model: "nova-2-voicemail",
                smart_format: true
            },
        );

        // Extract transcript from Deepgram response
        const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
        if (error || !transcript) {
            console.error("Error transcribing audio: ", error);
            return NextResponse.json({ error: "Error transcribing audio" }, { status: 500 });
        }
        const transcriptBuffer = Buffer.from(transcript, "utf-8");

        // Log transcript
        console.log("Transcript: ", transcript);

        // Make request to Gemini to extract structured information from voicemail transcript
        const ai = new GoogleGenAI({});
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `
                Given the following voicemail transcript sent to a healthcare provider, produce a JSON object containing
                all of the relevant information.

                ${transcript}
                `,
            config: {
                responseMimeType: "application/json",
                responseJsonSchema: zodToJsonSchema(voicemailSchema),
            },
        });

        // Check response from Gemini and validate against schema
        const validVoicemail = response?.text ? voicemailSchema.parse(JSON.parse(response.text)) : null;
        if (!validVoicemail) {
            console.error('Incorrect voicemail schema supplied by Gemini: ', response.text);
            return NextResponse.json({ error: "Incorrect voicemail schema supplied by Gemini" }, { status: 500 });
        }

        // Add remaining values to voicemail
        const voicemail = {
            ...validVoicemail,
            timestamp: new Date().toISOString(),
            phone_number,
            user_id: user.id,
            label: 'new',
        }

        // Log final voicemail object
        console.log("Final Voicemail Object: ", voicemail);

        // Make request to supabase
        const { data, error: supabaseError } = await supabase.from("voicemails")
            .insert(voicemail)
            .select("id")
            .single();
        if (supabaseError) {
            console.error("Error creating voicemail: ", supabaseError.message);
            return NextResponse.json({ error: "Error creating voicemail" }, { status: 400 });
        }

        // Get voicemails bucket and extract voicemailId
        const bucket = supabase.storage.from("voicemails");
        const voicemailId = data.id;

        // Send audio and transcript to supabase storage
        await Promise.all([
            bucket.upload(`${voicemailId}/transcript.txt`, transcriptBuffer, {
                contentType: "text/plain",
                upsert: true,
            }).then(({ error }) => {
                if (error) {
                    console.warn("Error uploading transcript: ", error.message);
                }
            }),
            bucket.upload(`${voicemailId}/audio.mp3`, audioBuffer, {
                contentType: mimetype,
                upsert: true,
            }).then(({ error }) => {
                if (error) {
                    console.warn("Error uploading audio: ", error.message);
                }
            }),
        ]);

        return NextResponse.json({ message: "Voicemail created" }, { status: 201 });
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
        const { error } = await supabase
            .from("voicemails")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);
        if (error) {
            console.error("Error deleting voicemail", error.message);
            return NextResponse.json({ error: "Error deleting voicemail" }, { status: 400 });
        }

        // Get voicemails bucket and extract voicemailId
        const bucket = supabase.storage.from("voicemails");

        // Delete audio and transcript from supabase storage
        await Promise.all([
            bucket.remove([`${id}/transcript.txt`]).then(({ error }) => {
                if (error) {
                    console.warn("Error deleting transcript: ", error.message);
                }
            }),
            bucket.remove([`${id}/audio.mp3`]).then(({ error }) => {
                if (error) {
                    console.warn("Error deleting audio: ", error.message);
                }
            }),
        ]);

        return NextResponse.json({ message: "Voicemail deleted" }, { status: 200 });
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