import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const ColumnMappingSchema = z.object({
    address: z.string().nullable(),
    property: z.string().nullable(),
    unit: z.string().nullable(),
    tenant: z.string().nullable(),
    lease_start: z.string().nullable(),
    lease_end: z.string().nullable(),
    sqft: z.string().nullable(),
    monthly_payment: z.string().nullable(),
});

type VoicemailType = {
    address?: string;
    property?: string;
    unit?: string;
    tenant?: string;
    lease_start?: string;
    lease_end?: string;
    sqft?: number;
    monthly_payment?: number;
    invalid_columns?: string[];
};

const parseValue = (
    row: Record<string, any>,
    sourceKey: string | null | undefined,
    targetCol: string,
    invalidColumns: string[]
) => {
    if (!sourceKey) return null;
    if (!(sourceKey in row)) return null;
    const raw = row[sourceKey];
    if (raw === null || raw === undefined || String(raw).trim() === "") return null;
    if (targetCol === "lease_start" || targetCol === "lease_end") {
        const res = parseDate(raw);
        if (res.invalid) invalidColumns.push(targetCol);
        return res.value;
    }
    return raw;
};

const toDateOrRaw = (value: any): Date | string | null => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value !== "string") return value;
    const d = dayjs(value, "DD-MM-YYYY", true);
    if (!d.isValid()) {
        return value;
    }
    const [day, month, year] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
};

const dateFormats = [
    "YYYY-MM-DD",
    "MM-DD-YYYY",
    "DD-MM-YYYY",
    "MM/DD/YYYY",
    "DD/MM/YYYY",
    "YYYY/MM/DD",
    "MMM DD, YYYY",
    "DD MMM YYYY",
    "YYYYMMDD",
    "MMDDYYYY",
];

type DateParseResult = { value: string | null; invalid: boolean };

const parseDate = (input: any): DateParseResult => {
    if (input === null || input === undefined || String(input).trim() === "") {
        return { value: null, invalid: false };
    }
    const raw = String(input).trim();
    for (const fmt of dateFormats) {
        const d = dayjs(raw, fmt, true);
        if (d.isValid()) {
            return { value: d.format("DD-MM-YYYY"), invalid: false };
        }
    }
    return { value: raw, invalid: true };
};

export async function GET() {
    try {
        // Check for authenticated user
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error("No authenticated user");
            return NextResponse.json({ error: 'No authenticated user' }, { status: 401 });
        }
        // Make request to supabase
        const { data, error } = await supabase
            .from("rent_roll")
            .select("id, address, property, unit, tenant, lease_start, lease_end, sqft, monthly_payment, invalid_columns")
            .eq("user_id", user.id)
            .order("id", { ascending: true });
        if (error) {
            console.error("Error getting rent roll data", error.message);
            return NextResponse.json({ error: "Error getting rent roll data" }, { status: 400 });
        }
        return NextResponse.json({ result: data }, { status: 201 });
    } catch (error: any) {
        if (error instanceof Error) {
            console.error("Error getting rent roll data", error.message);
            return NextResponse.json({ error: "Error getting rent roll data" }, { status: 500 });
        } else {
            console.error("Unknown error getting rent roll data", error);
            return NextResponse.json({ error: "Unknown error getting rent roll data" }, { status: 500 });
        }
    }
}

export async function POST(req: Request) {
    try {
        // Check for authenticated user
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await req.json();
        // If data from file upload
        if (Array.isArray(body)) {
            if (body.length === 0) {
                return NextResponse.json({ error: "No CSV data provided" }, { status: 400 });
            }
            const headers = Object.keys(body[0]);
            const ai = new GoogleGenAI({});
            // Map raw columns to desired columns with Gemini
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `
          Given the following raw CSV column headers, produce a JSON object mapping each
          raw column name to the appropriate standardized column name.

          ${headers}
        
          Only return valid JSON that matches the provided schema. If an appropriate header does not exist
          in the CSV headres that matches the desired schema, use null. 
          `,
                config: {
                    responseMimeType: "application/json",
                    responseJsonSchema: zodToJsonSchema(ColumnMappingSchema),
                },
            });
            const columnMapping = response?.text ? ColumnMappingSchema.parse(JSON.parse(response.text)) : null;
            if (!columnMapping) {
                console.error('Incorrect mapping supplied by Gemini: ', response.text);
                return NextResponse.json({ error: "Incorrect mapping supplied by Gemini" }, { status: 500 });
            }
            const data = (body as VoicemailType[]).map((row) => {
                const invalidColumns: string[] = [];
                return {
                    address: parseValue(row, columnMapping.address, "address", invalidColumns),
                    property: parseValue(row, columnMapping.property, "property", invalidColumns),
                    unit: parseValue(row, columnMapping.unit, "unit", invalidColumns),
                    tenant: parseValue(row, columnMapping.tenant, "tenant", invalidColumns),
                    lease_start: parseValue(row, columnMapping.lease_start, "lease_start", invalidColumns),
                    lease_end: parseValue(row, columnMapping.lease_end, "lease_end", invalidColumns),
                    sqft: parseValue(row, columnMapping.sqft, "sqft", invalidColumns),
                    monthly_payment: parseValue(row, columnMapping.monthly_payment, "monthly_payment", invalidColumns),
                    user_id: user.id,
                    invalid_columns: invalidColumns,
                };
            });
            // Make request to supabase
            const { error } = await supabase.from("rent_roll").insert(data);
            if (error) {
                console.error(error);
                return NextResponse.json({ error: "Bulk insert failed" }, { status: 400 });
            }
            return NextResponse.json({
                message: "Import successful",
            }, { status: 201 });
            // If single entity
        } else {
            const rentRollData = body as VoicemailType;
            // Make request to supabase
            const { error } = await supabase.from("rent_roll").insert({
                ...rentRollData,
                user_id: user.id
            });
            if (error) {
                console.error(error);
                return NextResponse.json({ error: "Error creating rent roll data" }, { status: 400 });
            }
            return NextResponse.json({ message: "Rent roll data created" }, { status: 201 });
        }
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        // Check for authenticated user
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const body = await req.json();
        if (!user) {
            console.error("No authenticated user");
            return NextResponse.json({ error: 'No authenticated user' }, { status: 401 });
        }
        const { id, ...updateData } = body;
        if (!id) {
            console.error("No rent roll data ID provided");
            return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });
        }
        // Ensure the user can only update their own item
        const { data, error } = await supabase
            .from("rent_roll")
            .update(updateData)
            .eq("user_id", user.id)
            .eq("id", id);
        if (error) {
            console.error("Error updating new rent roll data", error.message);
            return NextResponse.json({ error: "Error updating new rent roll data" }, { status: 400 });
        }
        return NextResponse.json({ message: "updated", data }, { status: 200 });
    } catch (error: any) {
        if (error instanceof Error) {
            console.error("Error updating rent roll data", error.message);
            return NextResponse.json({ error: "Error updating rent roll data" }, { status: 500 });
        } else {
            console.error("Unknown error updating rent roll data", error);
            return NextResponse.json({ error: "Unknown error updating rent roll data" }, { status: 500 });
        }
    }
}

export async function DELETE(req: Request) {
    // Check for authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const body = await req.json();
    if (!user) {
        return NextResponse.json({ error: 'No authenticated user' }, { status: 401 });
    }
    const { id } = body;
    if (!id) {
        return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });
    }
    // Ensure the user can only delete their own item
    const { data, error } = await supabase
        .from("rent_roll")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "deleted", data }, { status: 200 });
}