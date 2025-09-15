// File: app/products/page.tsx
'use client'

import { useQuery } from "@tanstack/react-query"
import { columns, Product } from "./columns"
import { DataTable } from "@/components/ui/data-table"
import AddProductDialog from "./AddProductDialog"
import { Toaster } from "@/components/ui/toaster"

// The function to fetch data from our API
async function getProducts(): Promise<Product[]> {
    const res = await fetch('/api/products')
    if (!res.ok) {
      throw new Error('Failed to fetch products')
    }
    return res.json()
}

export default function ProductsPage() {
  const { data, isLoading, isError, error } = useQuery({
      queryKey: ['products'], // This key is used for caching
      queryFn: getProducts
  })

  if (isLoading) return <div>Loading products...</div>
  if (isError) return <div>Error: {error.message}</div>

  return (
    <div className="container mx-auto py-2">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Products</h1>
        <AddProductDialog />
      </div>
      <DataTable columns={columns} data={data || []} />

      {/* ✨ NEW: Add the total product count below the table */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-sm font-medium text-muted-foreground">
          Total Products: {data?.length || 0}
        </div>
      </div>

      <Toaster />
    </div>
  )
}