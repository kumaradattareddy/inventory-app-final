// File: app/api/parties/route.ts (FINAL VERSION)
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { addPartySchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

// GET now correctly calls our powerful database function
export async function GET(request: Request) {
  const supabase = createClient();
  const { data, error } = await supabase
    .rpc('get_parties_with_totals')
    .order('name');
    
  if (error) {
    console.error("Error fetching parties with totals:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// POST correctly finds or creates a party with all details
export async function POST(request: Request) {
    const supabase = createClient();
    const body = await request.json();
    
    const validated = addPartySchema.safeParse(body);
    if (!validated.success) {
        return NextResponse.json({ error: validated.error.flatten() }, { status: 400 });
    }

    const { name, role, opening_balance, phone, address } = validated.data;

    let { data: existingParty } = await supabase.from('parties').select('*').eq('name', name).maybeSingle();

    if (existingParty) {
        return NextResponse.json(existingParty);
    } else {
        const { data: newParty, error: insertError } = await supabase
            .from('parties')
            .insert({ name, role, opening_balance, phone, address })
            .select()
            .single();

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }
        return NextResponse.json(newParty);
    }
}