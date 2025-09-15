// File: app/transactions/page.tsx
'use client'

import { useQuery } from "@tanstack/react-query"
import { columns, Transaction } from "./columns"
import { DataTable } from "@/components/ui/data-table"

async function getTransactions(): Promise<Transaction[]> {
    const res = await fetch('/api/transactions')
    if (!res.ok) {
      throw new Error('Failed to fetch transactions')
    }
    return res.json()
}

export default function TransactionsPage() {
  const { data, isLoading, isError, error } = useQuery({
      queryKey: ['transactions'],
      queryFn: getTransactions
  })

  if (isLoading) return <div>Loading transactions...</div>
  if (isError) return <div>Error: {error.message}</div>

  return (
    <div className="container mx-auto py-2">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Transactions Ledger</h1>
      </div>
      <DataTable columns={columns} data={data || []} />
       <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-sm font-medium text-muted-foreground">
          Total Transactions: {data?.length || 0}
        </div>
      </div>
    </div>
  )
}