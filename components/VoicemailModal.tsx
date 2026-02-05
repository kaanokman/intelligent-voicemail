"use client";

import { useState, useEffect, Dispatch, SetStateAction, useRef } from "react";
import { Button, Modal, Form, Spinner, ToggleButtonGroup, ToggleButton } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { VoicemailFormData } from "@/types/components";
import { AudioRecorder, type RecordedAudio } from "./AudioRecorder";

const toastSettings = {
  autoClose: 5000,
  closeOnClick: true,
  pauseOnHover: true,
};

export default function VoicemailModal({ show, setShow }: {
  show: boolean;
  setShow: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const { register, handleSubmit, reset, setValue, formState: { errors } } =
    useForm<VoicemailFormData>({ shouldFocusError: false });
  const [loading, setLoading] = useState({ status: false } as { status: boolean, message?: string });
  const [audioSource, setAudioSource] = useState<"upload" | "record">("record");
  const [audio, setAudio] = useState<RecordedAudio | null>(null);

  const handleClose = () => {
    setShow(false);
    reset();
    setLoading({ status: false });
    setAudio(null);
    setAudioSource("record");
  };

  useEffect(() => {
    if (show) reset();
  }, [show, reset]);

  async function handleRequest(formData: VoicemailFormData) {
    const form = new FormData();

    form.append("phone_number", formData.phone_number);

    if (audioSource === "upload") {
      const file = formData.audio?.[0];
      if (!file) {
        toast.error("Please record or upload an audio file", toastSettings);
        return;
      }
      form.append("audio", file);
    } else {
      if (!audio) {
        toast.error("Please record or upload an audio file", toastSettings);
        return;
      }
      form.append("audio", new File([audio.blob], "recording.webm", { type: audio.mimeType }));
    }

    setLoading({ status: true, message: "Creating voicemail..." });
    try {
      const result = await fetch("/api/voicemails", {
        method: "POST",
        body: form,
      });
      const { message, error } = await result.json();
      if (message) {
        handleClose();
        router.refresh();
        toast.success('Created voicemail', toastSettings);
      } else if (error) {
        toast.error(error, toastSettings);
      }
    } catch (error) {
      let errorMsg;
      if (error instanceof Error) errorMsg = error.message;
      toast.error(errorMsg || 'Error creating voicemail', toastSettings);
    } finally {
      setLoading({ status: false });
    }
  }

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Form onSubmit={handleSubmit(handleRequest)}>
        <Modal.Header closeButton>
          <Modal.Title>
            Add Voicemail
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-flex flex-column gap-3 p-4">
          {loading.status ?
            <div className="flex items-center justify-center flex-col gap-2" style={{ height: audioSource === 'upload' ? 194 : 240 }}>
              <Spinner animation="border" />
              {loading.message}
            </div> : <>
              <Form.Group>
                <Form.Label className='mb-0'>Phone Number</Form.Label>
                <Form.Control
                  disabled={loading.status}
                  {...register("phone_number", { required: 'Phone Number is required' })}
                  isInvalid={!!errors.phone_number}
                />
                <Form.Control.Feedback type="invalid" className='position-absolute text-xs mt-0'>
                  {errors.phone_number?.message && String(errors.phone_number.message)}
                </Form.Control.Feedback>
              </Form.Group>
              <ToggleButtonGroup type="radio" name="audioSource" defaultValue='record'
                onChange={(value: "upload" | "record") => setAudioSource(value)}>
                <ToggleButton id="record" value='record' disabled={loading.status}
                  variant="outline-oak"
                  onClick={() => {
                    setAudioSource("record");
                    setValue("audio", undefined as any);
                  }}>
                  Record
                </ToggleButton>
                <ToggleButton id="upload" value='upload' disabled={loading.status}
                  variant="outline-oak"
                  onClick={() => {
                    setAudioSource("upload");
                    setAudio(null);
                  }}>
                  Upload
                </ToggleButton>
              </ToggleButtonGroup>
              {audioSource === "record" ?
                <Form.Group>
                  <Form.Label className='mb-0'>Record Audio</Form.Label>
                  <AudioRecorder
                    value={audio}
                    onChange={(next) => setAudio(next)}
                    disabled={loading.status}
                  />
                </Form.Group> :
                <Form.Group>
                  <Form.Label className='mb-0'>Upload Audio</Form.Label>
                  <Form.Control
                    type="file"
                    accept="audio/*"
                    disabled={loading.status}
                    {...register("audio", { required: 'Audio upload or recording is required' })}
                    isInvalid={!!errors.audio}
                  />
                  <Form.Control.Feedback type="invalid" className='position-absolute text-xs mt-0'>
                    {errors.audio?.message && String(errors.audio.message)}
                  </Form.Control.Feedback>
                </Form.Group>
              }
            </>
          }
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading.status} style={{ width: 80 }}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading.status} style={{ width: 80, height: 38 }}
            className='flex items-center justify-center'>
            {loading.status ? <Spinner size='sm' /> : 'Submit'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
