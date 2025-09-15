"use client"

import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"

export type Party = {
  id: string
  name: string
  role: string
  phone: string | null
  total_purchases: number
  total_sales: number
}

export const columns: ColumnDef<Party>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <Link href={`/parties/${row.original.id}`} className="font-medium text-primary hover:underline">
        {row.getValue("name")}
      </Link>
    )
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
        const role = row.getValue("role") as string;
        return <div>{role.charAt(0).toUpperCase() + role.slice(1)}</div>
    }
  },
  {
    accessorKey: "total_purchases",
    header: ({ column }) => (
        <div className="text-right">
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                Total Purchases <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        </div>
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total_purchases"))
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(amount)

      return <div className="text-right font-medium">{formatted}</div>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="text-right">
        <Link href={`/parties/${row.original.id}`}>
            <Button variant="outline" size="sm">View Details</Button>
        </Link>
      </div>
    )
  }
]