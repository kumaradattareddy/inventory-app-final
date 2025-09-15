import { z } from "zod";

export const addProductSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  material: z.string().optional(),
  size: z.string().optional(),
  unit: z.string().min(1, "Unit is required."),
  opening_stock: z.coerce.number().default(0),
});

export const addPartySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  phone: z.string().optional(),
  address: z.string().optional(),
  role: z.enum(["customer", "supplier", "both", "other"]),
  opening_balance: z.coerce.number().default(0),
});

export const addStockMoveSchema = z.object({
  party_id: z.string().uuid("Please select a party."),
  product_id: z.string().uuid("Please select a product."),
  qty: z.coerce.number().gt(0, "Quantity must be greater than 0."),
  price_per_unit: z.coerce.number().gte(0, "Price cannot be negative."),
  notes: z.string().optional(),
});

export const addPaymentSchema = z.object({
  party_id: z.string().uuid("Please select a party."),
  amount: z.coerce.number().gt(0, "Amount must be greater than 0."),
  method: z.enum(["cash", "upi", "cheque"]),
  direction: z.enum(["in", "out"]),
  notes: z.string().optional(),
  instrument_ref: z.string().optional(),
});