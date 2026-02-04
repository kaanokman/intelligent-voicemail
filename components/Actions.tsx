"use client"

import { Button } from "react-bootstrap";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { FaEdit, FaRegTrashAlt } from "react-icons/fa";
import { useState } from "react";
import EditModal from "./EditModal";
import TranscriptModal from "./TranscriptModal";
import ConfirmationModal from "./confirmation-modal";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { VoicemailType } from "@/types/components";
import { CgFileDocument } from "react-icons/cg";

const toastSettings = {
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
};

export default function Actions({ voicemail }: { voicemail: VoicemailType }) {
    const router = useRouter();
    const [showEdit, setShowEdit] = useState(false);
    const [showTranscript, setShowTranscript] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleDelete(id: number) {
        setLoading(true);
        try {
            const response = await fetch("/api/voicemails", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id })
            });
            const { message, error } = await response.json();
            if (message) {
                router.refresh();
                setShowConfirmation(false);
                toast.success(`Deleted voicemail data`, toastSettings);
            } else if (error) {
                console.error(error);
                toast.error(`Error deleting voicemail data`, toastSettings);
            }
        } catch (error) {
            let errorMsg;
            if (error instanceof Error) {
                console.log('Error deleting voicemail: ' + error.message);
                errorMsg = error.message;
            } else {
                console.error('Error deleting voicemail');
            }
            toast.error(errorMsg || `Error deleting voicemail`, toastSettings);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className='d-flex gap-1'>
                <OverlayTrigger trigger={['hover', 'hover']} overlay={<Tooltip>
                    View Transcript
                </Tooltip>}>
                    <Button variant='outline-bark' onClick={() => setShowTranscript(true)}
                        style={{ height: 36, width: 36 }}
                        className='p-0 d-flex justify-content-center align-items-center'>
                        <CgFileDocument size={20} style={{ marginLeft: '2px' }} />
                    </Button>
                </OverlayTrigger>
                <OverlayTrigger trigger={['hover', 'hover']} overlay={<Tooltip>
                    Edit
                </Tooltip>}>
                    <Button variant='outline-primary' onClick={() => setShowEdit(true)}
                        style={{ height: 36, width: 36 }}
                        className='p-0 d-flex justify-content-center align-items-center'>
                        <FaEdit size={18} style={{ marginLeft: '2px' }} />
                    </Button>
                </OverlayTrigger>
                <OverlayTrigger trigger={['hover', 'hover']} overlay={<Tooltip>
                    Delete
                </Tooltip>}>
                    <Button variant='outline-danger' onClick={() => setShowConfirmation(true)}
                        style={{ height: 36, width: 36 }}
                        className='p-0 d-flex justify-content-center align-items-center'>
                        <FaRegTrashAlt size={18} />
                    </Button>
                </OverlayTrigger>
            </div>
            <ConfirmationModal
                show={showConfirmation}
                setShow={setShowConfirmation}
                message="Are you sure you want to delete this voicemail?"
                onConfirm={() => handleDelete(voicemail.id!)}
                loading={loading}
            />
            <EditModal show={showEdit} setShow={setShowEdit} voicemail={voicemail} />
            <TranscriptModal show={showTranscript} setShow={setShowTranscript} voicemailId={voicemail.id} />
        </>
    );
}