"use client"; // This line makes it a Client Component

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client'; // Use the client-side createClient

// Define a type for the data returned by your function
type ProductInventoryInfo = {
  id: number;
  name: string | null;
  material: string | null;
  size: string | null;
  unit: string | null;
  current_stock: number;
  supplier_name: string | null;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductInventoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(''); // State to hold the search input

  useEffect(() => {
    const supabase = createClient();
    const fetchProducts = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_products_with_details');
      if (error) {
        console.error("Error fetching product details:", error);
      } else {
        setProducts(data || []);
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  // Filter the products based on the search query
  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.material?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalProducts = filteredProducts.length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Product Inventory</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Live Stock Report</h2>
            {/* The Search Bar */}
            <input 
              type="text"
              placeholder="Search by name, material, supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 border rounded-md w-1/3"
            />
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Supplier</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current Stock</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="text-center p-4">Loading...</td></tr>
            ) : (
              filteredProducts.map((product: ProductInventoryInfo) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{product.name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{product.material || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{product.size || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{product.supplier_name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-semibold">
                    {product.current_stock} {product.unit}
                  </td>
                </tr>
              ))
            )}
            {(!loading && totalProducts === 0) && (
                <tr>
                    <td colSpan={5} className="text-center p-4 text-gray-500">
                        {searchQuery ? 'No products match your search.' : 'No inventory found.'}
                    </td>
                </tr>
            )}
          </tbody>
        </table>
        <div className="p-4 text-right font-bold text-gray-700 bg-gray-50 border-t">
          Showing: {totalProducts} Products
        </div>
      </div>
    </div>
  );
}