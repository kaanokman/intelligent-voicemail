"use client";

import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { Button, Modal, Form, Spinner } from "react-bootstrap";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { VoicemailType } from "@/types/components";
import Select from 'react-select'

dayjs.extend(customParseFormat);

const toastSettings = {
    autoClose: 5000,
    closeOnClick: true,
    pauseOnHover: true,
};

export default function VoicemailModal({ voicemailId, show, setShow }: {
    voicemailId: VoicemailType['id'];
    show: boolean;
    setShow: Dispatch<SetStateAction<boolean>>;
}) {
    const [loading, setLoading] = useState(true);
    const [transcript, setTranscript] = useState(null as string | null);
    const [audioUrl, setAudioUrl] = useState(null as string | null);

    const handleClose = () => {
        setShow(false);
    };

    useEffect(() => {
        if (show) {
            fetchTranscript();
        }
    }, [show]);

    async function fetchTranscript() {
        setLoading(true);
        try {
            const response = await fetch(`/api/transcript?voicemailId=${voicemailId}`);
            const { result, error } = await response.json();
            if (error) {
                toast.error('Error getting transcript', toastSettings);
            } else if (result) {
                setTranscript(result.transcript ?? null);
                setAudioUrl(result.audio ?? null);
            }
        } catch (error) {
            let errorMsg;
            if (error instanceof Error) errorMsg = error.message;
            toast.error(errorMsg || 'Error getting transcript', toastSettings);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    Transcript
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="d-flex flex-column gap-3 p-4 pt-3">
                {loading ? (
                    <div className="d-flex justify-content-center align-items-center" style={{ height: 200 }}>
                        <Spinner animation="border" />
                    </div>
                ) : (
                    <div className='flex flex-col gap-3'>
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {transcript ? (
                                <p style={{ whiteSpace: 'pre-wrap' }}>{transcript}</p>
                            ) : (
                                <p>No transcript available.</p>
                            )}
                        </div>
                        {audioUrl &&
                            <div className="w-100">
                                <audio controls src={audioUrl} className='w-100 rounded-0'>
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                        }
                    </div>
                )
                }
            </Modal.Body >
        </Modal >
    );
}
