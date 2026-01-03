"use client";

import { Button } from "react-bootstrap";
import { useRouter } from "next/navigation";

export default function DashboardButton() {
  const router = useRouter();

  return <Button variant='primary' onClick={() => router.push("/dashboard")}>
    Dashboard
  </Button>;
}
