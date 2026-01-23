'use client';

import { Row, Col } from "react-bootstrap";
import Actions from "@/components/Actions";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import Table from 'react-bootstrap/Table';
import { Form } from "react-bootstrap";
import { PieChart } from '@mui/x-charts/PieChart';
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { Modal, Button, Dropdown, Tooltip, OverlayTrigger } from "react-bootstrap";
import {
    useReactTable, getCoreRowModel, getSortedRowModel,
    flexRender, SortingState, CellContext
} from "@tanstack/react-table";
import { PieSeriesType, PieValueType } from "@mui/x-charts";
import { Spinner } from "react-bootstrap";
import { FaExclamationTriangle } from "react-icons/fa";
import { VoicemailType } from "@/types/components";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { DateTime } from "luxon";

const formatTimestamp = (ts: string) => {
    return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false, // 24h clock
    }).format(new Date(ts));
}

const urgencyMap: Record<string, number> = {
    low: 0,
    medium: 1,
    high: 2,
};

const toastSettings = {
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
};

export default function Voicemails({ voicemails }: { voicemails: VoicemailType[] }) {
    const [filteredVoicemails, setFilteredVoicemails] = useState<VoicemailType[]>(voicemails);
    const [sorting, setSorting] = useState<SortingState>([{ id: "timestamp", desc: true }]);
    const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() => {
        return {
            start: DateTime.now().minus({ days: 7 }).startOf("day").toJSDate(),
            end: DateTime.now().endOf("day").toJSDate()
        };
    });
    const [showRangeModal, setShowRangeModal] = useState(false);

    const mounted = useRef(false);

    const columnDefs = useMemo<ColumnDef<VoicemailType, any>[]>(() => [
        {
            accessorKey: "phone_number",
            header: "Phone",
            sortDescFirst: true,
        },
        {
            accessorKey: "patient",
            header: "Patient",
            sortDescFirst: true,
        },
        {
            id: "reason",
            header: "Reason for Call",
            sortDescFirst: true,
        },
        {
            id: "description",
            header: "Description",
            sortDescFirst: true,
        },
        {
            accessorKey: "urgency",
            header: "Urgency",
            sortDescFirst: true,
            sortingFn: (a, b, id) => {
                const aVal = urgencyMap[a.getValue(id) as string] ?? -1;
                const bVal = urgencyMap[b.getValue(id) as string] ?? -1;
                return aVal - bVal;
            },
        },
        {
            accessorKey: "timestamp",
            header: "Date & Time",
            sortingFn: (a, b, id) =>
                new Date(a.getValue(id) as string).getTime() - new Date(b.getValue(id) as string).getTime(),
            cell: ({ getValue }) => formatTimestamp(getValue() as string),
        },
    ], [voicemails, dateRange]);

    const getVoicemails = async () => {
        const response = await fetch("/api/voicemails", { method: "GET" });
        const { result, error } = await response.json();
        if (result) {
            const tableData = result.filter((voicemail: VoicemailType) => {
                return new Date(voicemail.timestamp) <= dateRange.end &&
                    new Date(voicemail.timestamp) >= dateRange.start;
            });
            setFilteredVoicemails(tableData);
        } else if (error) {
            toast.error(`Error loading voicemails`, toastSettings);
        }
    };

    useEffect(() => {
        if (mounted.current) {
            console.log('run')
            getVoicemails();
        } else {
            mounted.current = true;
        }
    }, [voicemails, dateRange]);

    const formatRangeLabel = useCallback((start: Date, end: Date) => {
        const fmt: Intl.DateTimeFormatOptions = { month: "short", day: "2-digit", year: "numeric" };
        return `${start.toLocaleDateString("en-US", fmt)} - ${end.toLocaleDateString("en-US", fmt)}`;
    }, []);

    const table = useReactTable({
        data: filteredVoicemails,
        columns: columnDefs,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div className='d-flex flex-col gap-3'>
            <Row className='justify-content-between'>
                <Col xs='auto'>
                    <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" className="w-100 text-start">
                            {formatRangeLabel(dateRange.start, dateRange.end)}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            {[1, 2, 3, 4, 5].map(years => (
                                <Dropdown.Item
                                    key={years}
                                    onClick={() => {
                                        const end = new Date();
                                        const start = new Date();
                                        start.setFullYear(end.getFullYear() - years);
                                        setDateRange({ start, end });
                                    }}
                                >
                                    Last {years} Year{years > 1 && "s"}
                                </Dropdown.Item>
                            ))}
                            <Dropdown.Divider />
                            <Dropdown.Item onClick={() => setShowRangeModal(true)}>
                                Custom…
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                    <Modal show={showRangeModal} onHide={() => setShowRangeModal(false)} centered>
                        <Modal.Header closeButton>
                            <Modal.Title>Select Date Range</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <form id="range-form">
                                <div className="d-flex gap-3 align-items-center">
                                    <input
                                        type="date"
                                        name="start"
                                        defaultValue={dateRange.start.toISOString().slice(0, 10)}
                                        className="form-control"
                                    />
                                    <span>→</span>
                                    <input
                                        type="date"
                                        name="end"
                                        defaultValue={dateRange.end.toISOString().slice(0, 10)}
                                        className="form-control"
                                    />
                                </div>
                            </form>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setShowRangeModal(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    const form = document.getElementById("range-form") as HTMLFormElement;
                                    const data = new FormData(form);
                                    function parseLocalDate(value: string) {
                                        const [year, month, day] = value.split("-").map(Number);
                                        return new Date(year, month - 1, day);
                                    }
                                    const start = parseLocalDate(data.get("start") as string);
                                    const end = parseLocalDate(data.get("end") as string);
                                    setDateRange({ start, end });
                                    setShowRangeModal(false);
                                }}
                            >
                                Apply
                            </Button>
                        </Modal.Footer>
                    </Modal>
                </Col>
                <Col xs md={4}>
                    <Form.Group>
                        <Form.Label className='mb-1'>Property</Form.Label>
                        <Form.Select
                            style={{ maxWidth: '500px' }}
                            onChange={(e) => setSelectedCompany(e.target.value)}
                        >
                            <option value={""}>All</option>
                            {['low', 'medium', 'high'].map((urgency: string) => (
                                <option key={urgency} value={urgency}>
                                    {urgency}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
            </Row>
            <Row className='g-3'>
                <Col>
                    <div
                        style={{
                            maxHeight: "450px",
                            overflowY: "auto",
                            overflowX: "auto",
                            border: "1px solid #dee2e6",
                        }} className='rounded'
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
                            <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "white" }}>
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <th
                                                key={header.id}
                                                onClick={header.column.getToggleSortingHandler()}
                                                style={{ cursor: "pointer", borderBottom: "1px solid #dee2e6", borderRight: "1px solid #dee2e6", userSelect: "none" }}
                                            >
                                                <div className='d-flex align-items-center justify-content-between gap-2'>
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                    <div style={{ fontSize: "0.65rem", color: "#adb5bd" }}
                                                        className='d-flex flex-column align-items-center'>
                                                        <FaSort size={16} />
                                                        <div style={{
                                                            position: 'absolute',
                                                            color: header.column.getIsSorted() ? "#555" : undefined
                                                        }}>
                                                            {header.column.getIsSorted() === "asc" ? <FaSortUp size={16} /> :
                                                                header.column.getIsSorted() === "desc" ? <FaSortDown size={16} /> : <></>}
                                                        </div>
                                                    </div>
                                                </div>

                                            </th>
                                        ))}
                                        <th style={{ borderBottom: "1px solid #dee2e6" }}>Actions</th>
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {table.getRowModel().rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={columnDefs.length + 1} className='border-bottom-0 text-center'>
                                            No voicemails in date range
                                        </td>
                                    </tr>
                                ) : (
                                    table.getRowModel().rows.map((row, rowIndex) => {
                                        const isLastRow = rowIndex === table.getRowModel().rows.length - 1;
                                        return (
                                            <tr
                                                key={row.id}
                                                className={(row.original.invalid_columns?.length ?? 0) > 0 ? "table-warning" : ""}
                                            >
                                                {row.getVisibleCells().map((cell, cellIndex) => (
                                                    <td key={cell.id} style={{
                                                        borderRight: "1px solid #dee2e6",
                                                        borderBottom: isLastRow ? "none" : "1px solid #dee2e6",
                                                    }}>
                                                        <div>
                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                        </div>
                                                    </td>
                                                ))}
                                                <td
                                                    style={{
                                                        borderBottom: isLastRow ? "none" : "1px solid #dee2e6",
                                                    }}
                                                >
                                                    <Actions item={row.original} />
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </Table>
                    </div>
                </Col>
            </Row>
        </div >
    );
}
