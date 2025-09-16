'use client'

import * as React from "react"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { useToast } from "@/hooks/use-toast"
import { Party } from "@/app/parties/columns"
import { Product } from "@/app/products/columns"
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Toaster } from "@/components/ui/toaster"
import { CreatableCombobox } from "@/components/ui/CreatableCombobox"
import { SearchableCombobox } from "@/components/ui/SearchableCombobox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

const saleFormSchema = z.object({
    party_id: z.string().uuid("Please select a customer."),
    bill_no: z.string().optional(),
    created_at: z.date(),
    items: z.array(z.object({
        product_id: z.string().uuid("Please select a product."),
        qty: z.coerce.number().gt(0, "Qty > 0"),
        price_per_unit: z.coerce.number().gte(0, "Price >= 0"),
    })).min(1, "Please add at least one item."),
    payment: z.object({
        method: z.enum(["cash", "upi", "cheque"]),
        amount: z.coerce.number().gte(0).default(0),
        instrument_ref: z.string().optional(),
    }),
    settlement: z.object({
        party_id: z.string().uuid("Please select a recipient.").optional(),
        amount: z.coerce.number().gte(0).default(0),
    }).optional(),
}).refine(data => !data.settlement || (data.settlement.amount || 0) <= data.payment.amount, {
    message: "Settlement amount cannot exceed Amount Paid Now.",
    path: ["settlement", "amount"],
});
type SaleFormValues = z.infer<typeof saleFormSchema>;

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
const createQuickBill = async (values: SaleFormValues) => {
    const res = await fetch('/api/sales/quick-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error.message || 'Failed to create sale');
    }
    return res.json();
}

export default function SalesPage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { data: parties } = useQuery({ queryKey: ['parties'], queryFn: getParties });
    const { data: products } = useQuery({ queryKey: ['products'], queryFn: getProducts });
    
    const form = useForm<SaleFormValues>({
        resolver: zodResolver(saleFormSchema),
        defaultValues: {
            created_at: new Date(),
            items: [{ product_id: "", qty: 1, price_per_unit: 0 }],
            payment: { amount: 0, method: "cash" }
        },
    });
    
    const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
    const watchedItems = useWatch({ control: form.control, name: "items" });
    const watchedPartyId = useWatch({ control: form.control, name: "party_id" });
    const watchedPaymentAmount = useWatch({ control: form.control, name: "payment.amount" });
    const subtotal = React.useMemo(() => watchedItems.reduce((acc, item) => acc + ((item.qty || 0) * (item.price_per_unit || 0)), 0), [watchedItems]);
    const partyDetails = React.useMemo(() => parties?.find(p => p.id === watchedPartyId), [parties, watchedPartyId]);
    const currentBalance = partyDetails?.balance || 0;
    const finalBalance = subtotal + currentBalance - (watchedPaymentAmount || 0);

    const mainMutation = useMutation({
        mutationFn: createQuickBill,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['parties'] });
            toast({ title: "Success!", description: "Sale and any settlement recorded successfully." });
            form.reset();
        },
        onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" })
    });

    const customerCreateMutation = useMutation({
        mutationFn: (name: string) => fetch('/api/parties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, role: 'customer' }),
        }).then(res => res.json()),
        onSuccess: (newParty: Party) => {
            toast({ title: "Success!", description: `Customer "${newParty.name}" created.` });
            queryClient.setQueryData(['parties'], (oldData: Party[] | undefined) => {
                const enhancedNewParty = { ...newParty, total_purchases: 0, total_sales: 0, balance: newParty.opening_balance };
                return oldData ? [...oldData, enhancedNewParty] : [enhancedNewParty];
            });
            form.setValue('party_id', newParty.id);
        },
        onError: (error) => toast({ title: "Error", description: `Failed to create customer: ${error.message}`, variant: "destructive" })
    });
    
    const settlementPartyCreateMutation = useMutation({
        mutationFn: (name: string) => fetch('/api/parties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, role: 'other' }),
        }).then(res => res.json()),
        onSuccess: (newParty: Party) => {
            toast({ title: "Success!", description: `Recipient "${newParty.name}" created.` });
            queryClient.setQueryData(['parties'], (oldData: Party[] | undefined) => {
                const enhancedNewParty = { ...newParty, total_purchases: 0, total_sales: 0, balance: newParty.opening_balance };
                return oldData ? [...oldData, enhancedNewParty] : [enhancedNewParty];
            });
            form.setValue('settlement.party_id', newParty.id);
        },
        onError: (error) => toast({ title: "Error", description: `Failed to create recipient: ${error.message}`, variant: "destructive" })
    });

    const onSubmit = (values: SaleFormValues) => {
        mainMutation.mutate(values);
    };
    
    const customerOptions = parties?.filter(p => p.role === 'customer' || p.role === 'both').map(p => ({ value: p.id, label: p.name })) || [];
    const settlementPartyOptions = parties?.filter(p => p.id !== watchedPartyId).map(p => ({ value: p.id, label: p.name })) || [];
    const productOptions = products?.map(p => ({ value: p.id, label: `${p.name} (${p.size || 'N/A'})` })) || [];

    return (
        <div className="container mx-auto py-2">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <h1 className="text-3xl font-bold">Sales Entry</h1>
                    <Card><CardHeader><CardTitle>Customer & Bill Details</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <FormField control={form.control} name="party_id" render={({ field }) => ( <FormItem><FormLabel>Customer Name *</FormLabel><CreatableCombobox options={customerOptions} onCreate={(name) => customerCreateMutation.mutate(name)} {...field} placeholder="Type or select a customer..." /><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="bill_no" render={({ field }) => ( <FormItem><FormLabel>Bill / Invoice No</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="created_at" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Bill Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button></FormControl></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                </Popover>
                            <FormMessage /></FormItem>
                        )} />
                        <div className="space-y-2">
                            <FormLabel>Customer's Current Balance</FormLabel>
                            <Input readOnly value={`${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Math.abs(currentBalance))} ${currentBalance < 0 ? 'Cr (Credit)' : 'Dr (Debit)'}`} className="font-medium bg-muted" />
                        </div>
                    </CardContent></Card>
                    <Card><CardHeader><CardTitle>Items</CardTitle></CardHeader><CardContent className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                                <div className="col-span-full md:col-span-5"><FormField control={form.control} name={`items.${index}.product_id`} render={({ field }) => (<FormItem><FormLabel className={index > 0 ? 'sr-only' : ''}>Product</FormLabel><SearchableCombobox options={productOptions} {...field} placeholder="Select product..." /><FormMessage /></FormItem>)} /></div>
                                <div className="col-span-4 md:col-span-2"><FormField control={form.control} name={`items.${index}.qty`} render={({ field }) => (<FormItem><FormLabel className={index > 0 ? 'sr-only' : ''}>Qty</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
                                <div className="col-span-4 md:col-span-2"><FormField control={form.control} name={`items.${index}.price_per_unit`} render={({ field }) => (<FormItem><FormLabel className={index > 0 ? 'sr-only' : ''}>Rate</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
                                <div className="col-span-3 md:col-span-2"><FormLabel className={index > 0 ? 'sr-only' : ''}>Amount</FormLabel><Input readOnly value={((watchedItems[index]?.qty || 0) * (watchedItems[index]?.price_per_unit || 0)).toFixed(2)} className="font-semibold" /></div>
                                <div className="col-span-1 flex items-end h-full pt-8"><Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button></div>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ product_id: "", qty: 1, price_per_unit: 0 })}><PlusCircle className="mr-2 h-4 w-4" /> Add Row</Button>
                    </CardContent></Card>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle>Payment & Settlement</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name="payment.amount" render={({ field }) => ( <FormItem><FormLabel>Amount Paid Now</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name="payment.method" render={({ field }) => ( <FormItem><FormLabel>Method</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl> <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="cheque">Cheque</SelectItem></SelectContent> </Select> <FormMessage /></FormItem> )}/>
                                    <FormField control={form.control} name="payment.instrument_ref" render={({ field }) => ( <FormItem><FormLabel>Payment Reference</FormLabel><FormControl><Input placeholder="e.g., UPI ID, Cheque No." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                    {watchedPaymentAmount > 0 && (<div className="space-y-4 border-t pt-4">
                                        <h3 className="text-sm font-medium">Settle This Payment (Optional)</h3>
                                        <FormField control={form.control} name="settlement.party_id" render={({ field }) => (<FormItem><FormLabel>Recipient Name</FormLabel><CreatableCombobox options={settlementPartyOptions} onCreate={(name) => settlementPartyCreateMutation.mutate(name)} {...field} placeholder="Type or select a recipient..." /><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="settlement.amount" render={({ field }) => (<FormItem><FormLabel>Amount to Settle</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                    </div>)}
                                </CardContent>
                            </Card>
                        </div>
                        <Card>
                            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between"><span>Subtotal</span><span>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(subtotal)}</span></div>
                                <div className="flex justify-between"><span>Current Balance</span><span>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(currentBalance)}</span></div>
                                <div className="flex justify-between font-semibold border-t pt-2 mt-2"><span>Total Due Before Payment</span><span>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(subtotal + currentBalance)}</span></div>
                                <div className="flex justify-between text-green-600"><span>Amount Paid Now</span><span>-{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(watchedPaymentAmount || 0)}</span></div>
                                <div className="flex justify-between text-base font-bold border-t pt-2 mt-2"><span>Final Balance Due</span><span>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(finalBalance)}</span></div>
                            </CardContent>
                        </Card>
                    </div>
                    <Button size="lg" type="submit" disabled={mainMutation.isPending}>
                        {mainMutation.isPending ? "Saving..." : "Save Sale"}
                    </Button>
                </form>
            </Form>
            <Toaster />
        </div>
    )
}