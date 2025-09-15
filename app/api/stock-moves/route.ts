// Update the import path below to the correct location of your Supabase client
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { addStockMoveSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const supabase = createClient();
    const body = await request.json();
    
    const { kind, ...rest } = body;
    if (kind !== 'sale' && kind !== 'purchase') {
        return NextResponse.json({ error: "Invalid transaction kind" }, { status: 400 });
    }

    const validated = addStockMoveSchema.safeParse(rest);
    if (!validated.success) return NextResponse.json({ error: validated.error.flatten() }, { status: 400 });
    
    const payload = {
        ...validated.data,
        kind,
        qty: kind === 'sale' ? -Math.abs(validated.data.qty) : Math.abs(validated.data.qty),
    };
    
    const { data, error } = await supabase.from('stock_moves').insert(payload).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}