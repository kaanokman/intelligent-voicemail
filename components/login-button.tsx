"use client";

import { Button } from "react-bootstrap";
import { useRouter } from "next/navigation";

export default function LoginButton() {
  const router = useRouter();

  return <Button variant='outline-light' onClick={() => router.push("/auth/login")}>
    Log in
  </Button>;
}
