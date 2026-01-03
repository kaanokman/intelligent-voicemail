import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const rankingSchema = z.array(z.number().int());

type LeadType = {
  id: number;
  organization: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  employees?: "2-10" | "11-50" | "51-200" | "201-1000" | "1001-5000" | "5001-10000" | "10001+";
  rank?: number;
};

const rankMap = {
  "2-10": {
    "Founder / Co-Founder": 1,
    "CEO / President": 2,
    "Owner / Co-Owner": 3,
    "Managing Director": 4,
    "Head of Sales": 5,
  },
  "11-50": {
    "Founder / Co-Founder": 1,
    "CEO / President": 2,
    "Owner / Co-Owner": 3,
    "Managing Director": 4,
    "Head of Sales": 5,
  },
  "51-200": {
    "VP of Sales": 1,
    "Head of Sales": 2,
    "Sales Director": 3,
    "Director of Sales Development": 4,
    "CRO (Chief Revenue Officer)": 5,
    "Head of Revenue Operations": 6,
    "VP of Growth": 7,
  },
  "201-1000": {
    "VP of Sales Development": 1,
    "VP of Sales": 2,
    "Head of Sales Development": 3,
    "Director of Sales Development": 4,
    "CRO (Chief Revenue Officer)": 5,
    "VP of Revenue Operations": 6,
    "VP of GTM": 7,
  },
  "1001-5000": {
    "VP of Sales Development": 1,
    "VP of Sales": 2,
    "Head of Sales Development": 3,
    "Director of Sales Development": 4,
    "CRO (Chief Revenue Officer)": 5,
    "VP of Revenue Operations": 6,
    "VP of GTM": 7,
  },
  "5001-10000": {
    "VP of Sales Development": 1,
    "VP of Sales": 2,
    "Head of Sales Development": 3,
    "Director of Sales Development": 4,
    "CRO (Chief Revenue Officer)": 5,
    "VP of Revenue Operations": 6,
    "VP of GTM": 7,
  },
  "10001+": {
    "VP of Sales Development": 1,
    "VP of Inside Sales": 2,
    "Head of Sales Development": 3,
    "CRO (Chief Revenue Officer)": 4,
    "VP of Revenue Operations": 5,
    "Director of Sales Development": 6,
    "VP of Field Sales": 7,
  }
}

function rankById<T extends { id: number }>(
  data: T[],
  ranking: number[]
): T[] {
  const map = new Map(data.map(item => [item.id, item]));
  const used = new Set<number>();
  const result: T[] = [];

  // Add ranked items first
  for (const id of ranking) {
    const item = map.get(id);
    if (item) {
      result.push(item);
      used.add(id);
    }
  }

  // // Add unranked items
  // for (const item of data) {
  //   if (!used.has(item.id)) {
  //     result.push(item);
  //   }
  // }

  return result;
}

function parseGeminiJSON(output: any) {
  const match = output?.match(/```json\s*([\s\S]*?)\s*```/i);
  if (!match) throw new Error("No JSON found in Gemini output");

  return JSON.parse(match[1]);
}


export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const body: LeadType[] = await req.json();

    if (!user) {
      console.error("No authenticated user");
      return NextResponse.json({ error: 'No authenticated user' }, { status: 401 });
    }

    if (!body) {
      console.error("No request body");
      return NextResponse.json({ error: 'No request body' }, { status: 400 });
    }

    const leadWithEmployeeCount = body.find(lead => lead.employees);

    if (leadWithEmployeeCount?.employees) {

      const prompt = `
        Please rank the following leads:

        ${JSON.stringify(body, null, 2)}

        Use the following ranking of titles to help with ranking the leads:

        ${JSON.stringify(rankMap[leadWithEmployeeCount.employees], null, 2)}

        Where 1 represents the highest rank, and the highest number represents the lowest rank.

        If a lead's position does not represent one of these titles, do not include them in the rankings.
        The title does not have to exactly match, but should be more or less the same thing.

        Example: "Head of Sales" and "VP of Sales" are interchangeable

        Return ONLY an JSON of an array of lead id's where the order of the items in the array represents the ranking of the leads.

        Do not return anything else.

        Example:
        [3, 4, 8, 2]

        This example would represent the lead's with ids 3, 4, 8, and 2 ranked in that order.      
      `;

      console.log(prompt)

      const ai = new GoogleGenAI({});
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: zodToJsonSchema(rankingSchema),
        },
      });

      const ranking = response?.text ? rankingSchema.parse(JSON.parse(response.text)) : null;

      if (ranking?.length) {
        const ranked = rankById(body, ranking);
        await Promise.all(ranked.map(async (lead, idx) => {
          const rank = idx + 1;
          const { data, error } = await supabase
            .from("leads")
            .update({ ...lead, rank })
            .eq("user_id", user.id)
            .eq("id", lead.id);
          if (error) {
            console.warn(`Error updating rank of lead ${lead.id}: `, error.message);
          }
        }));
        return NextResponse.json({ message: "success" }, { status: 201 });
      } else if (ranking) {
        return NextResponse.json({ message: "warning" }, { status: 201 });
      } else {
        console.error("No response from Gemini");
        return NextResponse.json({ error: 'No response from Gemini' }, { status: 500 });
      }


    } else {
      console.error("No lead with employee count");
      return NextResponse.json({ error: 'No lead with employee count' }, { status: 400 });
    }


    // return NextResponse.json({ result: body }, { status: 201 });

    // const { error } = await supabase
    //   .from("leads")
    //   .insert({ ...body, user_id: user.id });

    // if (error) {
    //   console.error("Error creating new lead", error.message);
    //   return NextResponse.json({ error: "Error creating new lead" }, { status: 400 });
    // }
    // return NextResponse.json({ message: "success" }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Error) {
      console.error("Error ranking leads", error.message);
      return NextResponse.json({ error: "Error ranking leads" }, { status: 500 });
    } else {
      console.error("Unknown error creating lead", error);
      return NextResponse.json({ error: "Unknown error ranking leads" }, { status: 500 });
    }
  }
}
