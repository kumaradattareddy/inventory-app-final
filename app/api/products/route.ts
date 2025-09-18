import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createAdminClient();
  try {
    const { name, material, size, unit, opening_stock } = await request.json();

    if (!name || opening_stock === undefined) {
      return NextResponse.json({ error: 'Name and opening_stock are required fields.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('products')
      .insert({ name, material, size, unit, opening_stock })
      .select()
      .single();

    if (error) {
      console.error("Supabase error creating product:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Product created successfully!', product: data });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}