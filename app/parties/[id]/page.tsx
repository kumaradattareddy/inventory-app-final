'use client'
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';

const fetchPartyDetails = async (id: string) => {
    const res = await fetch(`/api/parties/${id}`);
    if (!res.ok) throw new Error('Failed to fetch party details');
    return res.json();
};

export default function PartyDetailPage() {
    const params = useParams();
    const id = params.id as string;

    const { data, isLoading, isError } = useQuery({
        queryKey: ['party', id],
        queryFn: () => fetchPartyDetails(id),
        enabled: !!id,
    });

    if (isLoading) return <div>Loading details...</div>;
    if (isError) return <div>Error loading details.</div>;

    const { party, stock_moves, payments, balance } = data;

    const allTransactions = [...(stock_moves || []), ...(payments || [])]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return (
        <div>
            <h1 className="text-3xl font-bold">{party.name}</h1>
            <p className="text-lg text-muted-foreground">{party.role}</p>
            <div className="my-6 p-4 border rounded-lg bg-secondary">
                <h2 className="text-2xl font-bold">
                    Current Balance: {' '}
                    <span className={balance >= 0 ? 'text-red-600' : 'text-green-600'}>
                        {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Math.abs(balance))}
                        {balance > 0 ? ' (You are owed)' : balance < 0 ? ' (You owe)' : ''}
                    </span>
                </h2>
            </div>
            
            <h3 className="text-2xl font-bold mt-8 mb-4">Transaction History</h3>
            <div className="border rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Details</th>
                            <th className="p-4 text-right">Debit (Billed / Paid Out)</th>
                            <th className="p-4 text-right">Credit (Purchased / Paid In)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allTransactions.map((tx: any) => {
                                let type = tx.notes || '';
                                let details = '';
                                let debit = 0;
                                let credit = 0;
                                
                                if (tx.kind === 'sale') {
                                    type = 'Sale';
                                    debit = tx.total_amount;
                                    details = `${tx.quantity} ${tx.product_unit || 'units'} of ${tx.product_name || 'Product'} @ ₹${tx.price_per_unit}`;
                                } else if (tx.kind === 'purchase') {
                                    type = 'Purchase';
                                    credit = tx.total_amount;
                                    details = `${tx.quantity} ${tx.product_unit || 'units'} of ${tx.product_name || 'Product'} @ ₹${tx.price_per_unit}`;
                                } else if (tx.direction === 'in') {
                                    type = 'Payment Received';
                                    credit = tx.amount;
                                    details = tx.notes || tx.method;
                                } else if (tx.direction === 'out') {
                                    type = 'Payment Made';
                                    debit = tx.amount;
                                    details = tx.notes || tx.method;
                                }

                                return (
                                <tr key={tx.id} className="border-b">
                                    <td className="p-4 text-muted-foreground">{format(new Date(tx.created_at), 'dd MMM, yyyy')}</td>
                                    <td className="p-4 font-medium">{type}</td>
                                    <td className="p-4">{details}</td>
                                    <td className="p-4 text-right text-red-600">{debit > 0 ? `₹${debit.toLocaleString('en-IN')}` : ''}</td>
                                    <td className="p-4 text-right text-green-600">{credit > 0 ? `₹${credit.toLocaleString('en-IN')}` : ''}</td>
                                </tr>
                                )
                            })
                        }
                    </tbody>
                </table>
            </div>
        </div>
    );
}