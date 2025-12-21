import React, { useEffect, useState } from 'react';
import { Card } from '../components/UI';
import { transactions as apiTransactions } from '../services/api';
import { Transaction } from '../types';
import { Loader2, Image as ImageIcon } from 'lucide-react';

const ReceiptGallery: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const response = await apiTransactions.getAll();
                // Filter transactions that have a receipt image
                const withReceipts = response.data.filter((t: any) => t.receipt_image);
                setTransactions(withReceipts);
            } catch (error) {
                console.error("Failed to fetch transactions", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin text-zinc-400" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-zinc-900">Receipt Gallery</h1>
                <p className="text-zinc-500 mt-1">Browse your uploaded receipts.</p>
            </div>

            {transactions.length === 0 ? (
                <div className="text-center py-12 bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
                    <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ImageIcon className="text-zinc-400" size={24} />
                    </div>
                    <h3 className="text-lg font-medium text-zinc-900">No receipts found</h3>
                    <p className="text-zinc-500 mt-1">Upload receipts when adding expenses to see them here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {transactions.map((tx) => (
                        <Card key={tx.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <div className="relative aspect-[3/4] bg-zinc-100">
                                <img
                                    src={tx.receipt_image}
                                    alt={`Receipt for ${tx.title}`}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                                    <p className="text-white font-bold truncate">{tx.title}</p>
                                    <p className="text-white/80 text-sm">{new Date(tx.date).toLocaleDateString()}</p>
                                    <p className="text-white font-mono mt-1">${tx.amount}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReceiptGallery;
