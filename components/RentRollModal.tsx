"use client";

import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { Button, Modal, Form, Spinner } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

type RentRollModalProps = {
  item?: {
    id: number;
    address?: string;
    property: string;
    unit?: string;
    tenant?: string;
    lease_start?: string;
    lease_end?: string;
    sqft?: number;
    monthly_payment?: number;
  },
  show: boolean;
  setShow: Dispatch<SetStateAction<boolean>>;
};

type FormDataType = {
  address?: string;
  property: string;
  unit?: string;
  tenant?: string;
  lease_start?: string;
  lease_end?: string;
  sqft?: number;
  monthly_payment?: number;
};

const toastSettings = {
  autoClose: 5000,
  closeOnClick: true,
  pauseOnHover: true,
};

const toDateInputValue = (v?: string | null): string | undefined => {
  if (!v) return undefined;

  const s = v.trim();
  if (!s) return undefined;

  // if already YYYY-MM-DD
  const ymd = dayjs(s, "YYYY-MM-DD", true);
  if (ymd.isValid()) return ymd.format("YYYY-MM-DD");

  // if stored as DD-MM-YYYY
  const dmy = dayjs(s, "DD-MM-YYYY", true);
  if (dmy.isValid()) return dmy.format("YYYY-MM-DD");

  return undefined;
};

const fromDateInputValue = (v?: string | null): string | null => {
  if (!v) return null;
  const d = dayjs(v, "YYYY-MM-DD", true);
  if (!d.isValid()) return null;
  return d.format("DD-MM-YYYY");
};

export default function RentRollModal(props: RentRollModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } =
    useForm({
      defaultValues: {
        ...props.item,
        property: props.item?.property ?? "", // required field
        lease_start: toDateInputValue(props.item?.lease_start),
        lease_end: toDateInputValue(props.item?.lease_end),
      }, shouldFocusError: false
    });
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    props.setShow(false);
    reset();
    setLoading(false);
  };

  useEffect(() => {
    if (props.show) {
      reset({
        ...props.item,
        lease_start: toDateInputValue(props.item?.lease_start),
        lease_end: toDateInputValue(props.item?.lease_end),
      });
    }
  }, [props.show, props.item, reset]);

  async function handleRequest(formData: FormDataType) {
    setLoading(true);
    try {
      const result = await fetch("/api/rent_roll", {
        method: props.item ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          lease_start: fromDateInputValue(formData.lease_start),
          lease_end: fromDateInputValue(formData.lease_end),
          ...(props.item ? { id: props.item.id } : {}),
        })
      });
      const { message, error } = await result.json();
      if (message) {
        handleClose();
        router.refresh();
        toast.success(`${props.item ? 'Updated' : 'Created'} rent roll data`, toastSettings);
      } else if (error) {
        toast.error(`Error ${props.item ? 'updating' : 'creating'} rent roll data`, toastSettings);
      }
    } catch (error) {
      let errorMsg;
      if (error instanceof Error) errorMsg = error.message;
      toast.error(errorMsg || 'Error creating/updating rent roll data', toastSettings);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal show={props.show} onHide={handleClose} centered>
      <Form onSubmit={handleSubmit(handleRequest)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {`${props.item ? 'Edit' : 'Add'} Rent Data`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-flex flex-column gap-3 p-4 pt-3">
          {/* Address */}
          {/* <Form.Group>
            <Form.Label className='mb-1'>Address</Form.Label>
            <Form.Control
              disabled={loading}
              type="text"
              {...register("address")}
            />
          </Form.Group> */}
          {/* Property */}
          <Form.Group>
            <Form.Label className='mb-1'>Property</Form.Label>
            <Form.Control
              disabled={loading}
              type="text"
              {...register("property", { required: 'Property is required' })}
              isInvalid={!!errors.property}
            />
            <Form.Control.Feedback type="invalid" className='position-absolute text-xs mt-0'>
              {errors.property?.message && String(errors.property.message)}
            </Form.Control.Feedback>
          </Form.Group>
          {/* Unit */}
          <Form.Group>
            <Form.Label className='mb-1'>Unit</Form.Label>
            <Form.Control
              disabled={loading}
              type="text"
              {...register("unit")}
            />
          </Form.Group>
          {/* Tenant */}
          <Form.Group>
            <Form.Label className='mb-1'>Tenant</Form.Label>
            <Form.Control
              disabled={loading}
              type="text"
              {...register("tenant")}
            />
          </Form.Group>
          <div className='d-flex gap-3'>
            {/* Lease Start */}
            <Form.Group className='col'>
              <Form.Label className='mb-1'>Lease Start</Form.Label>
              <Form.Control
                disabled={loading}
                type="date"
                {...register("lease_start")}
              />
            </Form.Group>
            {/* Lease End */}
            <Form.Group className='col'>
              <Form.Label className='mb-1'>Lease End</Form.Label>
              <Form.Control
                disabled={loading}
                type="date"
                {...register("lease_end")}
              />
            </Form.Group>
          </div>
          <div className='d-flex gap-3'>
            {/* Square Feet */}
            <Form.Group>
              <Form.Label className='mb-1'>Square Feet</Form.Label>
              <Form.Control
                disabled={loading}
                type="number"
                {...register("sqft", { valueAsNumber: true })}
              />
            </Form.Group>
            {/* Monthly Payment */}
            <Form.Group>
              <Form.Label className='mb-1'>Monthly Payment</Form.Label>
              <Form.Control
                disabled={loading}
                type="number"
                {...register("monthly_payment", { valueAsNumber: true })}
              />
            </Form.Group>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading} style={{ width: 80 }}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading} style={{ width: 80 }}>
            {loading ? <Spinner size='sm' /> : 'Submit'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
