// File: app/api/sales/quick-bill/route.ts (CORRECTED)
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const quickBillSchema = z.object({
    party_id: z.string().uuid(),
    bill_no: z.string().optional(),
    items: z.array(z.object({
        product_id: z.string().uuid(),
        qty: z.coerce.number().gt(0),
        price_per_unit: z.coerce.number().gte(0),
    })).min(1),
    payment: z.object({
        amount: z.coerce.number().gte(0),
        method: z.enum(["cash", "upi", "cheque"]),
        instrument_ref: z.string().optional(),
    }),
    settlement: z.object({
        party_id: z.string().uuid().optional(),
        amount: z.coerce.number().gte(0),
    }).optional(),
});

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const supabase = createClient();
    const body = await request.json();

    const validated = quickBillSchema.safeParse(body);
    if (!validated.success) {
        return NextResponse.json({ error: validated.error.flatten() }, { status: 400 });
    }
    
    const { party_id, bill_no, items, payment, settlement } = validated.data;

    // ✨ This object must match the database function's 8 arguments exactly
    const rpcParams = {
        party_id_input: party_id,
        bill_no_input: bill_no,
        items: items,
        payment_amount_input: payment.amount,
        payment_method_input: payment.method,
        payment_ref_input: payment.instrument_ref, // This was the missing piece
        settlement_party_id_input: settlement?.party_id || null,
        settlement_amount_input: settlement?.amount || 0,
    };

    const { error } = await supabase.rpc('create_new_sale', rpcParams);

    if (error) {
        console.error("Error creating quick bill sale:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Sale created successfully." });
}