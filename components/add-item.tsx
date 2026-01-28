"use client";

import { useState } from "react";
import { Button } from "react-bootstrap";
import { FaPlus } from "react-icons/fa6";
import VoicemailModal from "./VoicemailModal";
import { Row, Col } from "react-bootstrap";

export default function AddItem() {
    const [show, setShow] = useState(false);

    return (
        <Row>
            <Col xs='auto'>
                <Button
                    variant="sunlight"
                    className="h-100 d-flex justify-content-center align-items-center gap-1"
                    onClick={() => setShow(true)}
                >
                    <FaPlus size={18} /> New
                </Button>
            </Col>
            <VoicemailModal show={show} setShow={setShow} />
        </Row>
    );
}
