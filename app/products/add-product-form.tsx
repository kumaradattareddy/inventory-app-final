"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddProductForm() {
  const [name, setName] = useState('');
  const [material, setMaterial] = useState('');
  const [size, setSize] = useState('');
  const [unit, setUnit] = useState('box');
  const [openingStock, setOpeningStock] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || openingStock === '') {
      alert('Product Name and Opening Stock are required.');
      return;
    }
    setLoading(true);
    
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        material,
        size,
        unit,
        opening_stock: openingStock.toString(),
      }),
    });

    if (response.ok) {
      alert('Product added successfully!');
      setName('');
      setMaterial('');
      setSize('');
      setOpeningStock('');
      router.refresh();
    } else {
      const { error } = await response.json();
      alert(`Failed to add product: ${error}`);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Add New Product</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Product Name*</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Material</label>
            <input value={material} onChange={e => setMaterial(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Size</label>
            <input value={size} onChange={e => setSize(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Unit</label>
            <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full px-3 py-2 border rounded-md">
              <option value="box">Box</option>
              <option value="piece">Piece</option>
              <option value="sqft">Sq. Ft.</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Opening Stock*</label>
            <input type="number" value={openingStock} onChange={e => setOpeningStock(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-3 py-2 border rounded-md" required />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="px-6 py-2 text-white bg-black rounded-md hover:bg-gray-800 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
    </div>
  );
}