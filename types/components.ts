export interface VoicemailType {
    id?: number;
    phone_number: string;
    patient: string | null;
    transcript_url: string | null;
    audio_url: string | null;
    reason: string | null;
    description: string | null;
    urgency: string | null;
    timestamp: string; // timestamptz → ISO string
    label: string;
}

export type VoicemailFormData = {
    phone_number: string;
    audio: FileList;
};