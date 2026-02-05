"use client";

import { Button, Modal } from "react-bootstrap";
import { Spinner } from 'react-bootstrap';

interface ConfirmationModalProps {
  show: boolean;
  setShow: (show: boolean) => void;
  message: string;
  onConfirm: () => void | Promise<void>;
  loading: boolean;
}

export default function ConfirmationModal({
  show,
  setShow,
  message,
  onConfirm,
  loading
}: ConfirmationModalProps) {

  const handleClose = () => setShow(false);

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Confirmation</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>{message}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading} style={{ width: 80 }}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading} style={{ width: 80, height: 38 }}
          className='flex items-center justify-center'>
          {loading ? <Spinner size='sm' /> : 'Delete'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
