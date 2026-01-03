"use client";

import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { Button, Modal, Form } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Spinner } from "react-bootstrap";
import { Row, Col } from 'react-bootstrap';
import { FaArrowRight, FaArrowLeft } from "react-icons/fa";
import { CiCamera } from "react-icons/ci";
import { AiOutlineRedo } from "react-icons/ai";
import { CiImageOn } from "react-icons/ci";

type LeadsModalProps = {
  item?: {
    id: number;
    organization?: string;
    firstName?: string;
    lastName?: string;
    title?: string;
    employees?: string;
    rank?: number;
  },
  show: boolean;
  setShow: Dispatch<SetStateAction<boolean>>;
};

type FormDataType = {
  organization?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  employees?: string;
  rank?: number;
};

const toastSettings = {
  autoClose: 5000,
  closeOnClick: true,
  pauseOnHover: true,
};

export default function LeadsModal(props: LeadsModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } =
    useForm({ defaultValues: props.item, shouldFocusError: false });
  const router = useRouter();
  const [manual, setManual] = useState(props.item ? true : false);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingMessage, setAnalyzingMessage] = useState('Extracting info from label...');
  const [imageURL, setImageURL] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  const handleClose = () => {
    props.setShow(false);
    setManual(false);
    reset();
    setImageURL(null);
    setImageFile(null);
    setLoading(false);
    setAnalyzing(false);
    setAnalyzingMessage('Extracting info from label...');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageURL(url);
      setImageFile(file);
    } else {
      setImageURL(null);
      setImageFile(null);
    }
  };

  useEffect(() => {
    if (props.show) {
      reset(props.item);
      setManual(props.item ? true : false);
    }
  }, [props.show, reset, props.item])

  const fileToBase64 = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file); // e.g. data:image/png;base64,....
    });
  };

  async function handleRequest(formData: FormDataType) {
    setLoading(true);
    try {
      const result = await fetch("/api/leads", {
        method: props.item ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          ...(props.item ? { id: props.item.id } : {}),
        })
      });
      const { message, error } = await result.json();
      if (message) {
        handleClose();
        router.refresh();
        toast.success(`${props.item ? 'Updated' : 'Created'} lead`, toastSettings);
      } else if (error) {
        toast.error(`Error ${props.item ? 'updating' : 'creating'} lead`, toastSettings);
      }
    } catch (error) {
      let errorMsg;
      if (error instanceof Error) errorMsg = error.message;
      toast.error(errorMsg || 'Error creating/updating lead', toastSettings);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal show={props.show} onHide={handleClose} centered>
      <Form onSubmit={handleSubmit(handleRequest)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {`${props.item ? 'Edit' : 'Add'} lead`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-flex flex-column gap-3 p-4 pt-3">
          {/* < Form.Group >
                <Form.Label className='mb-1'>Appliance Type</Form.Label>
                <Form.Select {...register("type", { required: manual ? 'Please select an applaince type' : false })} disabled={loading}
                  isInvalid={!!errors.type}     >
                  <option value="">Select type...</option>
                  <option value="refrigerator">Refrigerator</option>
                  <option value="oven">Oven</option>
                  <option value="dishwasher">Dishwasher</option>
                  <option value="washer">Washer</option>
                  <option value="dryer">Dryer</option>
                  <option value="microwave">Microwave</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid" className='position-absolute text-xs mt-0'>
                  {errors.type?.message && String(errors.type.message)}
                </Form.Control.Feedback>
              </Form.Group> */}
          {/* Company */}
          <Form.Group>
            <Form.Label className='mb-1'>Company</Form.Label>
            <Form.Control
              disabled={loading}
              type="text"
              {...register("organization", { required: 'Company is required' })}
              isInvalid={!!errors.organization}
            />
            <Form.Control.Feedback type="invalid" className='position-absolute text-xs mt-0'>
              {errors.organization?.message && String(errors.organization.message)}
            </Form.Control.Feedback>
          </Form.Group>
          {/* First Name */}
          <Form.Group>
            <Form.Label className='mb-1'>First Name</Form.Label>
            <Form.Control
              disabled={loading}
              type="text"
              {...register("firstName")}
            />
          </Form.Group>
          {/* Last Name */}
          <Form.Group>
            <Form.Label className='mb-1'>Last Name</Form.Label>
            <Form.Control
              disabled={loading}
              type="text"
              {...register("lastName")}
            />
          </Form.Group>
          {/* Title */}
          <Form.Group>
            <Form.Label className='mb-1'>Title</Form.Label>
            <Form.Control
              disabled={loading}
              type="text"
              {...register("title")}
            />
          </Form.Group>
          {/* Employees */}
          <Form.Group>
            <Form.Label className='mb-1'>Employees</Form.Label>
            <Form.Select
              disabled={loading}
              {...register("employees")}
            >
              <option value={""}>Select...</option>
              <option value={"2-10"}>2-10</option>
              <option value={"11-50"}>11-50</option>
              <option value={"51-200"}>51-200</option>
              <option value={"201-1000"}>201-1000</option>
              <option value={"1001+"}>1001+</option>
            </Form.Select>
          </Form.Group>
          {/* Rank */}
          <Form.Group>
            <Form.Label className='mb-1'>Rank</Form.Label>
            <Form.Control
              disabled={loading}
              type="number"
              {...register("rank", { valueAsNumber: true })}
            />
          </Form.Group>
          {/* Email
          <Form.Group>
            <Form.Label className='mb-1'>Email</Form.Label>
            <Form.Control
              disabled={loading}
              type="text"
              {...register("email", {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Please enter a valid email"
                }
              })}
              isInvalid={!!errors.email}
            />
            <Form.Control.Feedback type="invalid" className='position-absolute text-xs mt-0'>
              {errors.email?.message && String(errors.email.message)}
            </Form.Control.Feedback>
          </Form.Group> */}
          {/* {!props.item && !analyzing &&
            <div className="d-flex justify-content-center text-center text-sm">
              <Button onClick={() => setManual(!manual)}
                className="d-flex gap-1 align-items-center border-0 underline underline-offset-4 bg-transparent text-primary font-semibold"
              >
                {manual && <FaArrowLeft />}
                {manual ? 'Use photo' : 'Enter manually'}
                {!manual && <FaArrowRight />}
              </Button>
            </div>
          } */}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading || analyzing} style={{ width: 80 }}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading || analyzing} style={{ width: 80 }}>
            {loading ? <Spinner size='sm' /> : 'Submit'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal >
  );
}
