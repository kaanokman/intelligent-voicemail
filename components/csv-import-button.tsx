"use client";

import { useState } from "react";
import { Form, Button, Spinner } from "react-bootstrap";
import Papa from "papaparse";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

const toastSettings = {
  autoClose: 3000,
  closeOnClick: true,
  pauseOnHover: true,
};

export default function CSVImportButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const input = e.currentTarget.elements.namedItem("csv") as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      toast.error("Please select a CSV file.", toastSettings);
      return;
    }

    setLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        console.log(results)
        try {
          const response = await fetch("/api/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(results.data),
          });

          const json = await response.json();

          if (!response.ok) throw new Error(json.error || "Upload failed");

          toast.success(`Imported ${json.inserted} leads successfully`, toastSettings);

          router.refresh(); // 👈 instant UI sync
        } catch (err: any) {
          toast.error(err.message || "Upload failed", toastSettings);
        } finally {
          setLoading(false);
        }
      },
      error: () => {
        toast.error("Failed to parse CSV file.", toastSettings);
        setLoading(false);
      },
    });
  };

  return (
    <Form onSubmit={handleUpload} className="d-flex align-items-center gap-2">
      <Form.Control type="file" name="csv" accept=".csv" required />

      <Button type="submit" disabled={loading}>
        {loading ? <Spinner size="sm" /> : "Import"}
      </Button>
    </Form>
  );
}
