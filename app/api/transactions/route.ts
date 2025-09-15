// File: app/api/transactions/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  
  // This is simple because our database VIEW does all the hard work of joining the tables
  const { data, error } = await supabase
    .from('payments_with_links')
    .select('*')
    .order('created_at', { ascending: false }); // Show newest first
    
  if (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data);
}