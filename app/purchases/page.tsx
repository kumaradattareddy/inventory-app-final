"use client";

import { useState } from "react";
import CreatableSelect from "react-select/creatable";
import AsyncSelect from "react-select/async";
import { supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";

type PurchaseItem = {
  productId: number | null;
  qty: number;
  rate: number;
  amount: number;
};

export default function PurchasesPage() {
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [billNo, setBillNo] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([
    { productId: null, qty: 1, rate: 0, amount: 0 },
  ]);
  const [amountPaid, setAmountPaid] = useState(0);
  const [method, setMethod] = useState("cash");
  const [paymentRef, setPaymentRef] = useState("");

  const [supplierOptions, setSupplierOptions] = useState<
    { value: number; label: string }[]
  >([]);

  // ---------------- Load Suppliers ----------------
  const loadSuppliers = async () => {
    const { data, error } = await supabase.from("suppliers").select("id, name");
    if (error) {
      toast.error("Failed to load suppliers");
      return [];
    }
    const options = data.map((s) => ({ value: s.id, label: s.name }));
    setSupplierOptions(options);
    return options;
  };

  // ---------------- Load Products ----------------
  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, size, unit");
    if (error) {
      toast.error("Failed to load products");
      return [];
    }
    return data.map((p) => ({
      value: p.id,
      label: `${p.name} (${p.size || ""} ${p.unit || ""})`,
    }));
  };

  // ---------------- Save Purchase ----------------
  const savePurchase = async () => {
    if (!supplierId) {
      toast.error("Please select a supplier");
      return;
    }
    if (items.length === 0 || !items.some((i) => i.productId)) {
      toast.error("Please add at least one valid product");
      return;
    }

    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: supplierId,
          bill_no: billNo,
          items: items.map((i) => ({
            product_id: i.productId,
            qty: i.qty,
            price_per_unit: i.rate,
          })),
          payment:
            amountPaid > 0
              ? {
                  method,
                  amount: amountPaid,
                  instrument_ref: paymentRef || null,
                }
              : null,
        }),
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Failed to save purchase");

      toast.success("Purchase saved successfully");
      setSupplierId(null);
      setBillNo("");
      setItems([{ productId: null, qty: 1, rate: 0, amount: 0 }]);
      setAmountPaid(0);
      setPaymentRef("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // ---------------- Render ----------------
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Purchase Entry</h1>

      {/* Supplier Section */}
      <div className="mb-4">
        <label className="block font-semibold mb-2">Supplier Name *</label>
        <CreatableSelect
          cacheOptions
          defaultOptions
          loadOptions={loadSuppliers}
          value={
            supplierId
              ? {
                  value: supplierId,
                  label:
                    supplierOptions.find((s) => s.value === supplierId)
                      ?.label || "",
                }
              : null
          }
          onChange={(val: any) => setSupplierId(val?.value || null)}
          onCreateOption={async (inputValue) => {
            if (!inputValue.trim()) {
              toast.error("Supplier name cannot be empty");
              return;
            }
            const { data, error } = await supabase
              .from("suppliers")
              .insert([{ name: inputValue.trim() }])
              .select();
            if (error || !data || data.length === 0) {
              toast.error("Failed to create supplier");
              return;
            }
            const supplier = data[0];
            toast.success(`Supplier "${supplier.name}" created.`);
            setSupplierId(supplier.id);
            setSupplierOptions((prev) => [
              ...prev,
              { value: supplier.id, label: supplier.name },
            ]);
          }}
        />
      </div>

      {/* Bill No */}
      <div className="mb-6">
        <label className="block font-semibold mb-2">Purchase Bill No</label>
        <input
          type="text"
          value={billNo}
          onChange={(e) => setBillNo(e.target.value)}
          className="border rounded px-3 py-2 w-full"
          placeholder="Optional"
        />
      </div>

      {/* Items Section */}
      <h2 className="font-semibold mb-2">Items</h2>
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-2 mb-2">
          <div className="flex-1">
            <AsyncSelect
              cacheOptions
              defaultOptions
              loadOptions={loadProducts}
              onChange={(val: any) => {
                const updated = [...items];
                updated[idx].productId = val?.value || null;
                setItems(updated);
              }}
            />
          </div>
          <input
            type="number"
            value={item.qty}
            min={1}
            onChange={(e) => {
              const qty = parseFloat(e.target.value) || 0;
              const updated = [...items];
              updated[idx].qty = qty;
              updated[idx].amount = qty * updated[idx].rate;
              setItems(updated);
            }}
            className="w-20 border rounded px-2"
          />
          <input
            type="number"
            value={item.rate}
            min={0}
            onChange={(e) => {
              const rate = parseFloat(e.target.value) || 0;
              const updated = [...items];
              updated[idx].rate = rate;
              updated[idx].amount = rate * updated[idx].qty;
              setItems(updated);
            }}
            className="w-24 border rounded px-2"
          />
          <input
            type="number"
            value={item.amount}
            readOnly
            className="w-24 border rounded px-2 bg-gray-100"
          />
          <button
            type="button"
            className="bg-red-500 text-white px-2 rounded"
            onClick={() => setItems(items.filter((_, i) => i !== idx))}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setItems([...items, { productId: null, qty: 1, rate: 0, amount: 0 }])
        }
        className="bg-blue-500 text-white px-3 py-1 rounded"
      >
        + Add Row
      </button>

      {/* Payment Section */}
      <div className="mt-6">
        <h2 className="font-semibold mb-2">Payment to Supplier (Optional)</h2>
        <input
          type="number"
          value={amountPaid}
          onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
          className="border rounded px-3 py-2 w-full mb-2"
          placeholder="Amount Paid Now"
        />
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="border rounded px-3 py-2 w-full mb-2"
        >
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
          <option value="upi">UPI</option>
          <option value="cheque">Cheque</option>
        </select>
        <input
          type="text"
          value={paymentRef}
          onChange={(e) => setPaymentRef(e.target.value)}
          className="border rounded px-3 py-2 w-full"
          placeholder="e.g., UPI ID, Cheque No."
        />
      </div>

      {/* Save Button */}
      <div className="mt-6">
        <button
          onClick={savePurchase}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Save Purchase
        </button>
      </div>
    </div>
  );
}
