'use client';

import { Row, Col } from "react-bootstrap";
import Actions from "@/components/Actions";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import Table from 'react-bootstrap/Table';
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { Modal, Button, Dropdown, Form } from "react-bootstrap";
import {
    useReactTable, getCoreRowModel, getSortedRowModel,
    flexRender, SortingState
} from "@tanstack/react-table";
import { VoicemailType } from "@/types/components";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter, useSearchParams } from "next/navigation";
import AddItem from "@/components/add-item";
import { FaGripLines, FaChevronUp, FaChevronDown } from "react-icons/fa6";
import { IoClose } from "react-icons/io5";
import Select from 'react-select';
import { Controller, useForm } from "react-hook-form";

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

type RangeISO = { start: string; end: string };
type RangeDate = { start: Date; end: Date };

function LabelCell(props: {
    className?: string;
    isClearable?: boolean;
    id: number; field: string; initialOption: string | null; options: string[];
    onUpdate: (form: Partial<VoicemailType>, id: number) => Promise<void>;
}) {
    const [loading, setLoading] = useState(false);
    const [selectedOption, setSelectedOption] = useState(props.initialOption);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setSelectedOption(props.initialOption);
    }, [props.initialOption, props.id]);

    const variant = props.className ? undefined :
        selectedOption === "new"
            ? "outline-danger"
            : selectedOption === "assigned"
                ? "outline-primary"
                : selectedOption === "processed"
                    ? "outline-success"
                    : selectedOption === "junk"
                        ? "outline-bark"
                        : "outline-secondary";

    return (
        <Dropdown className="custom-dropdown" show={open} onToggle={(nextOpen) => setOpen(nextOpen)}>
            <Dropdown.Toggle
                className={`flex items-center gap-1 ${!selectedOption ? 'none-button' : ''}
                ${props.className || ''}`}
                style={{ padding: "0.1rem 0.5rem", borderRadius: "6px" }}
                variant={variant}
                disabled={loading}
            >
                {loading ? "Updating…" : selectedOption ?
                    (<div className='flex items-center gap-2'>
                        {selectedOption.toUpperCase()}
                        {props.isClearable &&
                            <div className='clear-button' onClick={async (e) => {
                                e.stopPropagation();
                                setLoading(true);
                                setOpen(false);
                                try {
                                    await props.onUpdate({ [props.field]: null }, props.id);
                                } finally {
                                    setSelectedOption(null);
                                    setLoading(false);
                                }
                            }}>
                                <IoClose />
                            </div>
                        }
                    </div>
                    ) : 'None'}
            </Dropdown.Toggle>
            <Dropdown.Menu>
                {props.options.map((option) => (
                    <Dropdown.Item
                        key={option}
                        style={{ padding: "0.2rem 0.6rem", fontSize: "14px" }}
                        disabled={loading}
                        onClick={async () => {
                            if (option === selectedOption) return;
                            setLoading(true);
                            setOpen(false);
                            try {
                                await props.onUpdate({ [props.field]: option }, props.id);
                            } finally {
                                setSelectedOption(option);
                                setLoading(false);
                            }
                        }}
                    >
                        {option.toUpperCase()}
                    </Dropdown.Item>
                ))}
            </Dropdown.Menu>
        </Dropdown>
    );
}


export default function Voicemails({ voicemails, error, range }: {
    voicemails: VoicemailType[];
    error?: string;
    range: RangeISO;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const { watch, control } = useForm();

    const urgency = watch("urgency");
    const status = watch("status");
    const nextSteps = watch("nextSteps");

    // Sorting state for the voicemails table
    const [sorting, setSorting] = useState<SortingState>([{ id: "timestamp", desc: false }]);
    // Current date range for which to load voicemails into client from server
    const [dateRange, setDateRange] = useState<RangeDate>(() => ({
        start: new Date(range.start),
        end: new Date(range.end),
    }));
    // Whether or not to show the custom date range modal
    const [showRangeModal, setShowRangeModal] = useState(false);

    // Date range options for quick selection
    const dateRangeOptions = useMemo(() => [
        { label: "Last Day", days: 1 },
        { label: "Last 3 Days", days: 3 },
        { label: "Last 7 Days", days: 7 },
        { label: "Last 2 Weeks", days: 14 },
        { label: "Last Month", months: 1 },
        { label: "Last 3 Months", months: 3 },
        { label: "Last Year", years: 1 },
    ], []);

    const urgencyOptions = useMemo(() => [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
    ], []);

    const statusOptions = useMemo(() => [
        { value: "new", label: "New" },
        { value: "processed", label: "Processed" },
        { value: "assigned", label: "Assigned" },
        { value: "junk", label: "Junk" },
    ], []);

    const nextStepsOptions = useMemo(() => [
        { value: "Call patient back", label: "Call patient back" },
        { value: "Schedule appointment", label: "Schedule appointment" },
        { value: "Send follow-up email", label: "Send follow-up email" },
        { value: "Forward to doctor", label: "Forward to doctor" },
    ], []);

    // Function to handle dat range change (fetches voicemails from server to client given new range)
    const onDateRangeChange = (range: { start: Date; end: Date }) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("start", range.start.toISOString().slice(0, 10));
        params.set("end", range.end.toISOString().slice(0, 10));
        router.replace(`?${params.toString()}`);
        router.refresh();
    };

    const updateVoicemail = useCallback(async (form: Partial<VoicemailType>, id: number) => {
        try {
            const result = await fetch("/api/voicemails", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, id })
            });
            const { message, error } = await result.json();
            if (message) {
                router.refresh();
                toast.success('Updated voicemail', toastSettings);
            } else if (error) {
                toast.error(`Error updating voicemail`, toastSettings);
            }
        } catch (error) {
            let errorMsg;
            if (error instanceof Error) errorMsg = error.message;
            toast.error(errorMsg || 'Error updating voicemail', toastSettings);
        }
    }, []);

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
            hour12: true,
        }).format(new Date(timestamp));
    }, []);

    const fallback = <span className='text-muted opacity-50'>None</span>;

    // Columns for voicemails table
    const columnDefs = useMemo<ColumnDef<VoicemailType, any>[]>(() => [
        {
            accessorKey: "phone_number", header: "Phone", sortDescFirst: true,
            cell: ({ getValue }) => getValue() || fallback
        },
        {
            accessorKey: "patient", header: "Patient", sortDescFirst: true,
            cell: ({ getValue }) => getValue() || fallback
        },
        {
            accessorKey: "reason", header: "Summary", sortDescFirst: true,
            cell: ({ getValue }) => getValue() || fallback
        },
        {
            accessorKey: "urgency", header: "Urgency", sortDescFirst: true,
            sortingFn: (a, b, id) => {
                const aVal = urgencyMap[a.getValue(id) as string] ?? -1;
                const bVal = urgencyMap[b.getValue(id) as string] ?? -1;
                return aVal - bVal;
            },
            cell: ({ getValue }) => {
                if (getValue() === 'high') {
                    return <div className='flex items-center gap-2'><FaChevronUp color='red' />High</div>;
                } else if (getValue() === 'medium') {
                    return <div className='flex items-center gap-2'><FaGripLines color='orange' />Medium</div>;
                } else if (getValue() === 'low') {
                    return <div className='flex items-center gap-2'><FaChevronDown color='blue' />Low</div>;
                }
                return getValue() || fallback;
            },
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => (
                <LabelCell id={Number(row.original.id)} field="status" initialOption={row.original.status} onUpdate={updateVoicemail}
                    options={["new", "assigned", "processed", "junk"]} />
            ),
            sortDescFirst: true
        },
        {
            accessorKey: "suggestion", header: "Next Steps", sortDescFirst: true,
            cell: ({ getValue }) => getValue() || fallback
        },
        {
            accessorKey: "timestamp",
            header: "Date & Time",
            sortingFn: (a, b, id) =>
                new Date(a.getValue(id) as string).getTime() - new Date(b.getValue(id) as string).getTime(),
            cell: ({ getValue }) => formatTimestamp(getValue() as string),
            sortDescFirst: true
        },
    ], [formatTimestamp]);

    // Voicemails that are currently loaded in from the server to the client, filtered on the front-end by user
    const filteredVoicemails = useMemo(() => {
        return voicemails.filter(v => {
            if (urgency && v.urgency !== urgency) return false;
            if (status && v.status !== status) return false;
            if (nextSteps && v.suggestion !== nextSteps) return false;
            return true;
        });
    }, [voicemails, urgency, status, nextSteps]);

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
        getRowId: (row) => String(row.id),
    });

    return (
        <div className="flex flex-col gap-3 w-full">
            <Row>
                <Col xs sm="auto" className="text-3xl font-semibold flex items-end">Voicemails</Col>
                <Col xs="auto"><AddItem /></Col>
                <Col xs='auto' className='ms-auto'>
                    <Dropdown>
                        <Dropdown.Toggle variant="outline-bark" className="w-100 text-start">
                            {formatRangeLabel(dateRange.start, dateRange.end)}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            {dateRangeOptions.map(({ label, days, months, years }) => (
                                <Dropdown.Item
                                    key={label}
                                    onClick={() => {
                                        const end = new Date();
                                        const start = new Date(end);
                                        if (days) {
                                            start.setDate(end.getDate() - days);
                                        } else if (months) {
                                            start.setMonth(end.getMonth() - months);
                                        } else if (years) {
                                            start.setFullYear(end.getFullYear() - years);
                                        }
                                        onDateRangeChange({ start, end });
                                    }}
                                >
                                    {label}
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
            <Row className='g-3'>
                <Col xs md={3}>
                    <Form.Group className='col'>
                        <Form.Label className='mb-0'>Urgency</Form.Label>
                        <Controller
                            name="urgency"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    instanceId="urgency"
                                    inputId="urgency"
                                    styles={{ menu: (base) => ({ ...base, zIndex: 5 }) }}
                                    options={urgencyOptions}
                                    value={urgencyOptions.find(o => o.value === field.value) ?? null}
                                    onChange={(opt) => field.onChange(opt?.value ?? null)}
                                    placeholder="All"
                                    isClearable
                                />
                            )}
                        />
                    </Form.Group>
                </Col>
                <Col xs md={3}>
                    <Form.Group className='col'>
                        <Form.Label className='mb-0'>Status</Form.Label>
                        <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    instanceId="status"
                                    inputId="status"
                                    styles={{ menu: (base) => ({ ...base, zIndex: 5 }) }}
                                    options={statusOptions}
                                    value={statusOptions.find(o => o.value === field.value) ?? null}
                                    onChange={(opt) => field.onChange(opt?.value ?? null)}
                                    placeholder="All"
                                    isClearable
                                />
                            )}
                        />
                    </Form.Group>
                </Col>
                <Col xs md={3}>
                    <Form.Group className='col'>
                        <Form.Label className='mb-0'>Next Steps</Form.Label>
                        <Controller
                            name="nextSteps"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    instanceId="nextSteps"
                                    inputId="nextSteps"
                                    styles={{ menu: (base) => ({ ...base, zIndex: 5 }) }}
                                    options={nextStepsOptions}
                                    value={nextStepsOptions.find(o => o.value === field.value) ?? null}
                                    onChange={(opt) => field.onChange(opt?.value ?? null)}
                                    placeholder="All"
                                    isClearable
                                />
                            )}
                        />
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
                                position: 'relative'
                            }}
                        >
                            <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "white" }}>
                                {table.getHeaderGroups().map(headerGroup => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map(header => (
                                            <th
                                                key={header.id}
                                                onClick={header.column.getToggleSortingHandler()}
                                                style={{
                                                    cursor: "pointer", borderBottom: "1px solid #dee2e6", borderRight: "1px solid #dee2e6", userSelect: "none",
                                                    minWidth: 135,
                                                }}
                                            >
                                                <div className='d-flex align-items-center justify-content-between gap-2 text-nowrap'>
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
                                            <tr key={row.id}>
                                                {row.getVisibleCells().map((cell, cellIndex) => (
                                                    <td key={cell.id} style={{
                                                        borderRight: "1px solid #dee2e6",
                                                        borderBottom: isLastRow ? "none" : "1px solid #dee2e6",
                                                        padding: 0,
                                                    }}>
                                                        <div className="p-2 custom-scroll" style={['reason'].includes(cell.column.id) ?
                                                            { maxHeight: '88px', overflow: 'auto' } : { overflow: 'visible', zIndex: 0 }}>
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
