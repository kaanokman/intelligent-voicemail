import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { hasEnvVars } from "@/lib/utils";
import { Suspense } from "react";
import ProjectButton from "@/components/ProjectButton";
import { Row, Col } from "react-bootstrap";
import { LuHammer } from "react-icons/lu";

export default function Home() {
  return (
    <div className="d-flex align-items-center justify-content-center flex-grow-1 p-4">
      <div className='d-flex flex-column gap-3 text-5xl font-semibold  text-center'
        style={{ width: 1000, maxWidth: 1000 }}>
        <Row>
          <Col className='d-flex flex-column gap-3 items-center'>
            Kaan Okman
            <div className='d-flex gap-2'>
              <LuHammer /> Forward Deployed Engineer
            </div>
            <div className='text-lg'>
              Project 2 - Intelligent Voicemail
            </div>
            {/* <p className='text-muted font-normal' style={{ fontSize: 20 }}>
              Below you will find interactive projects I have worked on,
              all of which have some sort of AI integration that is practical and provides
              real value.
            </p> */}
          </Col>
        </Row>
        <Row>
          {[
            {
              title: 'GitHub', link: 'https://github.com/kaanokman/portfolio', description: `
                Repository of the app published on GitHUb.
                ` },
            {
              title: 'Demo', link: '/', description: `
                Demonstration video of the Dashboard and how its features address the challenge.
            ` },
            {
              title: 'Dashboard', link: '/dashboard', description: `
              The interactive dashbaord to test out the functionality.
          `},
          ].map((project) =>
            <Col xs={12} md={4} key={project.title} className='d-flex flex-column gap-3'>
              <div className='w-100 bg-light rounded border' style={{ aspectRatio: 4 / 3 }} />
              <ProjectButton title={project.title} link={project.link} />
              <p className='text-muted text-sm font-normal text-left'>
                {project.description}
              </p>
            </Col>
          )}
        </Row>
      </div>
    </div >
  );
}
