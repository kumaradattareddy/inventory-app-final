"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CreatableSelect from "react-select/creatable";
import { PlusCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CreatableSelectComponent = CreatableSelect as any;

type SelectOption = { value: string; label: string; __isNew__?: boolean };
type ItemRow = {
  id: number;
  material: string;
  size: string;
  product: SelectOption | null;
  unit: string;
  qty: number;
  rate: number | "";
};

export default function PurchasesPage() {
  const supabase = createClient();
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<SelectOption[]>([]);
  const [products, setProducts] = useState<SelectOption[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<SelectOption | null>(
    null
  );
  const [billNo, setBillNo] = useState("");
  const [items, setItems] = useState<ItemRow[]>([
    {
      id: Date.now(),
      material: "Tiles",
      size: "",
      product: null,
      unit: "box",
      qty: 1,
      rate: "",
    },
  ]);
  const [loading, setLoading] = useState(false);

  // Load suppliers & products
  useEffect(() => {
    const fetchData = async () => {
      const { data: suppliersData } = await supabase
        .from("suppliers")
        .select("id, name");
      if (suppliersData) {
        setSuppliers(
          suppliersData.map((s) => ({
            value: s.id.toString(),
            label: s.name,
          }))
        );
      }

      const { data: productsData } = await supabase
        .from("products")
        .select("id, name, size, material, unit");
      if (productsData) {
        setProducts(
          productsData.map((p) => ({
            value: p.id.toString(),
            label: `${p.name} (${p.size || "N/A"})`,
          }))
        );
      }
    };
    fetchData();
  }, [supabase]);

  // Handlers
  const addRow = () => {
    setItems([
      ...items,
      {
        id: Date.now(),
        material: "Tiles",
        size: "",
        product: null,
        unit: "box",
        qty: 1,
        rate: "",
      },
    ]);
  };

  const removeRow = (id: number) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: number, field: keyof ItemRow, value: any) => {
    setItems(
      items.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const subtotal = items.reduce(
    (sum, i) => sum + i.qty * (Number(i.rate) || 0),
    0
  );

  // Save
  const savePurchase = async () => {
    if (!selectedSupplier) {
      alert("⚠️ Please select a supplier");
      return;
    }
    setLoading(true);

    try {
      // ✅ Handle supplier
      let supplierId = selectedSupplier.value;
      if (selectedSupplier.__isNew__) {
        const { data, error } = await supabase
          .from("suppliers")
          .insert([{ name: selectedSupplier.label }])
          .select("id")
          .single();
        if (error) throw error;
        supplierId = data.id;
      }

      // ✅ Handle products
      const finalItems = [];
      for (const i of items) {
        let productId = i.product?.value;
        if (i.product?.__isNew__) {
          const { data, error } = await supabase
            .from("products")
            .insert([
              {
                name: i.product.label,
                size: i.size,
                material: i.material,
                unit: i.unit,
              },
            ])
            .select("id")
            .single();
          if (error) throw error;
          productId = data.id;
        }
        finalItems.push({
          product_id: productId,
          qty: i.qty,
          rate: Number(i.rate) || 0,
          unit: i.unit,
          size: i.size,
          material: i.material,
        });
      }

      // ✅ Insert into stock_moves
      const { error: purchaseError } = await supabase
        .from("stock_moves")
        .insert([
          {
            supplier_id: supplierId,
            bill_no: billNo || null,
            items: finalItems,
          },
        ]);

      if (purchaseError) throw purchaseError;

      alert("✅ Purchase saved successfully!");
      router.push("/products");
    } catch (err: any) {
      alert("❌ Save failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Supplier & Bill</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <Label>Supplier *</Label>
            <CreatableSelectComponent
              options={suppliers}
              value={selectedSupplier}
              onChange={setSelectedSupplier}
              placeholder="Type or select a supplier..."
            />
          </div>
          <div>
            <Label>Bill / Invoice No</Label>
            <Input
              value={billNo}
              onChange={(e) => setBillNo(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-12 gap-3 items-center"
            >
              <div className="col-span-2">
                <Select
                  value={item.material}
                  onValueChange={(val) =>
                    updateItem(item.id, "material", val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Material" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tiles">Tiles</SelectItem>
                    <SelectItem value="Granite">Granite</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Input
                  placeholder="e.g., 600x600"
                  value={item.size}
                  onChange={(e) =>
                    updateItem(item.id, "size", e.target.value)
                  }
                />
              </div>
              <div className="col-span-3">
                <CreatableSelectComponent
                  options={products}
                  value={item.product}
                  onChange={(val: any) =>
                    updateItem(item.id, "product", val)
                  }
                  placeholder="Select or add product"
                />
              </div>
              <div className="col-span-1">
                <Select
                  value={item.unit}
                  onValueChange={(val) => updateItem(item.id, "unit", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="sq_ft">Sq Ft</SelectItem>
                    <SelectItem value="liters">Liters</SelectItem>
                    <SelectItem value="bags">Bags</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1">
                <Input
                  type="number"
                  value={item.qty}
                  onChange={(e) =>
                    updateItem(item.id, "qty", Number(e.target.value))
                  }
                />
              </div>
              <div className="col-span-1">
                <Input
                  type="number"
                  value={item.rate}
                  onChange={(e) =>
                    updateItem(
                      item.id,
                      "rate",
                      e.target.value === ""
                        ? ""
                        : Number(e.target.value)
                    )
                  }
                />
              </div>
              <div className="col-span-1 text-right font-semibold">
                ₹{item.qty * (Number(item.rate) || 0)}
              </div>
              <div className="col-span-1">
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => removeRow(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addRow}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Row
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="text-lg font-semibold flex justify-between">
          <span>Subtotal</span>
          <span>₹{subtotal}</span>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={savePurchase} disabled={loading}>
          {loading ? "Saving..." : "Save Purchase"}
        </Button>
      </div>
    </div>
  );
}
