'use client';

import { Row, Col } from "react-bootstrap";
import Actions from "@/components/Actions";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import Table from 'react-bootstrap/Table';
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { Modal, Button, Dropdown } from "react-bootstrap";
import {
    useReactTable, getCoreRowModel, getSortedRowModel,
    flexRender, SortingState
} from "@tanstack/react-table";
import { VoicemailType } from "@/types/components";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter, useSearchParams } from "next/navigation";
import AddItem from "@/components/add-item";
import { Badge } from "react-bootstrap";

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

const LabelBadge = ({ label }: { label: VoicemailType["label"] }) => {
    // Bootstrap supports bg + text, but not "outline" badges by default,
    // so we simulate outline with border + transparent bg.
    const getClass = (label: VoicemailType["label"]) => {
        if (label === 'new') {
            return "border-danger text-danger";
        }
        if (label === 'processed') {
            return "border-success text-success";
        }
        if (label === 'junk') {
            return "border-bark text-bark";
        }
        return "border-secondary text-secondary";
    };

    return (
        <Badge
            className={`bg-transparent border ${getClass(label)}`}
            style={{ fontWeight: 600 }}
        >
            {label.toUpperCase()}
        </Badge>
    );
};

type RangeISO = { start: string; end: string };
type RangeDate = { start: Date; end: Date };

export default function Voicemails({ voicemails, error, range }: {
    voicemails: VoicemailType[];
    error?: string;
    range: RangeISO;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    // Sorting state for the voicemails table
    const [sorting, setSorting] = useState<SortingState>([{ id: "timestamp", desc: true }]);
    // Current date range for which to load voicemails into client from server
    const [dateRange, setDateRange] = useState<RangeDate>(() => ({
        start: new Date(range.start),
        end: new Date(range.end),
    }));
    // Whether or not to show the custom date range modal
    const [showRangeModal, setShowRangeModal] = useState(false);

    // Function to handle dat range change (fetches voicemails from server to client given new range)
    const onDateRangeChange = (range: { start: Date; end: Date }) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("start", range.start.toISOString());
        params.set("end", range.end.toISOString());
        router.replace(`?${params.toString()}`);
        router.refresh();
    };

    // Hook to convert date range to date object on router refresh
    useEffect(() => {
        setDateRange({ start: new Date(range.start), end: new Date(range.end) });
    }, [range.start, range.end]);

    // Function to format timestamp of each row for display
    const formatTimestamp = useCallback((timestamp: string) => {
        return new Intl.DateTimeFormat("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).format(new Date(timestamp));
    }, []);

    // Columns for voicemails table
    const columnDefs = useMemo<ColumnDef<VoicemailType, any>[]>(() => [
        { accessorKey: "phone_number", header: "Phone", sortDescFirst: true },
        { accessorKey: "patient", header: "Patient", sortDescFirst: true },
        { accessorKey: "reason", header: "Reason for Call", sortDescFirst: true },
        { accessorKey: "description", header: "Description", sortDescFirst: true },
        {
            accessorKey: "urgency", header: "Urgency", sortDescFirst: true,
            sortingFn: (a, b, id) => {
                const aVal = urgencyMap[a.getValue(id) as string] ?? -1;
                const bVal = urgencyMap[b.getValue(id) as string] ?? -1;
                return aVal - bVal;
            },
        },
        {
            accessorKey: "label",
            header: "Label",
            cell: ({ getValue }) => (
                <LabelBadge label={getValue() as VoicemailType["label"]} />
            ),
        },
        {
            accessorKey: "timestamp",
            header: "Date & Time",
            sortingFn: (a, b, id) =>
                new Date(a.getValue(id) as string).getTime() - new Date(b.getValue(id) as string).getTime(),
            cell: ({ getValue }) => formatTimestamp(getValue() as string),
        },
    ], [formatTimestamp]);

    // Voicemails that are currently loaded in from the server to the client, filtered on the front-end by user
    const filteredVoicemails = useMemo(() => {
        return voicemails;
    }, [voicemails])

    // Displays error if voicemails failed to load from server
    useEffect(() => {
        error && toast.error(error, { ...toastSettings, toastId: 'voicemailsError' });
    }, [error]);

    // Function to format date range label for display
    const formatRangeLabel = useCallback((start: Date, end: Date) => {
        const fmt: Intl.DateTimeFormatOptions = { month: "short", day: "2-digit", year: "numeric" };
        return `${start.toLocaleDateString("en-US", fmt)} - ${end.toLocaleDateString("en-US", fmt)}`;
    }, []);

    // Voicemails table
    const table = useReactTable({
        data: filteredVoicemails,
        columns: columnDefs,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div className="flex flex-col gap-3 w-full">
            <Row>
                <Col xs sm="auto" className="text-3xl font-semibold">Voicemails</Col>
                <Col xs="auto"><AddItem /></Col>
                <Col xs='auto' className='ms-auto'>
                    <Dropdown>
                        <Dropdown.Toggle variant="outline-bark" className="w-100 text-start">
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
                                        onDateRangeChange({ start, end });
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
                </Col>
            </Row>
            {/* <Row>
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
            </Row> */}
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
                                            // className={(row.original.invalid_columns?.length ?? 0) > 0 ? "table-warning" : ""}
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
                                                    <Actions voicemail={row.original} />
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
                            onDateRangeChange({ start, end });
                            setShowRangeModal(false);
                        }}
                    >
                        Apply
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
