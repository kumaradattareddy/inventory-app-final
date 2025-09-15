// File: app/transactions/columns.tsx
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { ArrowRight } from "lucide-react"

export type Transaction = {
  id: string
  created_at: string
  party_name: string
  direction: 'in' | 'out'
  method: string
  amount: number
  settled_amount: number | null
  target_party_name: string | null
  notes: string | null
}

export const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "created_at",
    header: "Date",
    cell: ({ row }) => <div className="min-w-[100px]">{format(new Date(row.original.created_at), 'dd MMM, yyyy')}</div>
  },
  {
    accessorKey: "party_name",
    header: "Party",
  },
  {
    accessorKey: "direction",
    header: "Direction",
    cell: ({ row }) => {
        const is_in = row.original.direction === 'in'
        return <span className={`font-bold ${is_in ? 'text-green-600' : 'text-red-600'}`}>{is_in ? 'IN' : 'OUT'}</span>
    }
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(row.original.amount)
  },
  {
    accessorKey: "notes",
    header: "Notes / Reference",
  },
  {
    id: "settlement",
    header: "Settlement Details",
    cell: ({ row }) => {
        const { settled_amount, target_party_name } = row.original;
        if (!settled_amount || !target_party_name) {
            return <span className="text-muted-foreground">--</span>
        }
        return (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <ArrowRight className="h-4 w-4" />
                <span>
                    {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(settled_amount)} to <strong>{target_party_name}</strong>
                </span>
            </div>
        )
    }
  },
]