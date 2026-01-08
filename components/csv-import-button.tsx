"use client";

import { useRef, useState } from "react";
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      toast.error("Please select a CSV file.", toastSettings);
      return;
    }

    setLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const response = await fetch("/api/rent_roll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(results.data),
          });

          const json = await response.json();

          if (!response.ok) throw new Error(json.error || "Upload failed");

          toast.success(`Imported rent roll data successfully`, toastSettings);

          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }

          router.refresh();
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
      <Form.Control
        type="file"
        name="csv"
        accept=".csv"
        ref={fileInputRef}
        required
      />
      <Button type="submit" disabled={loading} style={{ width: 100 }}>
        {loading ? <Spinner size="sm" /> : "Import"}
      </Button>
    </Form>
  );
}
