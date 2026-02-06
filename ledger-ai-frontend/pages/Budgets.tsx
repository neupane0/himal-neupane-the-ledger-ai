import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../components/UI';
import { Edit2, Plus, Trash2, X, Check, AlertCircle, ChevronLeft, ChevronRight, Sparkles, TrendingUp, TrendingDown, Minus, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { Budget } from '../types';
import { budgets as budgetsApi } from '../services/api';
import { TRANSACTION_CATEGORIES } from '../constants/categories';

interface AISuggestion {
    category: string;
    suggested_limit: number;
    avg_spending: number;
    max_spending: number;
    min_spending: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    trend_percentage: number;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    months_with_data: number;
}

interface AISuggestionResponse {
    suggestions: AISuggestion[];
    summary: {
        total_suggested: number;
        months_analyzed: number;
        total_income: number | null;
        message: string;
    };
}

const Budgets: React.FC = () => {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    });

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
    const [formCategory, setFormCategory] = useState('');
    const [formLimit, setFormLimit] = useState('');
    const [saving, setSaving] = useState(false);

    // AI Suggestions state
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
    const [suggestionSummary, setSuggestionSummary] = useState<AISuggestionResponse['summary'] | null>(null);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [acceptingCategory, setAcceptingCategory] = useState<string | null>(null);

    const fetchBudgets = async () => {
        setLoading(true);
        try {
            const response = await budgetsApi.getAll(selectedMonth);
            setBudgets(response.data);
        } catch (error) {
            console.error('Failed to fetch budgets', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBudgets();
    }, [selectedMonth]);

    const handlePrevMonth = () => {
        const date = new Date(selectedMonth);
        date.setMonth(date.getMonth() - 1);
        setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`);
    };

    const handleNextMonth = () => {
        const date = new Date(selectedMonth);
        date.setMonth(date.getMonth() + 1);
        setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`);
    };

    const formatMonthDisplay = (monthStr: string) => {
        const date = new Date(monthStr);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const openAddModal = () => {
        setEditingBudget(null);
        setFormCategory('');
        setFormLimit('');
        setShowModal(true);
    };

    const openEditModal = (budget: Budget) => {
        setEditingBudget(budget);
        setFormCategory(budget.category);
        setFormLimit(budget.limit_amount.toString());
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingBudget(null);
        setFormCategory('');
        setFormLimit('');
    };

    const handleSave = async () => {
        if (!formCategory || !formLimit) return;
        
        setSaving(true);
        try {
            if (editingBudget) {
                await budgetsApi.update(editingBudget.id, {
                    category: formCategory,
                    limit_amount: parseFloat(formLimit),
                });
            } else {
                await budgetsApi.create({
                    category: formCategory,
                    limit_amount: parseFloat(formLimit),
                    month: selectedMonth,
                });
            }
            await fetchBudgets();
            closeModal();
        } catch (error) {
            console.error('Failed to save budget', error);
            alert('Failed to save budget. It may already exist for this month.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this budget?')) return;
        
        try {
            await budgetsApi.delete(id);
            await fetchBudgets();
        } catch (error) {
            console.error('Failed to delete budget', error);
        }
    };

    const fetchSuggestions = async () => {
        setLoadingSuggestions(true);
        setShowSuggestions(true);
        try {
            const response = await budgetsApi.getAISuggestions(selectedMonth);
            setSuggestions(response.data.suggestions);
            setSuggestionSummary(response.data.summary);
        } catch (error) {
            console.error('Failed to fetch AI suggestions', error);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const acceptSuggestion = async (suggestion: AISuggestion) => {
        setAcceptingCategory(suggestion.category);
        try {
            await budgetsApi.create({
                category: suggestion.category,
                limit_amount: suggestion.suggested_limit,
                month: selectedMonth,
            });
            setSuggestions(prev => prev.filter(s => s.category !== suggestion.category));
            await fetchBudgets();
        } catch (error) {
            console.error('Failed to accept suggestion', error);
            alert('Failed to create budget. It may already exist.');
        } finally {
            setAcceptingCategory(null);
        }
    };

    const rejectSuggestion = (category: string) => {
        setSuggestions(prev => prev.filter(s => s.category !== category));
    };

    const acceptAllSuggestions = async () => {
        setAcceptingCategory('__all__');
        try {
            for (const suggestion of suggestions) {
                await budgetsApi.create({
                    category: suggestion.category,
                    limit_amount: suggestion.suggested_limit,
                    month: selectedMonth,
                });
            }
            setSuggestions([]);
            await fetchBudgets();
        } catch (error) {
            console.error('Failed to accept all suggestions', error);
        } finally {
            setAcceptingCategory(null);
        }
    };

    const totalBudget = budgets.reduce((acc, b) => acc + parseFloat(String(b.limit_amount)), 0);
    const totalSpent = budgets.reduce((acc, b) => acc + parseFloat(String(b.spent)), 0);
    const remaining = totalBudget - totalSpent;

    // Get categories not yet budgeted
    const usedCategories = budgets.map(b => b.category.toLowerCase());
    const availableCategories = TRANSACTION_CATEGORIES.filter(
        cat => !usedCategories.includes(cat.toLowerCase()) && cat.toLowerCase() !== 'income'
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900">Budgets</h1>
                    <p className="text-zinc-500 mt-1">Track your monthly spending limits.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={fetchSuggestions}
                        disabled={loadingSuggestions}
                    >
                        {loadingSuggestions ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        AI Suggest
                    </Button>
                    <Button variant="primary" onClick={openAddModal}>
                        <Plus size={16} />
                        New Budget
                    </Button>
                </div>
            </div>

            {/* Month Selector */}
            <div className="flex items-center justify-center gap-4">
                <button
                    onClick={handlePrevMonth}
                    className="p-2 hover:bg-zinc-100 rounded-lg"
                >
                    <ChevronLeft size={20} />
                </button>
                <span className="text-lg font-semibold min-w-[180px] text-center">
                    {formatMonthDisplay(selectedMonth)}
                </span>
                <button
                    onClick={handleNextMonth}
                    className="p-2 hover:bg-zinc-100 rounded-lg"
                >
                    <ChevronRight size={20} />
                </button>
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
                    <p className={`text-3xl font-bold mt-1 ${remaining < 0 ? 'text-red-600' : 'text-zinc-900'}`}>
                        ${remaining.toLocaleString()}
                    </p>
                </Card>
            </div>

            {/* AI Budget Suggestions */}
            {showSuggestions && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                                <Sparkles size={16} className="text-violet-600" />
                            </div>
                            <h2 className="text-xl font-bold text-zinc-900">AI Budget Suggestions</h2>
                        </div>
                        <button
                            onClick={() => { setShowSuggestions(false); setSuggestions([]); }}
                            className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-700"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {loadingSuggestions ? (
                        <Card className="p-8 text-center">
                            <Loader2 size={24} className="animate-spin mx-auto mb-3 text-violet-600" />
                            <p className="text-zinc-500">Analyzing your spending history...</p>
                        </Card>
                    ) : suggestions.length === 0 ? (
                        <Card className="p-6 text-center border-violet-200 bg-violet-50/30">
                            <p className="text-zinc-600">
                                {suggestionSummary?.message || 'No new suggestions — all categories are already budgeted or there isn\'t enough data.'}
                            </p>
                        </Card>
                    ) : (
                        <>
                            {/* Summary Banner */}
                            {suggestionSummary && (
                                <Card className="border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50">
                                    <p className="text-sm text-zinc-700">{suggestionSummary.message}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                                        <span>Based on {suggestionSummary.months_analyzed} month{suggestionSummary.months_analyzed !== 1 ? 's' : ''} of data</span>
                                        <span>•</span>
                                        <span>{suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}</span>
                                    </div>
                                </Card>
                            )}

                            {/* Accept All / Reject All */}
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => { setSuggestions([]); }}
                                >
                                    Dismiss All
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={acceptAllSuggestions}
                                    disabled={acceptingCategory === '__all__'}
                                    isLoading={acceptingCategory === '__all__'}
                                >
                                    <Check size={16} />
                                    Accept All ({suggestions.length})
                                </Button>
                            </div>

                            {/* Individual Suggestions */}
                            <div className="grid grid-cols-1 gap-3">
                                {suggestions.map((suggestion) => {
                                    const TrendIcon = suggestion.trend === 'increasing' ? TrendingUp : suggestion.trend === 'decreasing' ? TrendingDown : Minus;
                                    const trendColor = suggestion.trend === 'increasing' ? 'text-red-500' : suggestion.trend === 'decreasing' ? 'text-emerald-500' : 'text-zinc-400';
                                    const confidenceColor = suggestion.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' : suggestion.confidence === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-600';
                                    const isAccepting = acceptingCategory === suggestion.category || acceptingCategory === '__all__';

                                    return (
                                        <Card key={suggestion.category} className="border-violet-100 hover:border-violet-300 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center font-bold text-violet-700">
                                                        {suggestion.category[0]}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-zinc-900">{suggestion.category}</h3>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <TrendIcon size={14} className={trendColor} />
                                                            <span className="text-xs text-zinc-500">
                                                                Avg ${suggestion.avg_spending.toFixed(0)}/mo
                                                            </span>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${confidenceColor}`}>
                                                                {suggestion.confidence} confidence
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-violet-700">${suggestion.suggested_limit}</p>
                                                    <p className="text-[10px] text-zinc-400 mt-0.5">suggested limit</p>
                                                </div>
                                            </div>

                                            {/* Spending range bar */}
                                            <div className="mt-3 px-1">
                                                <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                                                    <span>Min ${suggestion.min_spending.toFixed(0)}</span>
                                                    <span>Avg ${suggestion.avg_spending.toFixed(0)}</span>
                                                    <span>Max ${suggestion.max_spending.toFixed(0)}</span>
                                                </div>
                                                <div className="relative w-full h-2 bg-zinc-100 rounded-full">
                                                    {/* Range bar from min to max */}
                                                    <div
                                                        className="absolute top-0 h-full bg-violet-200 rounded-full"
                                                        style={{
                                                            left: `${suggestion.max_spending > 0 ? (suggestion.min_spending / suggestion.max_spending) * 80 : 0}%`,
                                                            width: `${suggestion.max_spending > 0 ? ((suggestion.max_spending - suggestion.min_spending) / suggestion.max_spending) * 80 + 20 : 100}%`,
                                                        }}
                                                    />
                                                    {/* Average marker */}
                                                    <div
                                                        className="absolute top-0 w-1 h-full bg-violet-600 rounded-full"
                                                        style={{
                                                            left: `${suggestion.max_spending > 0 ? (suggestion.avg_spending / (suggestion.max_spending * 1.2)) * 100 : 50}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Reasoning */}
                                            <p className="mt-3 text-xs text-zinc-500 leading-relaxed">{suggestion.reasoning}</p>

                                            {/* Data info */}
                                            <p className="mt-1 text-[10px] text-zinc-400">
                                                Based on {suggestion.months_with_data} month{suggestion.months_with_data !== 1 ? 's' : ''} of spending data
                                            </p>

                                            {/* Accept / Reject buttons */}
                                            <div className="flex gap-2 mt-4">
                                                <button
                                                    onClick={() => rejectSuggestion(suggestion.category)}
                                                    disabled={isAccepting}
                                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-sm font-medium transition-colors disabled:opacity-50"
                                                >
                                                    <ThumbsDown size={14} />
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => acceptSuggestion(suggestion)}
                                                    disabled={isAccepting}
                                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 text-sm font-medium transition-colors disabled:opacity-50"
                                                >
                                                    {isAccepting ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        <ThumbsUp size={14} />
                                                    )}
                                                    Accept
                                                </button>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Budget List */}
            {loading ? (
                <Card className="p-8 text-center text-zinc-500">Loading budgets...</Card>
            ) : budgets.length === 0 ? (
                <Card className="p-8 text-center">
                    <p className="text-zinc-500 mb-4">No budgets set for {formatMonthDisplay(selectedMonth)}</p>
                    <Button variant="outline" onClick={openAddModal}>
                        <Plus size={16} />
                        Create your first budget
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {budgets.map((budget) => {
                        const limitAmount = parseFloat(String(budget.limit_amount));
                        const spent = parseFloat(String(budget.spent));
                        const percentage = Math.min((spent / limitAmount) * 100, 100);
                        const isOver = spent > limitAmount;

                        return (
                            <Card key={budget.id}>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-700">
                                            {budget.category[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-zinc-900">{budget.category}</h3>
                                            <p className="text-xs text-zinc-500">
                                                ${spent.toFixed(2)} of ${limitAmount.toFixed(2)} spent
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(budget)}
                                            className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(budget.id)}
                                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="relative w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
                                    <div
                                        className={`absolute top-0 left-0 h-full rounded-full ${isOver ? 'bg-red-500' : 'bg-black'}`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>

                                <div className="flex justify-between mt-2 text-xs text-zinc-500">
                                    <span>{percentage.toFixed(0)}% used</span>
                                    <span>${(limitAmount - spent).toFixed(2)} remaining</span>
                                </div>

                                {isOver && (
                                    <div className="mt-3 flex items-center gap-2 text-red-600 text-xs font-medium">
                                        <AlertCircle size={14} />
                                        <span>Exceeded by ${(spent - limitAmount).toFixed(2)}</span>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">
                                {editingBudget ? 'Edit Budget' : 'New Budget'}
                            </h2>
                            <button onClick={closeModal} className="p-2 hover:bg-zinc-100 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Category</label>
                                {editingBudget ? (
                                    <input
                                        type="text"
                                        value={formCategory}
                                        disabled
                                        className="w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-100 text-zinc-500"
                                    />
                                ) : (
                                    <select
                                        value={formCategory}
                                        onChange={(e) => setFormCategory(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
                                    >
                                        <option value="">Select a category</option>
                                        {availableCategories.map((cat) => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">Monthly Limit ($)</label>
                                <input
                                    type="number"
                                    value={formLimit}
                                    onChange={(e) => setFormLimit(e.target.value)}
                                    placeholder="500"
                                    min="0"
                                    step="0.01"
                                    className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-black/10"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button variant="outline" className="flex-1" onClick={closeModal}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    className="flex-1"
                                    onClick={handleSave}
                                    isLoading={saving}
                                    disabled={!formCategory || !formLimit}
                                >
                                    <Check size={16} />
                                    {editingBudget ? 'Update' : 'Create'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Budgets;