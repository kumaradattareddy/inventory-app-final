import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------------------- GET: suppliers with totals ----------------------
export async function GET() {
  try {
    const { data, error } = await supabase.rpc("get_parties_with_totals");

    if (error) {
      console.error("Error fetching suppliers with totals:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ---------------------- POST: create new supplier ----------------------
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, address, opening_balance } = body;

    if (!name) {
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        name,
        phone: phone || null,
        address: address || null,
        opening_balance: opening_balance || 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
