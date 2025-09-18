'use client'

import * as React from "react"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import { useToast } from "@/hooks/use-toast"
import { PlusCircle, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Toaster } from "@/components/ui/toaster"
import { CreatableCombobox } from "@/components/ui/CreatableCombobox"
import { SearchableCombobox } from "@/components/ui/SearchableCombobox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// ---------------------- Validation ----------------------
const purchaseItemSchema = z.object({
  product_id: z.coerce.number().int(),
  qty: z.coerce.number().gt(0, "Qty > 0"),
  price_per_unit: z.coerce.number().gte(0, "Price >= 0"),
});

const purchaseFormSchema = z.object({
  supplier_id: z.coerce.number().int(),
  bill_no: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1),
  payment: z.object({
    method: z.enum(["cash", "upi", "cheque"]).optional(),
    amount: z.coerce.number().gte(0).default(0),
    instrument_ref: z.string().optional(),
  }).optional(),
});
type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

// ---------------------- API ----------------------
async function getSuppliers() {
  const res = await fetch('/api/parties');
  if (!res.ok) throw new Error('Failed to fetch suppliers');
  return res.json();
}
async function getProducts() {
  const res = await fetch('/api/products');
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}
const createPurchase = async (values: PurchaseFormValues) => {
  const res = await fetch('/api/purchases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to create purchase');
  }
  return res.json();
};

// ---------------------- Component ----------------------
export default function PurchasesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: getProducts });

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      items: [{ product_id: 0, qty: 1, price_per_unit: 0 }],
      payment: { amount: 0, method: "cash" },
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const watchedItems = useWatch({ control: form.control, name: "items" });
  const watchedSupplierId = useWatch({ control: form.control, name: "supplier_id" });
  const watchedPaymentAmount = useWatch({ control: form.control, name: "payment.amount" });

  const subtotal = React.useMemo(
    () => watchedItems.reduce((acc, item) => acc + ((item.qty || 0) * (item.price_per_unit || 0)), 0),
    [watchedItems]
  );
  const openingBalance = 0;
  const finalBalance = openingBalance - subtotal + (watchedPaymentAmount || 0);

  // ---------------------- Mutations ----------------------
  const mainMutation = useMutation({
    mutationFn: createPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: "Success!", description: "Purchase recorded successfully." });
      form.reset();
    },
    onError: (error: any) =>
      toast({ title: "Error", description: error.message, variant: "destructive" })
  });

  const supplierCreateMutation = useMutation({
    mutationFn: (name: string) => fetch('/api/parties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(res => res.json()),
    onSuccess: (newSupplier) => {
      toast({ title: "Success!", description: `Supplier "${newSupplier.name}" created.` });
      queryClient.setQueryData(['suppliers'], (oldData: any[] | undefined) =>
        oldData ? [...oldData, newSupplier] : [newSupplier]
      );
      form.setValue('supplier_id', newSupplier.id);
    },
  });

  const onSubmit = (values: PurchaseFormValues) => mainMutation.mutate(values);

  const supplierOptions = suppliers?.map((s: any) => ({ value: String(s.id), label: s.name })) || [];
  const productOptions = products?.map((p: any) => ({
    value: String(p.id),
    label: `${p.name} (${p.size || ""} ${p.unit || ""})`,
  })) || [];

  // ---------------------- Render ----------------------
  return (
    <div className="container mx-auto py-2">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <h1 className="text-3xl font-bold">Purchase Entry</h1>

          {/* Supplier + Bill */}
          <Card>
            <CardHeader><CardTitle>Supplier & Bill Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2">
                <FormField control={form.control} name="supplier_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier Name *</FormLabel>
                    <CreatableCombobox
                      options={supplierOptions}
                      onCreate={(name) => supplierCreateMutation.mutate(name)}
                      {...field}
                      value={field.value !== undefined ? String(field.value) : ""}
                      placeholder="Type or select a supplier..."
                    />
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="bill_no" render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Bill No</FormLabel>
                  <FormControl><Input placeholder="Optional" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader><CardTitle>Items</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="hidden md:grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground">
                <div className="col-span-4">Product *</div>
                <div className="col-span-2">Qty *</div>
                <div className="col-span-2">Rate *</div>
                <div className="col-span-2">Amount</div>
                <div className="col-span-2"></div>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4">
                    <FormField control={form.control} name={`items.${index}.product_id`} render={({ field }) => (
                      <FormItem>
                        <SearchableCombobox
                          options={productOptions}
                          {...field}
                          value={field.value !== undefined ? String(field.value) : ""}
                          placeholder="Select a product"
                        />
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="col-span-2">
                    <FormField control={form.control} name={`items.${index}.qty`} render={({ field }) => (
                      <FormItem><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="col-span-2">
                    <FormField control={form.control} name={`items.${index}.price_per_unit`} render={({ field }) => (
                      <FormItem><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="col-span-2">
                    <Input readOnly value={((watchedItems[index]?.qty || 0) * (watchedItems[index]?.price_per_unit || 0)).toFixed(2)} className="font-semibold" />
                  </div>
                  <div className="col-span-2">
                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" size="sm"
                onClick={() => append({ product_id: 0, qty: 1, price_per_unit: 0 })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Row
              </Button>
            </CardContent>
            <CardContent>
              <div className="flex justify-end text-lg font-bold">
                <span>Subtotal: {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(subtotal)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment + Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <Card>
              <CardHeader><CardTitle>Payment to Supplier (Optional)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="payment.amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Paid Now</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="payment.method" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="payment.instrument_ref" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Reference</FormLabel>
                    <FormControl><Input placeholder="e.g., UPI ID, Cheque No." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
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
