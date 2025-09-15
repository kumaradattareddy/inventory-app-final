// File: app/api/payments/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { addPaymentSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

// POST handler to create a new payment
export async function POST(request: Request) {
    const supabase = createClient();
    const body = await request.json();
    
    // Validate the incoming payment data
    const validated = addPaymentSchema.safeParse(body);
    if (!validated.success) {
        return NextResponse.json({ error: validated.error.flatten() }, { status: 400 });
    }
    
    // Insert the new payment record
    const { data, error } = await supabase
        .from('payments')
        .insert(validated.data)
        .select()
        .single();
        
    if (error) {
        console.error("Error creating payment:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
}