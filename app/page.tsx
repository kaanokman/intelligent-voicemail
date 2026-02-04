import ProjectButton from "@/components/ProjectButton";
import { Row, Col } from "react-bootstrap";
import { LuHammer } from "react-icons/lu";

export default function Home() {
    return (
        <div className="d-flex align-items-center justify-content-center flex-grow-1 p-4 h-100">
            <div className='d-flex flex-column gap-4 font-semibold text-center pb-5'
                style={{ width: 1000, maxWidth: 1000 }}>
                <Row>
                    <Col className='d-flex flex-column gap-2 items-center'>
                        <div className='text-3xl'>Kaan Okman</div>
                        <div className='text-5xl'> Intelligent Voicemail </div>
                        <div className='d-flex gap-2 text-3xl'>
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
                            title: 'GitHub', link: 'https://github.com/kaanokman/portfolio',
                            description: 'The repository of the application published on GitHub', variant: 'dark'
                        },
                        {
                            title: 'Demo', link: '/', variant: 'bark',
                            description: `A demonstration video of the dashboard's workflow`
                        },
                        {
                            title: 'Dashboard', link: '/dashboard', variant: 'sunlight',
                            description: 'The implemented dashboard for managing voicemails'
                        },
                    ].map((project) =>
                        <Col xs={12} md={4} key={project.title} className='d-flex flex-column gap-3'>
                            <div className='w-100 bg-light rounded border' style={{ aspectRatio: 4 / 3 }} />
                            <ProjectButton title={project.title} link={project.link} variant={project.variant} />
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
