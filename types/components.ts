export interface VoicemailType {
    id?: number;
    phone_number: string;
    patient: string | null;
    reason: string | null;
    suggestion: string | null;
    urgency: string | null;
    timestamp: string; // timestamptz → ISO string
    status: string;
}

export type VoicemailFormData = {
    phone_number: string;
    audio: FileList;
};