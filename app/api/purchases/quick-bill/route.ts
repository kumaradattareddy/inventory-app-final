// File: app/api/purchases/quick-bill/route.ts (CORRECTED)
import { createClient } from '@/lib/supabase/server';
// ✨ FIX: Import NextRequest from next/server
import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { addProductSchema } from '@/lib/schemas';

const purchaseItemSchema = z.object({
  name: z.string().min(1),
  material: z.string().optional(),
  size: z.string().optional(),
  unit: z.string().min(1),
  qty: z.coerce.number().gt(0),
  price_per_unit: z.coerce.number().gte(0),
});

const quickPurchaseSchema = z.object({
    party_id: z.string().uuid(),
    bill_no: z.string().optional(),
    items: z.array(purchaseItemSchema).min(1),
});
export const dynamic = 'force-dynamic';

// ✨ FIX: Use the NextRequest type for the 'request' parameter
export async function POST(request: NextRequest) {
    const supabase = createClient();
    const body = await request.json();

    const validated = quickPurchaseSchema.safeParse(body);
    if (!validated.success) {
        return NextResponse.json({ error: validated.error.flatten() }, { status: 400 });
    }
    
    const { party_id, bill_no, items } = validated.data;

    try {
        const resolvedItems = await Promise.all(items.map(async (item) => {
            const productPayload = {
                name: item.name,
                material: item.material,
                size: item.size,
                unit: item.unit
            };

            // Now this line will work correctly
            const productRes = await fetch(`${request.nextUrl.origin}/api/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productPayload),
            });

            if (!productRes.ok) {
                throw new Error(`Failed to find or create product: ${item.name}`);
            }
            const { id: product_id } = await productRes.json();

            return {
                product_id,
                qty: item.qty,
                price_per_unit: item.price_per_unit
            };
        }));

        const { error: rpcError } = await supabase.rpc('create_new_purchase', {
            party_id_input: party_id,
            bill_no_input: bill_no,
            items: resolvedItems,
            payment_amount_input: 0, 
            payment_method_input: 'cash',
            payment_ref_input: '',
        });

        if (rpcError) throw rpcError;

        return NextResponse.json({ success: true, message: "Purchase created successfully." });

    } catch (error: any) {
        console.error("Error in purchase creation process:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}