import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";


export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("No authenticated user");
      return NextResponse.json({ error: 'No authenticated user' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("leads")
      .select("id, organization, firstName, lastName, title, employees, rank")
      .eq("user_id", user.id)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error getting leads", error.message);
      return NextResponse.json({ error: "Error getting leads" }, { status: 400 });
    }
    return NextResponse.json({ result: data }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Error) {
      console.error("Error getting leads", error.message);
      return NextResponse.json({ error: "Error getting leads" }, { status: 500 });
    } else {
      console.error("Unknown error getting leads", error);
      return NextResponse.json({ error: "Unknown error getting leads" }, { status: 500 });
    }
  }
}

// export async function POST(req: Request) {
//   try {
//     const supabase = await createClient();
//     const { data: { user } } = await supabase.auth.getUser();
//     const body = await req.json();

//     if (!user) {
//       console.error("No authenticated user");
//       return NextResponse.json({ error: 'No authenticated user' }, { status: 401 });
//     }

//     const { error } = await supabase
//       .from("leads")
//       .insert({ ...body, user_id: user.id });

//     if (error) {
//       console.error("Error creating new lead", error.message);
//       return NextResponse.json({ error: "Error creating new lead" }, { status: 400 });
//     }
//     return NextResponse.json({ message: "success" }, { status: 201 });
//   } catch (error: any) {
//     if (error instanceof Error) {
//       console.error("Error creating lead", error.message);
//       return NextResponse.json({ error: "Error creating lead" }, { status: 500 });
//     } else {
//       console.error("Unknown error creating lead", error);
//       return NextResponse.json({ error: "Unknown error creating lead" }, { status: 500 });
//     }
//   }
// }

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Expecting: array of CSV rows
    const rows = await req.json();

    console.log(rows)

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    // Transform CSV → DB schema
    const leads = rows.map(row => ({
      organization: row.account_name?.trim() ?? null,
      firstName: row.lead_first_name?.trim() ?? null,
      lastName: row.lead_last_name?.trim() ?? null,
      title: row.lead_job_title?.trim() ?? null,
      employees: row.account_employee_range ?? null,
      user_id: user.id
    }));

    const { error } = await supabase
      .from("leads")
      .insert(leads);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Insert failed" }, { status: 400 });
    }

    return NextResponse.json({
      message: "Import successful",
      inserted: leads.length
    }, { status: 201 });

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
      console.error("No lead ID provided");
      return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });
    }

    // Ensure the user can only update their own item
    const { data, error } = await supabase
      .from("leads")
      .update(updateData)
      .eq("user_id", user.id)
      .eq("id", id);

    if (error) {
      console.error("Error updating new lead", error.message);
      return NextResponse.json({ error: "Error updating new lead" }, { status: 400 });
    }
    return NextResponse.json({ message: "updated", data }, { status: 200 });
  } catch (error: any) {
    if (error instanceof Error) {
      console.error("Error updating lead", error.message);
      return NextResponse.json({ error: "Error updating lead" }, { status: 500 });
    } else {
      console.error("Unknown error updating lead", error);
      return NextResponse.json({ error: "Unknown error updating lead" }, { status: 500 });
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
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ message: "deleted", data }, { status: 200 });
}