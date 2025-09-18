import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createAdminClient();
  try {
    const { 
      supplier_identifier, is_new_supplier, bill_no, items, payment 
    } = await request.json();

    if (!supplier_identifier || !items || items.length === 0) {
      return NextResponse.json({ error: 'Supplier and at least one item are required.' }, { status: 400 });
    }

    let supplierId;

    if (is_new_supplier) {
      const { data, error } = await supabase.from('suppliers').insert({ name: supplier_identifier }).select('id').single();
      if (error) throw new Error(`Failed to create new supplier: ${error.message}`);
      supplierId = data.id;
    } else {
      supplierId = parseInt(supplier_identifier, 10);
    }

    for (const item of items) {
      let productId;
      if (item.is_new_product) {
        const { data, error } = await supabase.from('products').insert({ 
          name: item.product_identifier, 
          // Assuming size and material might be part of the new product name, or can be added here
          opening_stock: '0' 
        }).select('id').single();
        if (error) throw new Error(`Failed to create new product "${item.product_identifier}": ${error.message}`);
        productId = data.id;
      } else {
        productId = parseInt(item.product_identifier, 10);
      }

      const { error: moveError } = await supabase.from('stock_moves').insert({
        kind: 'purchase', 
        supplier_id: supplierId, 
        product_id: productId,
        qty: item.qty, 
        price_per_unit: item.price_per_unit, 
        ts: new Date().toISOString(), 
        notes: bill_no // Correctly saving bill_no to the 'notes' field
      });
      if (moveError) throw new Error(`Failed to record stock move for product ID ${productId}: ${moveError.message}`);
    }

    if (payment && payment.amount > 0) {
      const { error: paymentError } = await supabase.from('payments').insert({
        supplier_id: supplierId, 
        amount: payment.amount, 
        method: payment.method,
        instrument_ref: payment.instrument_ref, 
        direction: 'out', 
        ts: new Date().toISOString()
      });
      if (paymentError) throw new Error(`Purchase saved, but payment failed: ${paymentError.message}`);
    }

    return NextResponse.json({ message: 'Purchase saved successfully!' });

  } catch (error: any) {
    console.error('API Purchases Error:', error.message);
    return NextResponse.json({ error: `Server error: ${error.message}` }, { status: 500 });
  }
}