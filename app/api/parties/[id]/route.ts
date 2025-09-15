import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const partyId = params.id;
  
  const { data: party, error: partyError } = await supabase
    .from('parties')
    .select('*')
    .eq('id', partyId)
    .single();
  if (partyError) {
    return NextResponse.json({ error: `Party not found: ${partyError.message}` }, { status: 404 });
  }

  const { data: stock_moves, error: movesError } = await supabase
    .from('stock_moves_report')
    .select('*')
    .eq('party_id', partyId)
    .order('created_at', { ascending: false });
  if (movesError) return NextResponse.json({ error: movesError.message }, { status: 500 });

  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('*')
    .eq('party_id', partyId)
    .order('created_at', { ascending: false });
  if (paymentsError) return NextResponse.json({ error: paymentsError.message }, { status: 500 });

  const safeStockMoves = stock_moves || [];
  const safePayments = payments || [];

  const salesTotal = safeStockMoves.filter(m => m.kind === 'sale').reduce((acc, m) => acc + m.total_amount, 0);
  const purchasesTotal = safeStockMoves.filter(m => m.kind === 'purchase').reduce((acc, m) => acc + m.total_amount, 0);
  const paymentsIn = safePayments.filter(p => p.direction === 'in').reduce((acc, p) => acc + p.amount, 0);
  const paymentsOut = safePayments.filter(p => p.direction === 'out').reduce((acc, p) => acc + p.amount, 0);

  const balance = (party.opening_balance || 0) + salesTotal - purchasesTotal - paymentsIn + paymentsOut;
  
  return NextResponse.json({ party, stock_moves: safeStockMoves, payments: safePayments, balance });
}