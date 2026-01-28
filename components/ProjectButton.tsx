"use client";

import { Button } from "react-bootstrap";
import { useRouter } from "next/navigation";

export default function ProjectButton(props: { link: string; title: string, variant: string }) {
    const router = useRouter();
    const isInternal = props.link.startsWith("/");

    const handleClick = () => {
        if (isInternal) {
            router.push(props.link);
        } else {
            window.open(props.link, "_blank", "noopener,noreferrer");
        }
    };

    return (
        <Button
            variant={props.variant ?? 'primary'}
            className="w-100"
            href={props.link}
            target={isInternal ? undefined : "_blank"}
            rel={isInternal ? undefined : "noopener noreferrer"}
            onClick={handleClick}
        >
            {props.title}
        </Button>
    );
}
