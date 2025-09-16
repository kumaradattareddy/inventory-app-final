// File: app/payments/page.tsx (FINAL UPGRADED VERSION)
'use client'

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { addPaymentSchema, addPartySchema } from "@/lib/schemas"
import { useToast } from "@/hooks/use-toast"
import { Party } from "@/lib/types"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Toaster } from "@/components/ui/toaster"
import { CreatableCombobox } from "@/components/ui/CreatableCombobox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

async function getParties(): Promise<Party[]> {
    const res = await fetch('/api/parties');
    if (!res.ok) throw new Error('Failed to fetch parties');
    return res.json();
}

const createPayment = async (values: z.infer<typeof addPaymentSchema>) => {
    const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error.message || 'Failed to create payment');
    }
    return res.json();
}

export default function PaymentsPage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    
    const [newPartyName, setNewPartyName] = React.useState<string | null>(null);
    const [newPartyRole, setNewPartyRole] = React.useState<'customer' | 'supplier' | 'both' | 'other'>('other');
    const [newPartyBalance, setNewPartyBalance] = React.useState(0);

    const { data: parties, isLoading: isLoadingParties } = useQuery({ queryKey: ['parties'], queryFn: getParties });
    
    const form = useForm<z.infer<typeof addPaymentSchema>>({
        resolver: zodResolver(addPaymentSchema),
        defaultValues: { direction: "in", method: "cash", amount: 0, party_id: "", instrument_ref: "", notes: "" },
    });

    const mainMutation = useMutation({
        mutationFn: createPayment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['parties'] });
            toast({ title: "Success!", description: "Payment recorded successfully." });
            form.reset();
        },
        onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" })
    });

    const partyCreateMutation = useMutation({
        mutationFn: (partyData: z.infer<typeof addPartySchema>) => fetch('/api/parties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(partyData),
        }).then(res => res.json()),
        onSuccess: (newParty: Party) => {
            toast({ title: "Success!", description: `Contact "${newParty.name}" created.` });
            queryClient.setQueryData(['parties'], (oldData: Party[] | undefined) => {
                const enhancedNewParty = { ...newParty, total_purchases: 0, total_sales: 0, balance: newParty.opening_balance };
                return oldData ? [...oldData, enhancedNewParty] : [enhancedNewParty];
            });
            form.setValue('party_id', newParty.id);
            setNewPartyName(null);
        },
        onError: (error) => toast({ title: "Error", description: `Failed to create contact: ${error.message}`, variant: "destructive" })
    });
    
    const onSubmit = (values: z.infer<typeof addPaymentSchema>) => mainMutation.mutate(values);
    
    const partyOptions = parties?.map(p => ({ value: p.id, label: p.name })) || [];

    const handleCreatePartyConfirm = () => {
        if (newPartyName) {
            partyCreateMutation.mutate({ 
                name: newPartyName, 
                role: newPartyRole,
                opening_balance: newPartyBalance
            });
        }
    };

    return (
        <>
            <div className="container mx-auto py-2">
                <h1 className="text-3xl font-bold mb-6">Record Advance / Payment</h1>
                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle>Payment Details</CardTitle>
                        <CardDescription>Use this form to record any money coming in or going out.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField control={form.control} name="party_id" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Party / Contact *</FormLabel>
                                        <CreatableCombobox
                                            options={partyOptions}
                                            value={field.value}
                                            onChange={field.onChange}
                                            onCreate={(name) => setNewPartyName(name)}
                                            placeholder="Type or select a contact..."
                                            emptyMessage={isLoadingParties ? "Loading..." : "No party found."}
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="direction" render={({ field }) => (
                                        <FormItem><FormLabel>Direction *</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="in">Payment In (from Customer)</SelectItem>
                                                    <SelectItem value="out">Payment Out (to Supplier/Other)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        <FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="amount" render={({ field }) => ( <FormItem><FormLabel>Amount (₹) *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="method" render={({ field }) => ( <FormItem><FormLabel>Method</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl> <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="cheque">Cheque</SelectItem></SelectContent> </Select> <FormMessage /></FormItem> )}/>
                                    <FormField control={form.control} name="instrument_ref" render={({ field }) => ( <FormItem><FormLabel>Reference</FormLabel><FormControl><Input placeholder="e.g., UPI ID, Cheque No." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                </div>
                                <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes</FormLabel><FormControl><Input placeholder="Optional notes about the payment" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <Button type="submit" disabled={mainMutation.isPending}>
                                    {mainMutation.isPending ? "Saving Payment..." : "Save Payment"}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
                <Toaster />
            </div>

            {/* ✨ Upgraded Dialog for creating a new party with full details */}
            <Dialog open={!!newPartyName} onOpenChange={(isOpen) => !isOpen && setNewPartyName(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Contact: {newPartyName}</DialogTitle>
                        <DialogDescription>Set the role and opening balance for this new contact.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select onValueChange={(value) => setNewPartyRole(value as any)} defaultValue="other">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="customer">Customer</SelectItem>
                                    <SelectItem value="supplier">Supplier</SelectItem>
                                    <SelectItem value="both">Both</SelectItem>
                                    <SelectItem value="other">Other (e.g., worker, expense)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Opening Balance (₹)</Label>
                            <Input 
                                type="number" 
                                step="0.01" 
                                value={newPartyBalance}
                                onChange={(e) => setNewPartyBalance(parseFloat(e.target.value) || 0)} 
                            />
                            <p className="text-xs text-muted-foreground">Positive if they owe you (Debit), negative if you owe them (Credit).</p>
                        </div>
                    </div>
                     <DialogFooter>
                        <Button variant="outline" type="button" onClick={() => setNewPartyName(null)}>Cancel</Button>
                        <Button onClick={handleCreatePartyConfirm} disabled={partyCreateMutation.isPending}>
                            {partyCreateMutation.isPending ? "Creating..." : "Create Contact"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}