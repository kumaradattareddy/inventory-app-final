import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
const supabase = createServerSupabase();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { supplier_id, bill_no, items, payment } = body;

    if (!supplier_id || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Supplier and at least one item required" },
        { status: 400 }
      );
    }

    // 1. Insert purchase into stock_moves
    const stockMoveInserts = items.map((it: any) => ({
      supplier_id,
      product_id: it.product_id,
      qty: it.qty,
      price_per_unit: it.price_per_unit,
      kind: "purchase",
      notes: bill_no || null,
    }));

    const { data: moves, error: movesError } = await supabase
      .from("stock_moves")
      .insert(stockMoveInserts)
      .select();

    if (movesError) {
      return NextResponse.json(
        { error: movesError.message },
        { status: 400 }
      );
    }

    // 2. Optional payment
    let paymentRow = null;
    if (payment && payment.amount > 0) {
      const { data: pay, error: payError } = await supabase
        .from("payments")
        .insert({
          supplier_id,
          amount: payment.amount,
          method: payment.method,
          instrument_ref: payment.instrument_ref || null,
          notes: bill_no || null,
          direction: "out", // money goes to supplier
        })
        .select()
        .single();

      if (payError) {
        return NextResponse.json(
          { error: payError.message },
          { status: 400 }
        );
      }
      paymentRow = pay;
    }

    return NextResponse.json({
      success: true,
      purchases: moves,
      payment: paymentRow,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
