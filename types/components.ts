export interface VoicemailType {
    id: number; // bigint → number in JS
    phone_number: string;
    patient: string | null;
    transcript_url: string | null;
    audio_url: string;
    reason: string | null;
    description: string | null;
    urgency: string | null;
    timestamp: string; // timestamptz → ISO string
}
