'use client';

import { Row, Col, Button, Spinner } from "react-bootstrap";
import Lead from "@/components/Lead";
import { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import Table from 'react-bootstrap/Table';
import { Form } from "react-bootstrap";

const toastSettings = {
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
};

type LeadType = {
  id: number;
  organization: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  employees?: string;
  rank?: number;
};

const columns = ["Company", "First Name", "Second Name", "Title", "Employees", "Rank"];

export default function Leads({ leadProps }: { leadProps: LeadType[] }) {
  const router = useRouter();

  const [leads, setLeads] = useState<LeadType[]>(leadProps);
  const [loading, setLoading] = useState(true);

  const [filteredLeads, setFilteredLeads] = useState<LeadType[]>(leadProps);

  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  const organizations = useMemo(() => {
    return Array.from(
      new Set(leads.map(l => l.organization).filter(Boolean))
    );
  }, [leads]);

  const getleads = async () => {
    const response = await fetch("/api/leads", {
      method: "GET",
    });
    const { result, error } = await response.json();
    if (result) {
      setLeads(
        [...result].sort(
          (a: LeadType, b: LeadType) => (a.rank ?? Infinity) - (b.rank ?? Infinity)
        )
      );
    } else if (error) {
      toast.error(`Error loading leads`, toastSettings);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!selectedCompany) {
      setFilteredLeads(leads);
    } else {
      const displayLeads = leads.filter((lead) => lead.organization === selectedCompany);
      setFilteredLeads(displayLeads);
      if (!displayLeads.length) {
        setSelectedCompany("");
      }
    }
  }, [leads, selectedCompany]);

  useEffect(() => {
    setLoading(true);
    getleads();
  }, [leadProps]);

  const handleRanking = async () => {
    setLoading(true);

    if (!filteredLeads.some(lead => lead.employees)) {
      toast.error(`Company employee count unknown`, toastSettings);
      setLoading(false);
    } else {
      const response = await fetch("/api/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filteredLeads)
      });
      const { message, error } = await response.json();
      if (message === 'success') {
        router.refresh();
        toast.success(`Successfully ranked leads for ${selectedCompany}`, toastSettings);
      } else if (message === 'warning') {
        toast.warn(`No rankable leads for ${selectedCompany}`, toastSettings);
        setLoading(false);
      } else if (error) {
        toast.error(`Error ranking leads`, toastSettings);
        setLoading(false);
      }
    }
  }

  return (
    <div className='d-flex flex-col gap-2'>
      <Row className='justify-content-between'>
        <Col>
          <Form.Group>
            <Form.Label className='mb-1'>Company</Form.Label>
            <Form.Select
              style={{ maxWidth: '500px' }}
              onChange={(e) => setSelectedCompany(e.target.value)}
            >
              <option value={""}>All</option>
              {organizations.map((org: string) => (
                <option key={org} value={org}>
                  {org}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col xs='auto' className='d-flex flex-column justify-content-end'>
          <Button
            style={{ width: 160 }}
            disabled={!selectedCompany || loading}
            onClick={() => handleRanking()}>
            {loading ? <Spinner size='sm' /> : 'Rank Leads'}
          </Button>
        </Col>
      </Row>
      <div
        style={{
          maxHeight: "450px",
          overflowY: "auto",
          overflowX: "hidden",
          border: "1px solid #dee2e6",
        }}
      >
        <Table
          striped
          hover
          style={{
            borderCollapse: "separate",
            borderSpacing: 0,
            marginBottom: 0,
          }}
        >
          <thead
            style={{
              position: "sticky",
              top: 0,
              zIndex: 2,
              background: "white",
            }}
          >
            <tr>
              {columns.map((title) => (
                <th
                  key={title}
                  style={{
                    borderBottom: "1px solid #dee2e6",
                    borderRight: "1px solid #dee2e6",
                  }}
                >
                  {title}
                </th>
              ))}
              <th
                style={{
                  borderBottom: "1px solid #dee2e6",
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length === 0 ?
              <tr>
                <td colSpan={columns.length + 1} className='border-bottom-0'>
                  <div className='d-flex justify-content-center'>
                    No leads
                  </div>
                </td>
              </tr> : <>
                {filteredLeads.map((lead, rowIndex) => {
                  const isLastRow = rowIndex === filteredLeads.length - 1;
                  const cells = Object.entries(lead).filter(([key]) => key !== "id");
                  return (
                    <tr key={lead.id} className={isLastRow ? 'border-bottom-0' : ''}>
                      {cells.map(([key, value]) => (
                        <td
                          key={key}
                          style={{
                            borderRight: "1px solid #dee2e6",
                            borderBottom: isLastRow ? "none" : "1px solid #dee2e6",
                          }}
                        >
                          {value ? String(value) : "-"}
                        </td>
                      ))}
                      <td
                        style={{
                          borderBottom: isLastRow ? "none" : "1px solid #dee2e6",
                        }}
                      >
                        <Lead item={lead} />
                      </td>
                    </tr>
                  );
                })}
              </>
            }
          </tbody>
        </Table>
      </div>
    </div >
  );
}
