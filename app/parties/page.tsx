import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

// Define a type for the data returned by our new function
type SupplierWithTotals = {
  id: number;
  name: string | null;
  phone: string | null;
  address: string | null;
  total_purchases: number;
};

// Helper to format numbers as Indian Rupees
const currency = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);

export default async function PartiesPage() {
  const supabase = await createClient();

  // Call the new Supabase function to get suppliers with their purchase totals
  const { data: suppliers, error } = await supabase
    .rpc('get_suppliers_with_totals');

  if (error) {
    console.error("Error fetching suppliers with totals:", error.message);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Parties</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="text-xl font-semibold p-6">Suppliers List</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Purchases</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {suppliers?.map((supplier: SupplierWithTotals) => (
              <tr key={supplier.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{supplier.name || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{supplier.phone || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-medium">{currency(supplier.total_purchases)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <Link href={`/parties/${supplier.id}`}>
                    <button className="text-blue-600 hover:text-blue-800 font-semibold">View Details</button>
                  </Link>
                </td>
              </tr>
            ))}
            {(!suppliers || suppliers.length === 0) && (
                <tr>
                    <td colSpan={4} className="text-center p-4 text-gray-500">
                        No suppliers found.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}