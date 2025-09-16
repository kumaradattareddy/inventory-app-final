// File: app/api/products/route.ts (UPGRADED with robust find-or-create)
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { addProductSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

// GET handler is unchanged
export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .is('archived_at', null)
    .order('name');
  if (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}


// POST handler now has smarter search logic
export async function POST(request: Request) {
  const supabase = createClient();
  const body = await request.json();
  
  const validated = addProductSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error.flatten() }, { status: 400 });
  }
  
  const { name, material, size, unit } = validated.data;

  // ✨ THIS IS THE ROBUST SEARCH LOGIC ✨
  // We build the query step-by-step to correctly handle empty/null fields
  let query = supabase
    .from('products')
    .select('id, name') // Select more fields for better debugging if needed
    .eq('name', name)
    .eq('unit', unit);

  if (material && material.trim() !== "") {
    query = query.eq('material', material);
  } else {
    query = query.is('material', null);
  }

  if (size && size.trim() !== "") {
    query = query.eq('size', size);
  } else {
    query = query.is('size', null);
  }

  let { data: existingProduct, error: findError } = await query.maybeSingle();

  if (findError) {
    console.error("Error finding product:", findError);
    return NextResponse.json({ error: "Failed to query for existing product." }, { status: 500 });
  }

  if (existingProduct) {
    // If product exists, just return it
    return NextResponse.json(existingProduct);
  } else {
    // If not found, create a new one
    const { data: newProduct, error: insertError } = await supabase
      .from('products')
      .insert(validated.data)
      .select('id, name')
      .single();

    if (insertError) {
      // This is the duplicate error you were seeing. Now it should only happen in a true race condition.
      console.error("Error creating product:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    return NextResponse.json(newProduct);
  }
}