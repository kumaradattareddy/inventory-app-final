'use client'

import { useQuery } from "@tanstack/react-query"
import { columns, Party } from "./columns"
import { DataTable } from "@/components/ui/data-table"
import AddPartyDialog from "./AddPartyDialog"
import { Toaster } from "@/components/ui/toaster"

async function getParties(): Promise<Party[]> {
    const res = await fetch('/api/parties')
    if (!res.ok) {
      throw new Error('Failed to fetch parties')
    }
    return res.json()
}

export default function PartiesPage() {
  const { data, isLoading, isError, error } = useQuery({
      queryKey: ['parties'],
      queryFn: getParties
  })

  if (isLoading) return <div>Loading parties...</div>
  if (isError) return <div>Error: {error.message}</div>

  return (
    <div className="container mx-auto py-2">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Parties</h1>
        <AddPartyDialog />
      </div>
      <DataTable columns={columns} data={data || []} />
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-sm font-medium text-muted-foreground">
          Total Parties: {data?.length || 0}
        </div>
      </div>
      <Toaster />
    </div>
  )
}