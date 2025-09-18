import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const saleFormSchema = z.object({
  party_id: z.string().uuid("Please select a customer."),
  bill_no: z.string().optional(),
  created_at: z.string().datetime(), // UI sends ISO
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
      qty: z.coerce.number().gt(0),
      price_per_unit: z.coerce.number().gte(0),
    })
  ).min(1),
  payment: z.object({
    amount: z.coerce.number().gte(0).default(0),
    method: z.enum(["cash", "upi", "cheque"]),
    instrument_ref: z.string().optional(),
  }),
  settlement: z.object({
    party_id: z.string().uuid().optional(),
    amount: z.coerce.number().gte(0).default(0),
  }).optional(),
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = createClient();
  const body = await request.json();

  const validated = saleFormSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error.flatten() }, { status: 400 });
  }

  const { party_id, bill_no, items, payment, settlement, created_at } = validated.data;

  // Ensure ISO string for timestamptz (the schema already guarantees a valid datetime string)
  const createdAtIso =
    typeof created_at === "string" ? created_at : new Date(created_at).toISOString();

  const { data, error } = await supabase.rpc("create_new_sale_with_date", {
    bill_no_input: bill_no ?? null,
    items_json: items, // wrapper expects jsonb
    party_id_input: party_id,
    payment_amount_input: Number(payment.amount ?? 0),
    payment_method_input: payment.method,
    payment_ref_input: payment.instrument_ref ?? null,
    settlement_amount_input: Number(settlement?.amount ?? 0),
    settlement_party_id_input: settlement?.party_id ?? null,
    created_at_input: createdAtIso,
  });

  if (error) {
    console.error("Error creating quick bill sale:", error);
    // Forward the PostgREST error object if present
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ success: true, data }, { status: 200 });
}
