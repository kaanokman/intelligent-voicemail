"use client"

import { Button } from "react-bootstrap";
import { Row, Col, Card } from 'react-bootstrap';
import { FaWrench } from "react-icons/fa6";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { FaEdit, FaRegTrashAlt } from "react-icons/fa";
import { useState } from "react";
import LeadsModal from "./LeadsModal";
import ConfirmationModal from "./confirmation-modal";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { FaExternalLinkAlt } from "react-icons/fa";
import { BiSolidWasher } from "react-icons/bi";
import { FaUser } from "react-icons/fa";
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';

const textLoad = <Box sx={{
  width: 150,
  height: 12,
  borderRadius: 10,
  overflow: 'hidden',
  backgroundColor: '#f8f9fa',
  color: '#6c757d',
}}>
  <LinearProgress sx={{ height: '100%' }} color='inherit' />
</Box>


type LeadProps = {
  item?: {
    id: number;
    organization: string;
    firstName?: string;
    lastName?: string;
    title?: string;
    employees?: string;
    rank?: number;
  };
  placeholder?: boolean;
};

const toastSettings = {
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
};

export default function Lead(props: LeadProps) {
  const router = useRouter();
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const [show, setShow] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete(id: number) {
    setLoading(true);
    const response = await fetch("/api/leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    const { message, error } = await response.json();
    if (message) {
      router.refresh();
      setShowConfirmation(false);
      toast.success(`Deleted lead`, toastSettings);
    } else if (error) {
      console.error(error);
      toast.error(`Error deleting lead`, toastSettings);
    }
    setLoading(false);
  }

  const capitalizeWords = (str?: string) => {
    if (!str) return 'N/A';
    return str
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  const Icon = <FaUser size={120} color="#222222" />; // applianceIcons[props.item.type] || 

  return (
    <>
      <Row>
        <Col xs='auto' className='d-flex gap-2'>
          <OverlayTrigger trigger={isMobile ? [] : ['hover', 'hover']} overlay={<Tooltip>
            Edit
          </Tooltip>}>
            <Button variant='outline-primary' onClick={() => setShow(true)}
              style={{ height: 36, width: 36 }} disabled={props.placeholder}
              className='p-0 d-flex justify-content-center align-items-center'>
              <FaEdit style={{ marginLeft: '2px' }} />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger trigger={isMobile ? [] : ['hover', 'hover']} overlay={<Tooltip>
            Delete
          </Tooltip>}>
            <Button variant='outline-danger' onClick={() => setShowConfirmation(true)}
              style={{ height: 36, width: 36 }} disabled={props.placeholder}
              className='p-0 d-flex justify-content-center align-items-center'>
              <FaRegTrashAlt />
            </Button>
          </OverlayTrigger>
        </Col>
      </Row>
      <ConfirmationModal
        show={showConfirmation}
        setShow={setShowConfirmation}
        message="Are you sure you want to delete this lead?"
        onConfirm={() => props.item && handleDelete(props.item.id)}
        loading={loading}
      />
      <LeadsModal show={show} setShow={setShow} item={props.item} />
    </>
  );
}