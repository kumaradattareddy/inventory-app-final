// File: app/products/AddProductDialog.tsx (CORRECTED)
'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { addProductSchema } from "@/lib/schemas"
import { useToast } from "@/hooks/use-toast" // CORRECTED IMPORT PATH

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const createProduct = async (values: z.infer<typeof addProductSchema>) => {
    const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
    })
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error.message || 'Failed to create product');
    }
    return res.json()
}

export default function AddProductDialog() {
    const [open, setOpen] = useState(false)
    const queryClient = useQueryClient()
    const { toast } = useToast() // CORRECTED HOOK USAGE

    const form = useForm<z.infer<typeof addProductSchema>>({
        resolver: zodResolver(addProductSchema),
        defaultValues: { name: "", material: "", size: "", unit: "", opening_stock: 0 },
    })

    const mutation = useMutation({
        mutationFn: createProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
            toast({ title: "Success!", description: "New product has been added." })
            setOpen(false)
            form.reset()
        },
        onError: (error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        }
    })

    function onSubmit(values: z.infer<typeof addProductSchema>) {
        mutation.mutate(values)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button>Add New Product</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                    <DialogDescription>Fill in the details for the new product.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="material" render={({ field }) => ( <FormItem><FormLabel>Material</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="size" render={({ field }) => ( <FormItem><FormLabel>Size</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="unit" render={({ field }) => ( <FormItem><FormLabel>Unit</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? "Saving..." : "Save Product"}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}