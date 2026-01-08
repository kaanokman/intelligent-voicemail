"use client"

import { Button } from "react-bootstrap";
import { Row, Col } from 'react-bootstrap';
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { FaEdit, FaRegTrashAlt } from "react-icons/fa";
import { useState } from "react";
import LeadsModal from "./RentRollModal";
import ConfirmationModal from "./confirmation-modal";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

type RentRollDataProps = {
  item?: {
    id: number;
    address?: string;
    property: string;
    unit?: string;
    tenant?: string;
    lease_start?: Date;
    lease_end?: Date;
    sqft?: number;
    monthly_payment?: number;
  };
};

const toastSettings = {
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
};

export default function Actions(props: RentRollDataProps) {
  const router = useRouter();
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const [show, setShow] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete(id: number) {
    setLoading(true);
    const response = await fetch("/api/rent_roll", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    const { message, error } = await response.json();
    if (message) {
      router.refresh();
      setShowConfirmation(false);
      toast.success(`Deleted rent roll data`, toastSettings);
    } else if (error) {
      console.error(error);
      toast.error(`Error deleting rent roll data`, toastSettings);
    }
    setLoading(false);
  }

  return (
    <>
      <Row>
        <Col xs='auto' className='d-flex gap-2'>
          <OverlayTrigger trigger={isMobile ? [] : ['hover', 'hover']} overlay={<Tooltip>
            Edit
          </Tooltip>}>
            <Button variant='outline-primary' onClick={() => setShow(true)}
              style={{ height: 36, width: 36 }}
              className='p-0 d-flex justify-content-center align-items-center'>
              <FaEdit style={{ marginLeft: '2px' }} />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger trigger={isMobile ? [] : ['hover', 'hover']} overlay={<Tooltip>
            Delete
          </Tooltip>}>
            <Button variant='outline-danger' onClick={() => setShowConfirmation(true)}
              style={{ height: 36, width: 36 }}
              className='p-0 d-flex justify-content-center align-items-center'>
              <FaRegTrashAlt />
            </Button>
          </OverlayTrigger>
        </Col>
      </Row>
      <ConfirmationModal
        show={showConfirmation}
        setShow={setShowConfirmation}
        message="Are you sure you want to delete this rent roll data?"
        onConfirm={() => props.item && handleDelete(props.item.id)}
        loading={loading}
      />
      <LeadsModal show={show} setShow={setShow} item={props.item} />
    </>
  );
}