"use client";

import ProjectButton from "@/components/ProjectButton";
import { Row, Col, Button, Modal, OverlayTrigger, Tooltip } from "react-bootstrap";
import { LuHammer } from "react-icons/lu";
import { LuLayoutDashboard } from "react-icons/lu";
import { AiFillGithub } from "react-icons/ai";
import { BsPersonVideo2 } from "react-icons/bs";
import { useState } from "react";


export default function Home() {
  const [showDemo, setShowDemo] = useState(false);
  const demoVideoUrl = "https://drive.google.com/file/d/1p1r9-Ct_lMyCylvhEeBty3tVzxbGyD2W/preview";

  return (
    <div className="d-flex align-items-center justify-content-center flex-grow-1 p-4 h-100">
      <div className='d-flex flex-column gap-4 font-semibold text-center pb-5'
        style={{ width: 1000, maxWidth: 1000 }}>
        <Row>
          <Col className='d-flex flex-column gap-2 items-center'>
            <div className='text-2xl'>KAAN OKMAN</div>
            <div className='text-5xl text-italic'> Intelligent Voicemail </div>
            <div className='d-flex gap-2 text-3xl border border-oak rounded-4 px-3 py-2' style={{ backgroundColor: '#fff9f1' }}>
              <div className='h-100 flex items-center'>
                <LuHammer />
              </div>
              Forward Deployed Engineer - Project 2
            </div>
          </Col>
        </Row>
        <Row>
          {[
            {
              title: 'GitHub', link: 'https://github.com/kaanokman/intelligent-voicemail',
              description: 'The repository of the application published on GitHub', variant: 'dark',
              icon: AiFillGithub
            },
            {
              title: 'Demo', link: '/', variant: 'oak',
              description: `A demonstration video of the dashboard's workflow`,
              icon: BsPersonVideo2
            },
            {
              title: 'Dashboard', link: '/dashboard', variant: 'sunlight',
              description: 'The implemented dashboard for managing voicemails',
              icon: LuLayoutDashboard
            },
          ].map((project) =>
            <Col xs={12} md={4} key={project.title} className='d-flex flex-column gap-3'>
              <div className='w-100 bg-light rounded border flex items-center justify-center' style={{ aspectRatio: 4 / 3 }}>
                <project.icon size={120} />
              </div>
              {project.title === "Demo" ? (
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip id="demo-coming-soon">Coming soon!</Tooltip>}
                >
                  <div className="w-100">
                    <Button
                      variant={project.variant ?? "primary"}
                      className="w-100"
                      onClick={() => setShowDemo(true)}
                      disabled
                    >
                      {project.title}
                    </Button>
                  </div>
                </OverlayTrigger>
              ) : (
                <ProjectButton title={project.title} link={project.link} variant={project.variant} />
              )}
              <p className='text-muted text-sm font-normal text-left'>
                {project.description}
              </p>
            </Col>
          )}
        </Row>
      </div>
      <Modal
        show={showDemo}
        onHide={() => setShowDemo(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Dashboard Demo Video</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className='p-3'>
            <iframe
              src={demoVideoUrl}
              title="Demo Video"
              allow="autoplay; fullscreen"
              style={{ width: "100%", height: 395 }}
            />
          </div>
        </Modal.Body>
      </Modal>
    </div >
  );
}
