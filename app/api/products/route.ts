import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { addProductSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

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

// POST handler is a "find or create" function
export async function POST(request: Request) {
  const supabase = createClient();
  const body = await request.json();
  
  const validated = addProductSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error.flatten() }, { status: 400 });
  }
  
  const { name, material, size, unit } = validated.data;

  // 1. Try to find an existing product with the same unique attributes
  let { data: existingProduct } = await supabase
    .from('products')
    .select('id')
    .eq('name', name)
    .eq('unit', unit)
    // Handle cases where material or size might be null or empty strings
    .is('material', material || null) 
    .is('size', size || null)
    .maybeSingle();

  if (existingProduct) {
    // If product exists, just return it
    return NextResponse.json(existingProduct);
  } else {
    // 2. If not found, create a new one
    const { data: newProduct, error: insertError } = await supabase
      .from('products')
      .insert(validated.data)
      .select('id')
      .single();

    if (insertError) {
      console.error("Error creating product:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    return NextResponse.json(newProduct);
  }
}