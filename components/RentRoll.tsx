'use client';

import { Row, Col } from "react-bootstrap";
import Actions from "@/components/Actions";
import { useState, useEffect, useMemo } from "react";
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
import { RentRollType } from "@/types/components";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

const isInvalid = (row: RentRollType, col: string) =>
  (row.invalid_columns ?? []).includes(col);

const displayDate = (v: any) => {
  if (!v) return "-";
  if (typeof v !== "string") return String(v);

  const dmy = dayjs(v, "DD-MM-YYYY", true);
  if (dmy.isValid()) return dmy.format("DD-MM-YYYY");

  return v;
};

const asValidDate = (v: any): Date | null => {
  if (v instanceof Date && !isNaN(v.getTime())) return v;

  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;

  const dmy = dayjs(s, "DD-MM-YYYY", true);
  if (dmy.isValid()) {
    const [day, month, year] = s.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const ymd = dayjs(s, "YYYY-MM-DD", true);
  if (ymd.isValid()) {
    const [year, month, day] = s.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return null;
};

function calculateOccupancyRates(
  rentData: RentRollType[],
  range: { start: Date; end: Date }
): PieSeriesType<PieValueType> {
  const { start: periodStart, end: periodEnd } = range;
  const totalTime = periodEnd.getTime() - periodStart.getTime();

  if (totalTime <= 0 || rentData.length === 0) {
    return {
      type: "pie",
      data: [{ id: 0, value: 1, label: "", color: "#ccc" }],
      innerRadius: 0,
      outerRadius: 75,
      valueFormatter: () => "",
    };
  }

  let totalLeased = 0;
  let validUnits = 0;

  for (const unit of rentData) {
    const start = asValidDate(unit.lease_start);
    if (!start) continue;

    const end = unit.lease_end ? asValidDate(unit.lease_end) : null;

    validUnits++;

    const effectiveEnd = end ?? start;
    if (effectiveEnd.getTime() <= start.getTime()) {
      continue;
    }

    const leaseStart = start < periodStart ? periodStart : start;
    const leaseEnd = effectiveEnd < periodEnd ? effectiveEnd : periodEnd;

    totalLeased += Math.max(0, leaseEnd.getTime() - leaseStart.getTime());
  }


  if (validUnits === 0) {
    return {
      type: "pie",
      data: [{ id: 0, value: 1, label: "", color: "#ccc" }],
      innerRadius: 0,
      outerRadius: 75,
      valueFormatter: () => "",
    };
  }

  const occupancyPercent = (totalLeased / (totalTime * validUnits)) * 100;
  const vacantPercent = Math.max(0, 100 - occupancyPercent);

  const slices: PieValueType[] = [];
  if (occupancyPercent > 0) slices.push({ id: 0, value: occupancyPercent, label: "Occupied" });
  if (vacantPercent > 0) slices.push({ id: 1, value: vacantPercent, label: "Vacant" });

  if (slices.length === 0) slices.push({ id: 0, value: 1, label: "", color: "#ccc" });

  return {
    type: "pie",
    data: slices,
    innerRadius: 0,
    outerRadius: 75,
    valueFormatter: ({ value }) => `${Math.round(value)}%`,
  };
}

const toastSettings = {
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
};

const columns = ["Property", "Unit", "Tenant", "Start", "End", "Sqft", "Rent"];
const columnDefs: ColumnDef<RentRollType, any>[] = [
  {
    accessorKey: "property",
    header: "Property",
    sortDescFirst: true,
    cell: (info: CellContext<RentRollType, any>) => {
      const row = info.row.original;
      const invalid = isInvalid(row, "property");

      return (
        <div className="d-flex align-items-center gap-2">
          <span>{info.getValue() ?? "-"}</span>
          {invalid && (
            <OverlayTrigger overlay={<Tooltip>Invalid Value</Tooltip>}>
              <FaExclamationTriangle style={{ color: "#f0ad4e" }} />
            </OverlayTrigger>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "unit",
    header: "Unit",
    sortDescFirst: true,
    cell: (info: CellContext<RentRollType, any>) => {
      const row = info.row.original;
      const invalid = isInvalid(row, "unit");

      return (
        <div className="d-flex align-items-center gap-2">
          <span>{info.getValue() ?? "-"}</span>
          {invalid && (
            <OverlayTrigger overlay={<Tooltip>Invalid Value</Tooltip>}>
              <FaExclamationTriangle style={{ color: "#f0ad4e" }} />
            </OverlayTrigger>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "tenant",
    header: "Tenant",
    sortDescFirst: true,
    cell: (info: CellContext<RentRollType, any>) => {
      const row = info.row.original;
      const invalid = isInvalid(row, "tenant");

      return (
        <div className="d-flex align-items-center gap-2">
          <span>{info.getValue() ?? "-"}</span>
          {invalid && (
            <OverlayTrigger overlay={<Tooltip>Invalid Value</Tooltip>}>
              <FaExclamationTriangle style={{ color: "#f0ad4e" }} />
            </OverlayTrigger>
          )}
        </div>
      );
    },
  },
  {
    id: "lease_start",
    header: "Start",
    sortDescFirst: true,
    accessorFn: (row: RentRollType) => {
      const d = asValidDate(row.lease_start);
      return d ? d.getTime() : undefined;
    },
    sortUndefined: "last",
    cell: (info: CellContext<RentRollType, any>) => {
      const row = info.row.original;
      const invalid = isInvalid(row, "lease_start");

      return (
        <div className="d-flex align-items-center gap-2">
          <span>{row.lease_start ? displayDate(row.lease_start) : "-"}</span>
          {invalid && (
            <OverlayTrigger overlay={<Tooltip>Invalid Value</Tooltip>}>
              <FaExclamationTriangle style={{ color: "#f0ad4e" }} />
            </OverlayTrigger>
          )}
        </div>
      );
    },
  },
  {
    id: "lease_end",
    header: "End",
    sortDescFirst: true,
    accessorFn: (row: RentRollType) => {
      const d = asValidDate(row.lease_end);
      return d ? d.getTime() : undefined;
    },
    sortUndefined: "last",
    cell: (info: CellContext<RentRollType, any>) => {
      const row = info.row.original;
      const invalid = isInvalid(row, "lease_end");

      return (
        <div className="d-flex align-items-center gap-2">
          <span>{row.lease_end ? displayDate(row.lease_end) : "-"}</span>
          {invalid && (
            <OverlayTrigger overlay={<Tooltip>Invalid Value</Tooltip>}>
              <FaExclamationTriangle style={{ color: "#f0ad4e" }} />
            </OverlayTrigger>
          )}
        </div>
      );
    },
  }
  ,
  {
    accessorKey: "sqft",
    header: "Sqft",
    sortDescFirst: true,
    cell: (info: CellContext<RentRollType, any>) => {
      const row = info.row.original;
      const invalid = isInvalid(row, "sqft");

      return (
        <div className="d-flex align-items-center gap-2">
          <span>{info.getValue() ?? "-"}</span>
          {invalid && (
            <OverlayTrigger overlay={<Tooltip>Invalid Value</Tooltip>}>
              <FaExclamationTriangle style={{ color: "#f0ad4e" }} />
            </OverlayTrigger>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "monthly_payment",
    header: "Rent",
    sortDescFirst: true,
    cell: (info: CellContext<RentRollType, any>) => {
      const row = info.row.original;
      const invalid = isInvalid(row, "monthly_payment");

      return (
        <div className="d-flex align-items-center gap-2">
          <span>{info.getValue() ?? "-"}</span>
          {invalid && (
            <OverlayTrigger overlay={<Tooltip>Invalid Value</Tooltip>}>
              <FaExclamationTriangle style={{ color: "#f0ad4e" }} />
            </OverlayTrigger>
          )}
        </div>
      );
    },
  },
];

export default function RentRoll({ rentRoll }: { rentRoll: RentRollType[] }) {
  const [rentRollData, setRentRollData] = useState<RentRollType[]>(rentRoll);
  const [filteredData, setFilteredData] = useState<RentRollType[]>(rentRoll);
  const [occupancyRates, setOccupancyRates] = useState<PieSeriesType[] | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: "lease_end", desc: true }]);
  const [tableRange, setTableRange] = useState<{ start: Date; end: Date }>({
    start: dayjs().subtract(5, "year").toDate(),
    end: new Date(),
  });

  const [occRange, setOccRange] = useState<{ start: Date; end: Date }>({
    start: dayjs().subtract(1, "year").toDate(),
    end: new Date(),
  });

  const [showRangeModal, setShowRangeModal] = useState(false);
  const [showOccRangeModal, setShowOccRangeModal] = useState(false);

  const organizations = useMemo(() => {
    return Array.from(
      new Set(rentRollData.map(l => l.property).filter(Boolean))
    );
  }, [rentRollData]);

  const getRentRollData = async () => {
    const response = await fetch("/api/rent_roll", { method: "GET" });
    const { result, error } = await response.json();

    if (result) {
      setRentRollData(result ?? []);
    } else if (error) {
      toast.error(`Error loading rent roll data`, toastSettings);
    }
  };

  useEffect(() => {
    const tableData = rentRollData.filter((unit) => {
      if (selectedCompany && unit.property !== selectedCompany) return false;

      if (!unit.lease_start) return true;

      const start = asValidDate(unit.lease_start);

      if (!start) return true;

      const end = unit.lease_end ? asValidDate(unit.lease_end) : null;
      if (unit.lease_end && !end) return true;

      const effectiveEnd = end ?? new Date();

      return start <= tableRange.end && effectiveEnd >= tableRange.start;
    });

    setFilteredData(tableData);

    const occData = tableData.filter(unit => {
      if (selectedCompany && unit.property !== selectedCompany) return false;
      return !!unit.lease_start;
    });

    const pieSeries = calculateOccupancyRates(occData, occRange);
    setOccupancyRates([pieSeries]);
  }, [rentRollData, selectedCompany, tableRange, occRange]);


  useEffect(() => {
    getRentRollData();
  }, [rentRoll]);

  function formatRangeLabel(start: Date, end: Date) {
    return `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })} - ${end.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    })}`;
  }
  const rangeLabel = formatRangeLabel(tableRange.start, tableRange.end);
  const occRangeLabel = formatRangeLabel(occRange.start, occRange.end);

  const table = useReactTable({
    data: filteredData,
    columns: columnDefs,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className='d-flex flex-col gap-3'>
      <Row className='justify-content-between'>
        <Col xs md={4}>
          <Form.Group>
            <Form.Label className='mb-1'>Property</Form.Label>
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
        <Col xs='auto' className='d-flex align-items-end'>
          <Dropdown>
            <Dropdown.Toggle variant="outline-secondary" className="w-100 text-start">
              {rangeLabel}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {[1, 2, 3, 4, 5].map(years => (
                <Dropdown.Item
                  key={years}
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setFullYear(end.getFullYear() - years);
                    setTableRange({ start, end });
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
                    defaultValue={tableRange.start.toISOString().slice(0, 10)}
                    className="form-control"
                  />
                  <span>→</span>
                  <input
                    type="date"
                    name="end"
                    defaultValue={tableRange.end.toISOString().slice(0, 10)}
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
                  setTableRange({ start, end });
                  setShowRangeModal(false);
                }}
              >
                Apply
              </Button>
            </Modal.Footer>
          </Modal>
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
                    <td colSpan={columns.length + 1} className='border-bottom-0 text-center'>
                      No rent roll data
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
        <Col xs='auto'>
          <div className='d-flex flex-column border rounded text-center px-3 pt-3 pb-1'>
            <div className='text-nowrap text-2xl font-semibold'>Occupancy Rate</div>
            <div className="d-flex justify-content-center pt-3">
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" size="sm" className="text-start">
                  {occRangeLabel}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {[1, 2, 3, 4, 5].map((years) => (
                    <Dropdown.Item
                      key={years}
                      onClick={() => {
                        const end = new Date();
                        const start = new Date();
                        start.setFullYear(end.getFullYear() - years);
                        setOccRange({ start, end });
                      }}
                    >
                      Last {years} Year{years > 1 && "s"}
                    </Dropdown.Item>
                  ))}
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={() => setShowOccRangeModal(true)}>
                    Custom…
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              <Modal
                show={showOccRangeModal}
                onHide={() => setShowOccRangeModal(false)}
                centered
              >
                <Modal.Header closeButton>
                  <Modal.Title>Select Occupancy Range</Modal.Title>
                </Modal.Header>

                <Modal.Body>
                  <form id="occ-range-form">
                    <div className="d-flex gap-3 align-items-center">
                      <input
                        type="date"
                        name="start"
                        defaultValue={occRange.start.toISOString().slice(0, 10)}
                        className="form-control"
                      />
                      <span>→</span>
                      <input
                        type="date"
                        name="end"
                        defaultValue={occRange.end.toISOString().slice(0, 10)}
                        className="form-control"
                      />
                    </div>
                  </form>
                </Modal.Body>

                <Modal.Footer>
                  <Button variant="secondary" onClick={() => setShowOccRangeModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      const form = document.getElementById("occ-range-form") as HTMLFormElement;
                      const data = new FormData(form);

                      function parseLocalDate(value: string) {
                        const [year, month, day] = value.split("-").map(Number);
                        return new Date(year, month - 1, day);
                      }

                      const start = parseLocalDate(data.get("start") as string);
                      const end = parseLocalDate(data.get("end") as string);

                      setOccRange({ start, end });
                      setShowOccRangeModal(false);
                    }}
                  >
                    Apply
                  </Button>
                </Modal.Footer>
              </Modal>
            </div>
            <div style={{ pointerEvents: filteredData.length ? 'auto' : 'none' }}>
              {occupancyRates ?
                <PieChart
                  hideLegend={filteredData.length ? false : true}
                  series={occupancyRates ? occupancyRates : []}
                  style={{ strokeWidth: 0 }}
                  width={200}
                  height={200}
                /> :
                <div style={{ height: 200, width: 200 }} className='d-flex justify-content-center align-items-center'> <Spinner /></div>
              }
            </div>
          </div>
        </Col>
      </Row>
    </div >
  );
}
