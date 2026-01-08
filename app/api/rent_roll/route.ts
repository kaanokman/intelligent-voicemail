import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const StandardColumn = z.enum([
  "address",
  "property",
  "unit",
  "tenant",
  "lease_start",
  "lease_end",
  "sqft",
  "monthly_payment",
]);

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

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("No authenticated user");
      return NextResponse.json({ error: 'No authenticated user' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("rent_roll")
      .select("id, address, property, unit, tenant, lease_start, lease_end, sqft, monthly_payment")
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

type RentRollType = {
  address?: string;
  property?: string;
  unit?: string;
  tenant?: string;
  lease_start?: Date;
  lease_end?: Date;
  sqft?: number;
  monthly_payment?: number;
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (Array.isArray(body)) {
      if (body.length === 0) {
        return NextResponse.json({ error: "No CSV data provided" }, { status: 400 });
      }

      const headers = Object.keys(body[0]);

      const ai = new GoogleGenAI({});
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

      function getValue(row: Record<string, any>, key?: string | null) {
        if (!key) return null;
        if (!(key in row)) return null;
        return row[key] ?? null;
      }

      console.log(columnMapping);

      const data = (body as RentRollType[]).map(row => ({
        address: getValue(row, columnMapping.address),
        property: getValue(row, columnMapping.property),
        unit: getValue(row, columnMapping.unit),
        tenant: getValue(row, columnMapping.tenant),
        lease_start: getValue(row, columnMapping.lease_start),
        lease_end: getValue(row, columnMapping.lease_end),
        sqft: getValue(row, columnMapping.sqft),
        monthly_payment: getValue(row, columnMapping.monthly_payment),
        user_id: user.id
      }));

      const { error } = await supabase.from("rent_roll").insert(data);

      if (error) {
        console.error(error);
        return NextResponse.json({ error: "Bulk insert failed" }, { status: 400 });
      }

      return NextResponse.json({
        message: "Import successful",
      }, { status: 201 });
    }

    const rentRollData = body as RentRollType;

    const { error } = await supabase.from("rent_roll").insert({
      ...rentRollData,
      user_id: user.id
    });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Error creating rent roll data" }, { status: 400 });
    }

    return NextResponse.json({ message: "Rent roll data created" }, { status: 201 });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
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