// File: app/products/columns.tsx
"use client"

import { ColumnDef } from "@tanstack/react-table"

// This type definition must match the data from your API
export type Product = {
  id: string
  name: string
  material: string | null
  size: string | null
  unit: string
}

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "material",
    header: "Material",
  },
  {
    accessorKey: "size",
    header: "Size",
  },
  {
    accessorKey: "unit",
    header: "Unit",
  },
]