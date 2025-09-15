import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET() {
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

export async function POST(request: Request) {
    const supabase = createClient();
    const body = await request.json();
    
    const inputSchema = z.object({
        name: z.string().min(2),
        role: z.enum(["customer", "supplier", "both", "other"]).default("customer"),
    });

    const validated = inputSchema.safeParse(body);
    if (!validated.success) {
        return NextResponse.json({ error: validated.error.flatten() }, { status: 400 });
    }

    const { name, role } = validated.data;

    let { data: existingParty } = await supabase.from('parties').select('*').eq('name', name).maybeSingle();

    if (existingParty) {
        return NextResponse.json(existingParty);
    } else {
        const { data: newParty, error: insertError } = await supabase
            .from('parties')
            .insert({ name, role })
            .select()
            .single();

        if (insertError) {
            console.error("Error creating party:", insertError);
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }
        return NextResponse.json(newParty);
    }
}