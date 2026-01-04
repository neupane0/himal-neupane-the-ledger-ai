import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, AnimatedText } from '../components/UI';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { ArrowUpRight, Wallet, CreditCard, Sparkles } from 'lucide-react';
import { ai, incomeSources, transactions } from '../services/api';
import { AppRoute } from '../types';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [insight, setInsight] = useState("Loading AI insights...");
    const [txData, setTxData] = useState<any[]>([]);
    const [netThisMonth, setNetThisMonth] = useState(0);
    const [monthlyIncome, setMonthlyIncome] = useState(0);
    const [monthlyExpenses, setMonthlyExpenses] = useState(0);
    const [spendingTrend, setSpendingTrend] = useState<any[]>([]);
    const [categoryData, setCategoryData] = useState<any[]>([]);

    const COLORS = ['#18181B', '#52525B', '#A1A1AA', '#E4E4E7']; // Black to Light Gray

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [txResponse, incomeResponse] = await Promise.all([
                    transactions.getAll(),
                    incomeSources.getAll(),
                ]);

                const txs = txResponse.data;
                const sources = incomeResponse.data as any[];

                setTxData(txs);

                const isIncomeTx = (tx: any) => String(tx.category || '').toLowerCase() === 'income';
                const amountOf = (tx: any) => {
                    const val = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount);
                    return Number.isFinite(val) ? Math.abs(val) : 0;
                };

                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                const inThisMonth = (tx: any) => {
                    const d = new Date(tx.date);
                    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
                };

                const monthlyIncomeFromTx = txs
                    .filter((tx: any) => inThisMonth(tx) && isIncomeTx(tx))
                    .reduce((acc: number, tx: any) => acc + amountOf(tx), 0);

                const monthlyIncomeFromSources = (sources || [])
                    .filter((s: any) => s && s.active)
                    .reduce((acc: number, s: any) => {
                        const val = typeof s.monthly_amount === 'number' ? s.monthly_amount : parseFloat(s.monthly_amount);
                        return acc + (Number.isFinite(val) ? val : 0);
                    }, 0);

                const expenses = txs
                    .filter((tx: any) => inThisMonth(tx) && !isIncomeTx(tx))
                    .reduce((acc: number, tx: any) => acc + amountOf(tx), 0);

                const totalMonthlyIncome = monthlyIncomeFromTx + monthlyIncomeFromSources;
                setMonthlyIncome(totalMonthlyIncome);
                setMonthlyExpenses(expenses);
                setNetThisMonth(totalMonthlyIncome - expenses);

                // Spending Trend (daily expenses for current month)
                const trendMap = new Map<string, number>();
                txs
                    .filter((tx: any) => inThisMonth(tx) && !isIncomeTx(tx))
                    .forEach((tx: any) => {
                        const key = String(tx.date);
                        trendMap.set(key, (trendMap.get(key) || 0) + amountOf(tx));
                    });
                const trend = Array.from(trendMap.entries())
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([name, amount]) => ({ name, amount }));
                setSpendingTrend(trend);

                // Category Data (expenses only)
                const catMap = new Map<string, number>();
                txs
                    .filter((tx: any) => inThisMonth(tx) && !isIncomeTx(tx))
                    .forEach((tx: any) => {
                        const cat = tx.category || 'Uncategorized';
                        catMap.set(cat, (catMap.get(cat) || 0) + amountOf(tx));
                    });
                const catData = Array.from(catMap, ([name, value]) => ({ name, value }));
                setCategoryData(catData);

                // Get AI Insights
                try {
                    const resp = await ai.forecastInsights(trend);
                    setInsight(resp?.data?.insight || 'Unable to generate insights at this time.');
                } catch (e) {
                    console.error('Forecast Error', e);
                    setInsight('Unable to generate insights at this time.');
                }

            } catch (error) {
                console.error("Failed to fetch transactions", error);
                setInsight("Unable to load data.");
            }
        };

        fetchData();
    }, []);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">
                        <AnimatedText text="Dashboard" />
                    </h1>
                    <p className="text-zinc-500 mt-2 page-enter stagger-1">Welcome back. Here's your financial overview.</p>
                </div>
                <div className="page-enter stagger-2">
                    <Button variant="primary" onClick={() => navigate(AppRoute.ASSISTANT)}>
                        <Sparkles className="w-4 h-4 animate-spin-slow" />
                        Ask AI Assistant
                    </Button>
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="page-enter stagger-1">
                    <Card className="flex flex-col gap-4 h-full">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-zinc-500">Net This Month</p>
                                <h3 className="text-3xl font-bold mt-2 tracking-tight">${netThisMonth.toFixed(2)}</h3>
                                <p className="text-xs text-zinc-500 mt-1">Income ${monthlyIncome.toFixed(2)} • Expenses ${monthlyExpenses.toFixed(2)}</p>
                            </div>
                            <div className="p-3 bg-zinc-50 rounded-2xl">
                                <Wallet className="w-6 h-6 text-zinc-900" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50/50 w-fit px-3 py-1.5 rounded-full border border-emerald-100">
                            <ArrowUpRight size={16} />
                            <span className="font-medium">+2.5% vs last month</span>
                        </div>
                    </Card>
                </div>

                <div className="page-enter stagger-2">
                    <Card className="flex flex-col gap-4 h-full">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-zinc-500">Monthly Expenses</p>
                                <h3 className="text-3xl font-bold mt-2 tracking-tight">${monthlyExpenses.toFixed(2)}</h3>
                            </div>
                            <div className="p-3 bg-zinc-50 rounded-2xl">
                                <CreditCard className="w-6 h-6 text-zinc-900" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-zinc-600 bg-zinc-50 w-fit px-3 py-1.5 rounded-full border border-zinc-100">
                            <span className="text-xs font-semibold">BUDGET: $2,500</span>
                        </div>
                    </Card>
                </div>

                {/* AI Insight Card */}
                <div className="md:col-span-2 page-enter stagger-3">
                    <Card className="bg-white text-zinc-900 border-zinc-200 flex flex-col justify-center relative overflow-hidden h-full group" noHover>
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-15 transition-opacity duration-1000 animate-float">
                            <Sparkles size={120} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3 text-zinc-500">
                                <Sparkles size={16} className="text-amber-600" />
                                <span className="text-xs font-bold uppercase tracking-widest text-amber-600/80">AI Insight</span>
                            </div>
                            <p className="text-xl font-medium leading-relaxed text-zinc-900">
                                "{insight}"
                            </p>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 page-enter stagger-4">
                    <Card title="Spending Trend" className="h-full">
                        <div className="h-80 w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={spendingTrend}>
                                    <defs>
                                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#000000" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        cursor={{ stroke: '#e4e4e7', strokeWidth: 1 }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="amount"
                                        stroke="#000000"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorAmount)"
                                        animationDuration={2000}
                                        animationEasing="ease-out"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                <div className="page-enter stagger-5">
                    <Card title="Expenses by Category" className="h-full">
                        <div className="h-64 w-full flex items-center justify-center relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={90}
                                        paddingAngle={6}
                                        dataKey="value"
                                        cornerRadius={6}
                                        stroke="none"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-bold">${monthlyExpenses.toFixed(0)}</span>
                                <span className="text-xs text-zinc-400 uppercase tracking-widest">Total</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 mt-6">
                            {categoryData.slice(0, 4).map((entry, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index] }} />
                                    <span className="text-xs font-medium text-zinc-600">{entry.name}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="page-enter stagger-5" style={{ animationDelay: '600ms' }}>
                <Card title="Recent Transactions">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-zinc-100 text-zinc-400 uppercase text-xs tracking-wider">
                                    <th className="pb-4 font-semibold pl-4">Title</th>
                                    <th className="pb-4 font-semibold">Category</th>
                                    <th className="pb-4 font-semibold">Date</th>
                                    <th className="pb-4 font-semibold text-right pr-4">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                                {txData.slice(0, 5).map((tx, i) => (
                                    <tr key={i} className="group hover:bg-zinc-50/80 transition-all duration-300">
                                        <td className="py-5 pl-4 text-zinc-900 font-semibold group-hover:translate-x-1 transition-transform">{tx.title}</td>
                                        <td className="py-5">
                                            <span className="px-3 py-1 rounded-full bg-zinc-100 text-zinc-600 text-xs font-semibold border border-zinc-200 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                {tx.category}
                                            </span>
                                        </td>
                                        <td className="py-5 text-zinc-500">{new Date(tx.date).toLocaleDateString()}</td>
                                        <td className={`py-5 pr-4 text-right font-bold ${parseFloat(tx.amount) > 0 ? 'text-emerald-600' : 'text-zinc-900'}`}>
                                            {parseFloat(tx.amount) > 0 ? '+' : ''}{parseFloat(tx.amount).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;