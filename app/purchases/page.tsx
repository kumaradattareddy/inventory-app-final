'use client'

import * as React from "react"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { useToast } from "@/hooks/use-toast"
import { Party } from "@/app/parties/columns"
import { Product } from "@/app/products/columns"
import { PlusCircle, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Toaster } from "@/components/ui/toaster"
import { CreatableCombobox } from "@/components/ui/CreatableCombobox"
import { SearchableCombobox } from "@/components/ui/SearchableCombobox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const purchaseItemSchema = z.object({
  name: z.string().min(1, "Name is required."),
  material: z.string().optional(),
  size: z.string().optional(),
  unit: z.string().min(1, "Unit is required."),
  qty: z.coerce.number().gt(0, "Qty > 0"),
  price_per_unit: z.coerce.number().gte(0, "Price >= 0"),
});
const purchaseFormSchema = z.object({
    party_id: z.string().uuid("Please select a supplier."),
    bill_no: z.string().optional(),
    items: z.array(purchaseItemSchema).min(1),
    payment: z.object({
        method: z.enum(["cash", "upi", "cheque"]),
        amount: z.coerce.number().gte(0).default(0),
        instrument_ref: z.string().optional(),
    }),
});
type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

async function getParties(): Promise<Party[]> {
    const res = await fetch('/api/parties');
    if (!res.ok) throw new Error('Failed to fetch parties');
    return res.json();
}
async function getProducts(): Promise<Product[]> {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
}
const createQuickPurchase = async (values: PurchaseFormValues) => {
    const res = await fetch('/api/purchases/quick-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error.message || 'Failed to create purchase');
    }
    return res.json();
}

export default function PurchasesPage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { data: parties } = useQuery({ queryKey: ['parties'], queryFn: getParties });
    
    const form = useForm<PurchaseFormValues>({
        resolver: zodResolver(purchaseFormSchema),
        defaultValues: { items: [{ name: "", material: "", size: "", unit: "", qty: 1, price_per_unit: 0 }], payment: { amount: 0, method: "cash" } },
    });
    
    const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
    const watchedItems = useWatch({ control: form.control, name: "items" });
    const watchedPartyId = useWatch({ control: form.control, name: "party_id" });
    const watchedPaymentAmount = useWatch({ control: form.control, name: "payment.amount" });
    const subtotal = React.useMemo(() => watchedItems.reduce((acc, item) => acc + ((item.qty || 0) * (item.price_per_unit || 0)), 0), [watchedItems]);
    const partyDetails = React.useMemo(() => parties?.find(p => p.id === watchedPartyId), [parties, watchedPartyId]);
    const openingBalance = 0;
    const finalBalance = openingBalance - subtotal + (watchedPaymentAmount || 0);

    const mainMutation = useMutation({
        mutationFn: createQuickPurchase,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['parties'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast({ title: "Success!", description: "Purchase recorded successfully." });
            form.reset();
        },
        onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" })
    });

    const supplierCreateMutation = useMutation({
        mutationFn: (name: string) => fetch('/api/parties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, role: 'supplier' }),
        }).then(res => res.json()),
        onSuccess: (newParty: Party) => {
            toast({ title: "Success!", description: `Supplier "${newParty.name}" created.` });
            queryClient.setQueryData(['parties'], (oldData: Party[] | undefined) => {
                const enhancedNewParty = { ...newParty, total_purchases: 0, total_sales: 0 };
                return oldData ? [...oldData, enhancedNewParty] : [enhancedNewParty];
            });
            form.setValue('party_id', newParty.id);
        },
        onError: (error) => toast({ title: "Error", description: `Failed to create supplier: ${error.message}`, variant: "destructive" })
    });

    const onSubmit = (values: PurchaseFormValues) => mainMutation.mutate(values);
    
    const supplierOptions = parties?.filter(p => p.role === 'supplier' || p.role === 'both').map(p => ({ value: p.id, label: p.name })) || [];

    return (
        <div className="container mx-auto py-2">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <h1 className="text-3xl font-bold">Purchase Entry</h1>
                    <Card><CardHeader><CardTitle>Supplier & Bill Details</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="md:col-span-2"><FormField control={form.control} name="party_id" render={({ field }) => ( <FormItem><FormLabel>Supplier Name *</FormLabel><CreatableCombobox options={supplierOptions} onCreate={(name) => supplierCreateMutation.mutate(name)} {...field} placeholder="Type or select a supplier..." /><FormMessage /></FormItem> )} /></div>
                        <FormField control={form.control} name="bill_no" render={({ field }) => ( <FormItem><FormLabel>Purchase Bill No</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </CardContent></Card>
                    <Card><CardHeader><CardTitle>Items</CardTitle></CardHeader><CardContent className="space-y-4">
                        <div className="hidden md:grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground"><div className="col-span-3">Product Name *</div><div className="col-span-2">Material</div><div className="col-span-2">Size</div><div className="col-span-1">Unit *</div><div className="col-span-1">Qty *</div><div className="col-span-1">Rate *</div><div className="col-span-1">Amount</div><div className="col-span-1"></div></div>
                        {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                                <div className="col-span-3"><FormField control={form.control} name={`items.${index}.name`} render={({ field }) => (<FormItem><FormControl><Input placeholder="Product Name" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
                                <div className="col-span-2"><FormField control={form.control} name={`items.${index}.material`} render={({ field }) => (<FormItem><FormControl><Input placeholder="e.g., Tiles" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
                                <div className="col-span-2"><FormField control={form.control} name={`items.${index}.size`} render={({ field }) => (<FormItem><FormControl><Input placeholder="e.g., 600x600" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
                                <div className="col-span-1"><FormField control={form.control} name={`items.${index}.unit`} render={({ field }) => (<FormItem><FormControl><Input placeholder="box" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
                                <div className="col-span-1"><FormField control={form.control} name={`items.${index}.qty`} render={({ field }) => (<FormItem><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
                                <div className="col-span-1"><FormField control={form.control} name={`items.${index}.price_per_unit`} render={({ field }) => (<FormItem><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
                                <div className="col-span-1"><Input readOnly value={((watchedItems[index]?.qty || 0) * (watchedItems[index]?.price_per_unit || 0)).toFixed(2)} className="font-semibold" /></div>
                                <div className="col-span-1"><Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button></div>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", material: "", size: "", unit: "", qty: 1, price_per_unit: 0 })}><PlusCircle className="mr-2 h-4 w-4" /> Add Row</Button>
                    </CardContent><CardContent><div className="flex justify-end text-lg font-bold"><span>Subtotal: {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(subtotal)}</span></div></CardContent></Card>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <Card>
                            <CardHeader><CardTitle>Payment to Supplier (Optional)</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <FormField control={form.control} name="payment.amount" render={({ field }) => ( <FormItem><FormLabel>Amount Paid Now</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="payment.method" render={({ field }) => ( <FormItem><FormLabel>Method</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl> <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="cheque">Cheque</SelectItem></SelectContent> </Select> <FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name="payment.instrument_ref" render={({ field }) => ( <FormItem><FormLabel>Payment Reference</FormLabel><FormControl><Input placeholder="e.g., UPI ID, Cheque No." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between"><span>Subtotal</span><span>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(subtotal)}</span></div>
                                <div className="flex justify-between"><span>Supplier's Opening Balance</span><span>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(openingBalance)}</span></div>
                                <div className="flex justify-between font-semibold border-t pt-2 mt-2"><span>Total Owed Before Payment</span><span>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(openingBalance - subtotal)}</span></div>
                                <div className="flex justify-between text-green-600"><span>Amount Paid Now</span><span>+{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(watchedPaymentAmount || 0)}</span></div>
                                <div className="flex justify-between text-base font-bold border-t pt-2 mt-2"><span>Final Balance Owed</span><span>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(finalBalance)}</span></div>
                            </CardContent>
                        </Card>
                    </div>
                    <Button size="lg" type="submit" disabled={mainMutation.isPending}>
                        {mainMutation.isPending ? "Saving..." : "Save Purchase"}
                    </Button>
                </form>
            </Form>
            <Toaster />
        </div>
    )
}