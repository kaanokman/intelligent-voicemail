import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import Voicemails from "@/components/Voicemails";
import { Row, Col, Spinner } from "react-bootstrap";
import AddItem from "@/components/add-item";

async function getVoicemails() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login");
    const { data, error } = await supabase
        .from("voicemails")
        .select("id, phone_number, patient, transcript_url, audio_url, reason, description, urgency, timestamp")
        .eq("user_id", user.id)
        .order("timestamp", { ascending: true });
    if (error) {
        console.error("Error loading voicemails:", error.message);
        return [];
    }
    return data ?? [];
}

async function VoicemailsPage() {
    const voicemails = await getVoicemails();
    return <Voicemails voicemails={voicemails} />;
}

export default function Dashboard() {
    return (
        <div className="flex flex-col gap-3 w-full">
            <Row>
                <Col xs sm="auto" className="text-3xl font-semibold">Voicemails</Col>
                <Col xs="auto"><AddItem /></Col>
            </Row>
            <Row>
                <Col>
                    <Suspense fallback={<Spinner />}>
                        <VoicemailsPage />
                    </Suspense>
                </Col>
            </Row>
        </div>
    );
}
