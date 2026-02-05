"use client";

import { useState, useEffect, Dispatch, SetStateAction, useMemo } from "react";
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

export default function EditModal({ voicemail, show, setShow }: {
    voicemail?: VoicemailType;
    show: boolean;
    setShow: Dispatch<SetStateAction<boolean>>;
}) {
    const router = useRouter();
    const { register, handleSubmit, reset, control, formState: { errors } } =
        useForm<VoicemailType>({
            defaultValues: {
                ...voicemail,
                timestamp: voicemail ? dayjs(voicemail.timestamp).format('YYYY-MM-DDTHH:mm') : undefined
            },
            shouldFocusError: false
        });
    const [loading, setLoading] = useState(false);

    const urgencyOptions = useMemo(() => [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
    ], []);

    const statusOptions = useMemo(() => [
        { value: "new", label: "New" },
        { value: "processed", label: "Processed" },
        { value: "assigned", label: "Assigned" },
        { value: "junk", label: "Junk" },
    ], []);

    const nextStepsOptions = useMemo(() => [
        { value: "Call patient back", label: "Call patient back" },
        { value: "Schedule appointment", label: "Schedule appointment" },
        { value: "Send follow-up email", label: "Send follow-up email" },
        { value: "Forward to doctor", label: "Forward to doctor" },
    ], []);

    const handleClose = () => {
        setShow(false);
        reset();
        setLoading(false);
    };

    useEffect(() => {
        if (show) reset({
            ...voicemail,
            timestamp: voicemail ? dayjs(voicemail.timestamp).format('YYYY-MM-DDTHH:mm') : undefined
        });
    }, [show, voicemail, reset]);

    async function handleRequest(formData: VoicemailType) {
        setLoading(true);
        try {
            const result = await fetch("/api/voicemails", {
                method: voicemail ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    timestamp: new Date(formData.timestamp).toISOString(),
                    ...(voicemail ? { id: voicemail.id } : {}),
                })
            });
            const { message, error } = await result.json();
            if (message) {
                handleClose();
                router.refresh();
                toast.success(`${voicemail ? 'Updated' : 'Created'} voicemail`, toastSettings);
            } else if (error) {
                toast.error(`Error ${voicemail ? 'updating' : 'creating'} voicemail`, toastSettings);
            }
        } catch (error) {
            let errorMsg;
            if (error instanceof Error) errorMsg = error.message;
            toast.error(errorMsg || `Error ${voicemail ? 'updating' : 'creating'} voicemail`, toastSettings);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Form onSubmit={handleSubmit(handleRequest)}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {`${voicemail ? 'Edit' : 'Add'} Voicemail`}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="d-flex flex-column gap-3 p-4 pt-3">
                    <Form.Group>
                        <Form.Label className='mb-0'>Phone Number</Form.Label>
                        <Form.Control
                            disabled={loading}
                            {...register("phone_number", { required: 'Phone Number is required' })}
                            isInvalid={!!errors.phone_number}
                        />
                        <Form.Control.Feedback type="invalid" className='position-absolute text-xs mt-0'>
                            {errors.phone_number?.message && String(errors.phone_number.message)}
                        </Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group>
                        <Form.Label className='mb-0'>Patient</Form.Label>
                        <Form.Control
                            disabled={loading}
                            {...register("patient")}
                        />
                    </Form.Group>
                    <Form.Group>
                        <Form.Label className='mb-0'>Summary</Form.Label>
                        <Form.Control
                            as='textarea'
                            rows={2}
                            disabled={loading}
                            {...register("reason")}
                        />
                    </Form.Group>
                    <div className='d-flex gap-3'>
                        <Form.Group className='col'>
                            <Form.Label className='mb-0'>Status</Form.Label>
                            <Controller
                                name="status"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        isDisabled={loading}
                                        options={statusOptions}
                                        value={statusOptions.find(o => o.value === field.value) ?? null}
                                        onChange={(opt) => field.onChange(opt?.value ?? null)}
                                        placeholder="Select Status"
                                    />
                                )}
                            />
                        </Form.Group>
                        <Form.Group className='col'>
                            <Form.Label className='mb-0'>Urgency</Form.Label>
                            <Controller
                                name="urgency"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        isDisabled={loading}
                                        options={urgencyOptions}
                                        value={urgencyOptions.find(o => o.value === field.value) ?? null}
                                        onChange={(opt) => field.onChange(opt?.value ?? null)}
                                        placeholder="Select Urgency"
                                        isClearable
                                    />
                                )}
                            />
                        </Form.Group>
                    </div>
                    <Form.Group className='col'>
                        <Form.Label className='mb-0'>Next Steps</Form.Label>
                        <Controller
                            name="suggestion"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    isDisabled={loading}
                                    instanceId="suggestion"
                                    inputId="suggestion"
                                    styles={{ menu: (base) => ({ ...base, zIndex: 5 }) }}
                                    options={nextStepsOptions}
                                    value={nextStepsOptions.find(o => o.value === field.value) ?? null}
                                    onChange={(opt) => field.onChange(opt?.value ?? null)}
                                    placeholder="Select Next Steps"
                                    isClearable
                                />
                            )}
                        />
                    </Form.Group>
                    <Form.Group>
                        <Form.Label className='mb-0'>Date & Time</Form.Label>
                        <Form.Control
                            disabled={loading}
                            type="datetime-local"
                            {...register("timestamp", { required: 'Timestamp is required' })}
                            isInvalid={!!errors.timestamp}
                        />
                        <Form.Control.Feedback type="invalid" className='position-absolute text-xs mt-0'>
                            {errors.timestamp?.message && String(errors.timestamp.message)}
                        </Form.Control.Feedback>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose} disabled={loading} style={{ width: 80 }}>
                        Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading} style={{ width: 80 }} className='flex justify-center'>
                        {loading ? <Spinner size='sm' /> : 'Submit'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}
