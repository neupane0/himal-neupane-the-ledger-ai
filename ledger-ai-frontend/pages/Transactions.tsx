import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input, Select } from '../components/UI';
import { Search, Filter, Download, MoreHorizontal, ArrowLeft, ArrowRight, Upload } from 'lucide-react';
import { Transaction } from '../types';
import { transactions as apiTransactions } from '../services/api';

const Transactions: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        try {
            const response = await apiTransactions.export();
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'transactions.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Export failed", error);
        }
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            await apiTransactions.import(formData);
            const response = await apiTransactions.getAll();
            setTransactions(response.data);
            alert("Import successful!");
        } catch (error) {
            console.error("Import failed", error);
            alert("Import failed. Please check the file format.");
        }
    };

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const response = await apiTransactions.getAll();
                setTransactions(response.data);
            } catch (error) {
                console.error("Failed to fetch transactions", error);
            }
        };
        fetchTransactions();
    }, []);

    const filtered = transactions.filter(t =>
        (categoryFilter === 'All' || t.category === categoryFilter) &&
        t.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900">Transactions</h1>
                    <p className="text-zinc-500 mt-1">View and manage your financial history.</p>
                </div>
                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".csv"
                        onChange={handleImport}
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={16} />
                        Import
                    </Button>
                    <Button variant="outline" onClick={handleExport}>
                        <Download size={16} />
                        Export
                    </Button>
                </div>
            </div>

            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-zinc-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <select
                            className="w-full px-4 py-2 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-black/5"
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                        >
                            <option value="All">All Categories</option>
                            <option value="Food">Food</option>
                            <option value="Transport">Transport</option>
                            <option value="Utilities">Utilities</option>
                            <option value="Entertainment">Entertainment</option>
                            <option value="Health">Health</option>
                            <option value="Income">Income</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-50 text-zinc-500 font-medium">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Title</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Source</th>
                                <th className="px-4 py-3 text-right">Amount</th>
                                <th className="px-4 py-3 rounded-r-lg"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {filtered.map((tx) => (
                                <tr key={tx.id} className="group hover:bg-zinc-50 transition-colors">
                                    <td className="px-4 py-4 font-medium text-zinc-900">{tx.title}</td>
                                    <td className="px-4 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800">
                                            {tx.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-zinc-500">{new Date(tx.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-4 text-zinc-500 text-xs">{tx.source}</td>
                                    <td className={`px-4 py-4 text-right font-bold ${parseFloat(tx.amount.toString()) > 0 ? 'text-emerald-600' : 'text-zinc-900'}`}>
                                        {parseFloat(tx.amount.toString()) > 0 ? '+' : ''}{parseFloat(tx.amount.toString()).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <button className="text-zinc-400 hover:text-black">
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-between items-center mt-6 border-t border-zinc-100 pt-4">
                    <p className="text-sm text-zinc-500">Showing {filtered.length} entries</p>
                    <div className="flex gap-2">
                        <Button variant="ghost" className="px-2"><ArrowLeft size={16} /></Button>
                        <Button variant="ghost" className="px-2"><ArrowRight size={16} /></Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Transactions;