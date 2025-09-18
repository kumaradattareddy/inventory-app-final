import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';

const currency = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

export default async function PartyDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const supplierId = params.id;

  const { data: supplier } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', supplierId)
    .single();

  if (!supplier) {
    notFound();
  }

  // THE FIX IS HERE: We now explicitly tell Supabase which relationship to use
  const { data: purchases } = await supabase
    .from('stock_moves')
    .select('*, products!stock_moves_product_id_fkey(name, size)') // This line is changed
    .eq('supplier_id', supplierId)
    .order('ts', { ascending: false });

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('ts', { ascending: false });

  const history = [
    ...(purchases || []).map(p => ({ ...p, type: 'Purchase', date: p.ts })),
    ...(payments || []).map(p => ({ ...p, type: 'Payment', date: p.ts }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div>
        <Link href="/parties" className="text-blue-600 hover:underline mb-4 inline-block">&larr; Back to Parties List</Link>
        <h1 className="text-3xl font-bold">{supplier.name}</h1>
        <p className="text-gray-600">{supplier.phone}</p>
        <p className="text-gray-600">{supplier.address}</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="text-xl font-semibold p-6">Transaction History</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {history.map((item: any) => (
              <tr key={`${item.type}-${item.id}`}>
                <td className="px-6 py-4">{format(new Date(item.date), 'dd MMM, yyyy')}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    item.type === 'Purchase' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {item.type}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium">
                  {item.type === 'Purchase' 
                    // This line is also updated to access the product name correctly
                    ? `${item.qty} units of ${item.products?.name || 'Product'} @ ${currency(item.price_per_unit)}`
                    : `Payment via ${item.method} ${item.instrument_ref || ''}`
                  }
                </td>
                <td className="px-6 py-4 text-right">
                  {currency(item.type === 'Purchase' ? item.qty * item.price_per_unit : item.amount)}
                </td>
              </tr>
            ))}
             {history.length === 0 && (
                <tr>
                    <td colSpan={4} className="text-center p-4 text-gray-500">
                        No transactions found for this party.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}