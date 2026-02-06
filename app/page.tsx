"use client";

import ProjectButton from "@/components/ProjectButton";
import { Row, Col, Button, Modal, OverlayTrigger, Tooltip, Spinner } from "react-bootstrap";
import { LuHammer } from "react-icons/lu";
import { LuLayoutDashboard } from "react-icons/lu";
import { AiFillGithub } from "react-icons/ai";
import { BsPersonVideo2 } from "react-icons/bs";
import { useState } from "react";


export default function Home() {
  const [showDemo, setShowDemo] = useState(false);
  const demoVideoUrl = "https://drive.google.com/file/d/1Dj9O4y8NZJoTcnYcAH01gQI5SgW5VxfB/preview";
  const [loaded, setLoaded] = useState(false);

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
                <div className="w-100">
                  <Button
                    variant={project.variant ?? "primary"}
                    className="w-100"
                    onClick={() => setShowDemo(true)}
                  >
                    {project.title}
                  </Button>
                </div>
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
        onHide={() => {
          setShowDemo(false);
          setLoaded(false);
        }}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Dashboard Demo Video</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className='p-3 relative'>
            {!loaded &&
              <div className='absolute inset-0 flex justify-center items-center w-100'
                style={{ zIndex: 99, aspectRatio: 169 / 100 }}>
                <Spinner />
              </div>
            }
            <iframe
              src={demoVideoUrl}
              title="Demo Video"
              allow="autoplay; fullscreen"
              style={{
                width: "100%", aspectRatio: 734 / 434,
                visibility: loaded ? "visible" : "hidden",
              }}
              onLoad={() => setLoaded(true)}
            />
          </div>
        </Modal.Body>
      </Modal>
    </div >
  );
}
