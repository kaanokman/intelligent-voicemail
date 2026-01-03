"use client";

import { Button } from "react-bootstrap";
import { useRouter } from "next/navigation";

export default function SignupButton() {
  const router = useRouter();

  return <Button variant='outline-light' onClick={() => router.push("/auth/sign-up")}>
    Sign up
  </Button>;
}
