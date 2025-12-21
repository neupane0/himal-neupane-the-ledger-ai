import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../components/UI';
import { Edit2, Plus, Sparkles, AlertCircle } from 'lucide-react';
import { getBudgetAdvice } from '../services/geminiService';
import { Budget } from '../types';

const Budgets: React.FC = () => {
    const [advice, setAdvice] = useState<string>("Analyzing your spending habits...");
    
    // Mock Data
    const [budgets, setBudgets] = useState<Budget[]>([
        { id: '1', category: 'Food', limit: 500, spent: 350 },
        { id: '2', category: 'Transport', limit: 200, spent: 180 },
        { id: '3', category: 'Entertainment', limit: 150, spent: 45 },
        { id: '4', category: 'Shopping', limit: 300, spent: 320 }, // Overspent
    ]);

    useEffect(() => {
        setTimeout(async () => {
            const aiAdvice = await getBudgetAdvice(budgets);
            setAdvice(aiAdvice);
        }, 1500);
    }, []);

    const totalBudget = budgets.reduce((acc, b) => acc + b.limit, 0);
    const totalSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
    const totalPercentage = Math.min((totalSpent / totalBudget) * 100, 100);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900">Budgets</h1>
                    <p className="text-zinc-500 mt-1">Track your monthly limits.</p>
                </div>
                <Button variant="primary">
                    <Plus size={16} />
                    New Budget
                </Button>
            </div>

            {/* AI Insight */}
            <div className="bg-zinc-900 text-zinc-300 rounded-xl p-6 flex items-start gap-4 shadow-lg">
                <div className="bg-zinc-800 p-2 rounded-lg">
                    <Sparkles className="text-white" size={20} />
                </div>
                <div>
                    <h3 className="text-white font-bold mb-1">AI Recommendation</h3>
                    <p className="text-sm leading-relaxed">{advice}</p>
                </div>
            </div>

            {/* Total Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="flex flex-col justify-center">
                    <p className="text-sm text-zinc-500 font-medium">Total Budget</p>
                    <p className="text-3xl font-bold mt-1">${totalBudget.toLocaleString()}</p>
                </Card>
                <Card className="flex flex-col justify-center">
                    <p className="text-sm text-zinc-500 font-medium">Total Spent</p>
                    <p className={`text-3xl font-bold mt-1 ${totalSpent > totalBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                        ${totalSpent.toLocaleString()}
                    </p>
                </Card>
                <Card className="flex flex-col justify-center">
                    <p className="text-sm text-zinc-500 font-medium">Remaining</p>
                    <p className="text-3xl font-bold mt-1 text-zinc-900">${(totalBudget - totalSpent).toLocaleString()}</p>
                </Card>
            </div>

            {/* Budget List */}
            <div className="grid grid-cols-1 gap-6">
                {budgets.map((budget) => {
                    const percentage = Math.min((budget.spent / budget.limit) * 100, 100);
                    const isOver = budget.spent > budget.limit;

                    return (
                        <Card key={budget.id} className="group">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-700">
                                        {budget.category[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-zinc-900">{budget.category}</h3>
                                        <p className="text-xs text-zinc-500">
                                            ${budget.spent} of ${budget.limit} spent
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Edit2 size={16} />
                                </Button>
                            </div>

                            <div className="relative w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
                                <div 
                                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-red-500' : 'bg-black'}`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            
                            {isOver && (
                                <div className="mt-3 flex items-center gap-2 text-red-600 text-xs font-medium">
                                    <AlertCircle size={14} />
                                    <span>You've exceeded your limit by ${budget.spent - budget.limit}</span>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default Budgets;