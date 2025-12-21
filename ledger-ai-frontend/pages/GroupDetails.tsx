import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button } from '../components/UI';
import { ArrowLeft, Receipt, User, DollarSign } from 'lucide-react';
import { AppRoute } from '../types';

const GroupDetails: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Mock Data
    const groupName = id === '1' ? 'Trip to Japan' : 'Apartment 4B';
    const expenses = [
        { desc: 'Dinner at Sushi Place', amount: 120, payer: 'You' },
        { desc: 'Hotel Booking', amount: 450, payer: 'Alice' },
        { desc: 'Train Tickets', amount: 80, payer: 'Bob' },
    ];

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => navigate(AppRoute.GROUPS)} className="pl-0 gap-1 text-zinc-500 hover:text-black hover:bg-transparent">
                <ArrowLeft size={16} /> Back to Groups
            </Button>

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900">{groupName}</h1>
                    <p className="text-zinc-500 mt-1">Group ID: {id}</p>
                </div>
                <Button variant="primary">Add Expense</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <h3 className="font-bold text-lg mb-4">Expenses</h3>
                    <div className="space-y-4">
                        {expenses.map((ex, i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white border border-zinc-200 rounded-full flex items-center justify-center">
                                        <Receipt size={18} className="text-zinc-500" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-zinc-900">{ex.desc}</p>
                                        <p className="text-xs text-zinc-500">Paid by {ex.payer}</p>
                                    </div>
                                </div>
                                <span className="font-bold text-zinc-900">${ex.amount}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                <div className="space-y-6">
                     <Card>
                        <h3 className="font-bold text-lg mb-4">Balances</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-600">You owe Alice</span>
                                <span className="font-bold text-red-600">$150.00</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-600">Bob owes you</span>
                                <span className="font-bold text-emerald-600">$26.00</span>
                            </div>
                             <div className="mt-4 pt-4 border-t border-zinc-100 flex justify-between font-bold">
                                <span>Total Owed</span>
                                <span className="text-red-600">$124.00</span>
                            </div>
                        </div>
                        <Button variant="outline" className="w-full mt-4 text-xs">Settle Up</Button>
                    </Card>

                    <Card>
                        <h3 className="font-bold text-lg mb-4">Members</h3>
                        <div className="flex -space-x-2 overflow-hidden mb-4">
                             {[1,2,3].map(i => (
                                 <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-zinc-300 flex items-center justify-center text-xs font-bold text-white">
                                    U{i}
                                 </div>
                             ))}
                        </div>
                        <Button variant="ghost" className="w-full text-xs">Invite People</Button>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default GroupDetails;