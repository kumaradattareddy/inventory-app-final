'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { addPartySchema } from "@/lib/schemas"
import { useToast } from "@/hooks/use-toast"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const createParty = async (values: z.infer<typeof addPartySchema>) => {
    const res = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
    })
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error.message || 'Failed to create party');
    }
    return res.json()
}

export default function AddPartyDialog() {
    const [open, setOpen] = useState(false)
    const queryClient = useQueryClient()
    const { toast } = useToast()
    
    const form = useForm<z.infer<typeof addPartySchema>>({
        resolver: zodResolver(addPartySchema),
        defaultValues: { name: "", phone: "", address: "", role: "customer", opening_balance: 0 },
    })

    const mutation = useMutation({
        mutationFn: createParty,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['parties'] })
            toast({ title: "Success!", description: "New party has been added." })
            setOpen(false)
            form.reset()
        },
        onError: (error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        }
    })

    function onSubmit(values: z.infer<typeof addPartySchema>) {
        mutation.mutate(values)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button>Add New Party</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Party</DialogTitle>
                    <DialogDescription>Add a new customer, supplier, or other party.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Party Name</FormLabel><FormControl><Input placeholder="e.g., Suresh Kumar" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="role" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="customer">Customer</SelectItem>
                                        <SelectItem value="supplier">Supplier</SelectItem>
                                        <SelectItem value="both">Both</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? "Saving..." : "Save Party"}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}