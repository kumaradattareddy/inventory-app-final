// File: lib/types.ts
export type Party = {
  id: string;
  name: string;
  role: 'customer' | 'supplier' | 'both' | 'other';
  phone: string | null;
  address: string | null;
  opening_balance: number;
  total_purchases: number;
  total_sales: number;
  balance: number;
};

export type Product = {
  id: string;
  name: string;
  material: string | null;
  size: string | null;
  unit: string;
};